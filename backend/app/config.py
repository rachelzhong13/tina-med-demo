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
    stt_api_key: str
    stt_base_url: str
    stt_model: str
    stt_timeout: float
    voice_max_bytes: int
    public_base_url: str
    public_router_mode: str
    cors_origins: tuple[str, ...]


def get_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    llm_api_key = os.getenv("LLM_API_KEY", "").strip()
    llm_base_url = os.getenv("LLM_BASE_URL", "").strip()
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        database_path=os.getenv("DATABASE_PATH", "data/tina_med.db"),
        llm_api_key=llm_api_key,
        llm_base_url=llm_base_url,
        llm_model=os.getenv("LLM_MODEL", "").strip(),
        llm_timeout=float(os.getenv("LLM_TIMEOUT", "60")),
        stt_api_key=os.getenv("STT_API_KEY", llm_api_key).strip(),
        stt_base_url=os.getenv("STT_BASE_URL", llm_base_url).strip(),
        stt_model=os.getenv("STT_MODEL", "").strip(),
        stt_timeout=float(os.getenv("STT_TIMEOUT", "60")),
        voice_max_bytes=int(os.getenv("VOICE_MAX_BYTES", str(15 * 1024 * 1024))),
        public_base_url=os.getenv(
            "PUBLIC_BASE_URL", "https://iotns.org.cn/TINAapimed"
        ).rstrip("/"),
        public_router_mode=os.getenv("PUBLIC_ROUTER_MODE", "history").strip().lower(),
        cors_origins=tuple(origin.strip() for origin in origins if origin.strip()),
    )
