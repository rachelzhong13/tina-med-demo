from __future__ import annotations

import httpx

from .config import get_settings


class LLMNotConfigured(Exception):
    pass


class LLMRequestFailed(Exception):
    pass


class LLMTimeout(Exception):
    pass


async def complete(messages: list[dict[str, str]]) -> str:
    settings = get_settings()
    if not all((settings.llm_api_key, settings.llm_base_url, settings.llm_model)):
        raise LLMNotConfigured

    endpoint = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
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
        raise LLMRequestFailed
    try:
        data = response.json()
        answer = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise LLMRequestFailed from exc
    if not isinstance(answer, str) or not answer.strip():
        raise LLMRequestFailed
    return answer.strip()
