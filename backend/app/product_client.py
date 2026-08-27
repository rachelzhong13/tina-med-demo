from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

from .config import get_settings
from .product_service import get_product


class ProductServiceUnavailable(Exception):
    """The Chat API could not reach the independent product API."""


async def get_product_for_chat(identifier: str) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.product_api_base_url:
        return get_product(identifier)

    endpoint = (
        f"{settings.product_api_base_url.rstrip('/')}/api/products/"
        f"{quote(identifier, safe='')}"
    )
    try:
        async with httpx.AsyncClient(timeout=settings.product_api_timeout) as client:
            response = await client.get(endpoint)
    except httpx.HTTPError as exc:
        raise ProductServiceUnavailable from exc

    if response.status_code == 404:
        return None
    try:
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise ProductServiceUnavailable from exc
    return response.json()
