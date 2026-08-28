from __future__ import annotations

import base64

import httpx

from .config import get_settings


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


async def transcribe_audio(
    audio: bytes, filename: str, content_type: str | None
) -> str:
    settings = get_settings()
    if not all((settings.stt_api_key, settings.stt_base_url, settings.stt_model)):
        raise STTNotConfigured

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
