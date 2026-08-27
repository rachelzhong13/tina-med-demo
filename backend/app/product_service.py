from __future__ import annotations

from typing import Any

from . import database


def list_products() -> list[dict[str, Any]]:
    return database.list_medicines()


def get_product(identifier: str) -> dict[str, Any] | None:
    return database.get_medicine(identifier)
