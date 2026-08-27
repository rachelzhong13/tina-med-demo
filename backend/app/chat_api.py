from __future__ import annotations

from fastapi import FastAPI

from .routes.chat import router as chat_router
from .runtime import configure_cors, database_lifespan


app = FastAPI(
    title="TINA Chat API",
    version="0.1.0",
    lifespan=database_lifespan(seed_products=True),
)
configure_cors(app)
app.include_router(chat_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "tina-chat-api"}
