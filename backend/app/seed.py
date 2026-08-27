from __future__ import annotations

import json
from pathlib import Path

from .config import get_settings


def _target_url(medicine_id: str) -> str:
    settings = get_settings()
    route = f"/medicine/{medicine_id}"
    if settings.public_router_mode == "hash":
        return f"{settings.public_base_url}/#{route}"
    return f"{settings.public_base_url}{route}"


def _load_demo_medicines() -> list[dict]:
    data_path = Path(__file__).resolve().parents[1] / "data" / "medicines.json"
    medicines = json.loads(data_path.read_text(encoding="utf-8"))
    for medicine in medicines:
        medicine["qr_target_url"] = _target_url(medicine["id"])
    return medicines


DEMO_MEDICINES = _load_demo_medicines()
