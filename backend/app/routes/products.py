from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..product_service import get_product, list_products
from ..schemas import Medicine, MedicineSummary


router = APIRouter()


def require_product(identifier: str) -> dict:
    product = get_product(identifier)
    if product is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return product


@router.get("/api/products", response_model=list[MedicineSummary])
def products() -> list[dict]:
    return list_products()


@router.get("/api/products/{product_id}", response_model=Medicine)
def product(product_id: str) -> dict:
    return require_product(product_id)


# Keep the original paths working while the frontend and QR targets migrate to
# the product terminology.
@router.get("/api/medicines", response_model=list[MedicineSummary])
def medicines() -> list[dict]:
    return list_products()


@router.get("/api/medicines/{medicine_id}", response_model=Medicine)
def medicine(medicine_id: str) -> dict:
    return require_product(medicine_id)
