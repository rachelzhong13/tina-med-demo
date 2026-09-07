from __future__ import annotations

import json
import logging

import httpx

from .config import get_settings


logger = logging.getLogger("tina-med-demo.llm")


class LLMNotConfigured(Exception):
    pass


class LLMRequestFailed(Exception):
    pass


class LLMTimeout(Exception):
    pass


def chat_completions_endpoint(base_url: str) -> str:
    url = base_url.rstrip("/")
    if url.endswith("/chat/completions"):
        return url
    return f"{url}/chat/completions"


async def complete(messages: list[dict[str, str]]) -> str:
    settings = get_settings()
    if not all((settings.llm_api_key, settings.llm_base_url, settings.llm_model)):
        raise LLMNotConfigured

    endpoint = chat_completions_endpoint(settings.llm_base_url)
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": 0.2,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise LLMTimeout from exc
    except httpx.HTTPError as exc:
        raise LLMRequestFailed from exc

    if response.status_code >= 400:
        logger.warning(
            "llm_complete_failed status=%s body=%s",
            response.status_code,
            response.text[:1000],
        )
        raise LLMRequestFailed
    try:
        data = response.json()
        message = data["choices"][0]["message"]
        answer = message.get("content") or message.get("reasoning_content") or message.get("text")
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning(
            "llm_complete_parse_failed body=%s",
            response.text[:1000],
        )
        raise LLMRequestFailed from exc
    if not isinstance(answer, str) or not answer.strip():
        logger.warning("llm_complete_empty_content body=%s", response.text[:1000])
        raise LLMRequestFailed
    return answer.strip()


async def stream_complete(messages: list[dict[str, str]]):
    settings = get_settings()
    if not all((settings.llm_api_key, settings.llm_base_url, settings.llm_model)):
        raise LLMNotConfigured

    endpoint = chat_completions_endpoint(settings.llm_base_url)
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": 0.2,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            async with client.stream(
                "POST", endpoint, headers=headers, json=payload
            ) as response:
                if response.status_code >= 400:
                    error_body = await response.aread()
                    logger.warning(
                        "llm_stream_failed status=%s body=%s",
                        response.status_code,
                        error_body.decode("utf-8", errors="replace")[:1000],
                    )
                    raise LLMRequestFailed

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue

                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data)
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        choice = choices[0]
                        content = choice.get("delta", {}).get("content") or choice.get(
                            "message", {}
                        ).get("content")
                    except (AttributeError, KeyError, TypeError, ValueError) as exc:
                        raise LLMRequestFailed from exc

                    if isinstance(content, str) and content:
                        yield content
    except httpx.TimeoutException as exc:
        raise LLMTimeout from exc
    except httpx.HTTPError as exc:
        logger.warning("llm_complete_http_error error=%r", exc)
        raise LLMRequestFailed from exc
