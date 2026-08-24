from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .config import get_settings
from .llm import LLMNotConfigured, LLMRequestFailed, LLMTimeout, complete
from .prompt import build_messages
from .schemas import (
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    CreateSessionRequest,
    Medicine,
    MedicineSummary,
    SessionResponse,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tina-med-demo")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    database.init_db()
    yield


app = FastAPI(
    title="TINA Medicine Agent Demo",
    version="0.1.0",
    lifespan=lifespan,
)
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_medicine(identifier: str) -> dict:
    medicine = database.get_medicine(identifier)
    if medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "tina-med-demo"}


@app.get("/api/medicines", response_model=list[MedicineSummary])
def medicines() -> list[dict]:
    return database.list_medicines()


@app.get("/api/medicines/{medicine_id}", response_model=Medicine)
def medicine(medicine_id: str) -> dict:
    return require_medicine(medicine_id)


@app.post("/api/chat/sessions", response_model=SessionResponse, status_code=201)
def create_chat_session(payload: CreateSessionRequest) -> dict:
    medicine = require_medicine(payload.medicine_id)
    timestamp = now()
    session_id = str(uuid.uuid4())
    return database.create_session(session_id, medicine["id"], timestamp)


@app.get(
    "/api/chat/sessions/{session_id}", response_model=ChatHistoryResponse
)
def chat_history(session_id: str) -> dict:
    session = database.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {
        "session_id": session_id,
        "medicine_id": session["medicine_id"],
        "messages": database.list_messages(session_id),
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> dict:
    medicine = require_medicine(payload.medicine_id)
    session = database.get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session["medicine_id"] != medicine["id"]:
        raise HTTPException(
            status_code=409, detail="Chat session belongs to another medicine"
        )

    history = database.list_messages(payload.session_id, limit=20)
    messages = build_messages(medicine, history, payload.message)
    database.add_message(payload.session_id, "user", payload.message, now())
    try:
        answer = await complete(messages)
    except LLMNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="LLM service is not configured"
        ) from exc
    except LLMTimeout as exc:
        raise HTTPException(status_code=504, detail="LLM service timed out") from exc
    except LLMRequestFailed as exc:
        raise HTTPException(status_code=502, detail="LLM service request failed") from exc

    timestamp = now()
    database.add_message(payload.session_id, "assistant", answer, timestamp)
    logger.info(
        "chat_completed path=%s medicine_id=%s session_id=%s",
        request.url.path,
        medicine["id"],
        payload.session_id,
    )
    return {
        "session_id": payload.session_id,
        "medicine_id": medicine["id"],
        "answer": answer,
        "created_at": timestamp,
    }
