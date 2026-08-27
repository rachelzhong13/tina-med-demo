from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_path: str
    llm_api_key: str
    llm_base_url: str
    llm_model: str
    llm_timeout: float
    product_api_base_url: str
    product_api_timeout: float
    public_base_url: str
    cors_origins: tuple[str, ...]


def get_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        database_path=os.getenv("DATABASE_PATH", "data/tina_med.db"),
        llm_api_key=os.getenv("LLM_API_KEY", "").strip(),
        llm_base_url=os.getenv("LLM_BASE_URL", "").strip(),
        llm_model=os.getenv("LLM_MODEL", "").strip(),
        llm_timeout=float(os.getenv("LLM_TIMEOUT", "60")),
        product_api_base_url=os.getenv("PRODUCT_API_BASE_URL", "").strip(),
        product_api_timeout=float(os.getenv("PRODUCT_API_TIMEOUT", "10")),
        public_base_url=os.getenv(
            "PUBLIC_BASE_URL", "https://iotns.org.cn/TINAapimed"
        ).rstrip("/"),
        cors_origins=tuple(origin.strip() for origin in origins if origin.strip()),
    )
