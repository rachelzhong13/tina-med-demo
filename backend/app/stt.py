from __future__ import annotations

import asyncio
import base64
import logging
import time
from typing import Any

import httpx

from .config import get_settings


logger = logging.getLogger("tina-med-demo.stt")
ASR_TASK_ENDPOINT_BASE = "https://dashscope.aliyuncs.com/api/v1"


class STTNotConfigured(Exception):
    pass


class STTRequestFailed(Exception):
    pass


class STTTimeout(Exception):
    pass


def chat_completions_endpoint(base_url: str) -> str:
    url = base_url.rstrip("/")
    if url.endswith("/chat/completions"):
        return url
    return f"{url}/chat/completions"


def dashscope_api_base(base_url: str) -> str:
    url = base_url.rstrip("/")
    if url.endswith("/api/v1"):
        return url
    if url.endswith("/compatible-mode/v1"):
        return f"{url.removesuffix('/compatible-mode/v1')}/api/v1"
    return f"{url}/api/v1"


def first_text(value: Any) -> str:
    if isinstance(value, dict):
        for key in ("text", "transcript"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
        for candidate in value.values():
            text = first_text(candidate)
            if text:
                return text
    if isinstance(value, list):
        for item in value:
            text = first_text(item)
            if text:
                return text
    return ""


async def transcribe_filetrans(audio_url: str) -> str:
    settings = get_settings()
    endpoint_base = dashscope_api_base(settings.stt_base_url)
    headers = {
        "Authorization": f"Bearer {settings.stt_api_key}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    submit_payload = {
        "model": settings.stt_model,
        "input": {"file_urls": [audio_url]},
        "parameters": {"channel_id": [0], "enable_itn": True},
    }

    try:
        async with httpx.AsyncClient(timeout=settings.stt_timeout) as client:
            submit = await client.post(
                f"{endpoint_base}/services/audio/asr/transcription",
                headers=headers,
                json=submit_payload,
            )
            if submit.status_code >= 400:
                logger.warning(
                    "stt_submit_failed status=%s body=%s",
                    submit.status_code,
                    submit.text[:1000],
                )
                raise STTRequestFailed
            task_id = submit.json()["output"]["task_id"]

            deadline = time.monotonic() + settings.stt_timeout
            result_payload: dict[str, Any] | None = None
            while time.monotonic() < deadline:
                await asyncio.sleep(1)
                result = await client.get(
                    f"{ASR_TASK_ENDPOINT_BASE}/tasks/{task_id}", headers=headers
                )
                if result.status_code >= 400:
                    logger.warning(
                        "stt_task_query_failed status=%s body=%s",
                        result.status_code,
                        result.text[:1000],
                    )
                    raise STTRequestFailed
                result_payload = result.json()
                status = result_payload.get("output", {}).get("task_status")
                if status == "SUCCEEDED":
                    break
                if status == "FAILED":
                    logger.warning("stt_task_failed task_id=%s result=%s", task_id, result_payload)
                    raise STTRequestFailed
            else:
                raise STTTimeout

            output = (result_payload or {}).get("output", {})
            transcription_url = None
            for item in output.get("results", []):
                if item.get("subtask_status") == "FAILED":
                    logger.warning("stt_subtask_failed task_id=%s result=%s", task_id, item)
                    raise STTRequestFailed
                if item.get("subtask_status") == "SUCCEEDED":
                    transcription_url = item.get("transcription_url")
                    break
            if isinstance(transcription_url, str) and transcription_url:
                transcript_response = await client.get(transcription_url)
                if transcript_response.status_code >= 400:
                    logger.warning(
                        "stt_result_download_failed status=%s body=%s",
                        transcript_response.status_code,
                        transcript_response.text[:1000],
                    )
                    raise STTRequestFailed
                transcript_payload = transcript_response.json()
                transcript = first_text(transcript_payload)
            else:
                transcript = first_text(output)
    except httpx.TimeoutException as exc:
        raise STTTimeout from exc
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        raise STTRequestFailed from exc

    if not transcript:
        logger.warning("stt_empty_transcript result=%s", result_payload)
        raise STTRequestFailed
    return transcript


async def transcribe_audio(
    audio: bytes, filename: str, content_type: str | None, audio_url: str | None = None
) -> str:
    settings = get_settings()
    if not all((settings.stt_api_key, settings.stt_base_url, settings.stt_model)):
        raise STTNotConfigured

    if settings.stt_model.endswith("filetrans"):
        if not audio_url:
            raise STTRequestFailed
        return await transcribe_filetrans(audio_url)

    endpoint = chat_completions_endpoint(settings.stt_base_url)
    headers = {"Authorization": f"Bearer {settings.stt_api_key}"}
    media_type = content_type or "application/octet-stream"
    audio_base64 = base64.b64encode(audio).decode("ascii")
    payload = {
        "model": settings.stt_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": f"data:{media_type};base64,{audio_base64}"
                        },
                    }
                ],
            }
        ],
        "stream": False,
        "asr_options": {"language": "zh", "enable_itn": True},
    }

    try:
        async with httpx.AsyncClient(timeout=settings.stt_timeout) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise STTTimeout from exc
    except httpx.HTTPError as exc:
        raise STTRequestFailed from exc

    if response.status_code >= 400:
        raise STTRequestFailed

    try:
        payload = response.json()
        text = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise STTRequestFailed from exc

    if not isinstance(text, str) or not text.strip():
        raise STTRequestFailed
    return text.strip()
