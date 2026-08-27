from __future__ import annotations

from fastapi import FastAPI

from .routes.products import router as products_router
from .runtime import configure_cors, database_lifespan


app = FastAPI(
    title="TINA Product API",
    version="0.1.0",
    lifespan=database_lifespan(seed_products=True),
)
configure_cors(app)
app.include_router(products_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "tina-product-api"}
