from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .config import get_settings


def database_lifespan(*, seed_products: bool = True):
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        database.init_db(seed_products=seed_products)
        yield

    return lifespan


def configure_cors(app: FastAPI) -> None:
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )
