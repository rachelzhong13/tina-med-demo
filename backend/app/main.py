from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import database
from .config import get_settings
from .llm import LLMNotConfigured, LLMRequestFailed, LLMTimeout, complete, stream_complete
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
from .stt import STTNotConfigured, STTRequestFailed, STTTimeout, transcribe_audio


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


def require_session(session_id: str, medicine_id: str) -> None:
    session = database.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session["medicine_id"] != medicine_id:
        raise HTTPException(
            status_code=409, detail="Chat session belongs to another medicine"
        )


def sse_event(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


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
    require_session(payload.session_id, medicine["id"])

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


@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request):
    medicine = require_medicine(payload.medicine_id)
    require_session(payload.session_id, medicine["id"])

    history = database.list_messages(payload.session_id, limit=20)
    messages = build_messages(medicine, history, payload.message)
    database.add_message(payload.session_id, "user", payload.message, now())

    async def events():
        answer_parts: list[str] = []
        try:
            async for chunk in stream_complete(messages):
                answer_parts.append(chunk)
                yield sse_event("delta", {"content": chunk})
        except LLMNotConfigured:
            yield sse_event("error", {"detail": "LLM service is not configured"})
            return
        except LLMTimeout:
            yield sse_event("error", {"detail": "LLM service timed out"})
            return
        except LLMRequestFailed:
            yield sse_event("error", {"detail": "LLM service request failed"})
            return

        answer = "".join(answer_parts).strip()
        timestamp = now()
        if answer:
            database.add_message(payload.session_id, "assistant", answer, timestamp)
            logger.info(
                "chat_stream_completed path=%s medicine_id=%s session_id=%s",
                request.url.path,
                medicine["id"],
                payload.session_id,
            )
        yield sse_event(
            "done",
            {
                "session_id": payload.session_id,
                "medicine_id": medicine["id"],
                "answer": answer,
                "created_at": timestamp,
            },
        )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/chat/voice")
async def voice_chat(
    request: Request,
    medicine_id: str = Form(..., min_length=1, max_length=100),
    session_id: str = Form(..., min_length=1, max_length=100),
    audio: UploadFile = File(...),
):
    medicine = require_medicine(medicine_id)
    require_session(session_id, medicine["id"])

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Audio file is empty")
    if len(audio_bytes) > settings.voice_max_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    try:
        transcript = await transcribe_audio(
            audio_bytes,
            audio.filename or "voice.webm",
            audio.content_type,
        )
    except STTNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="Speech-to-text service is not configured"
        ) from exc
    except STTTimeout as exc:
        raise HTTPException(
            status_code=504, detail="Speech-to-text service timed out"
        ) from exc
    except STTRequestFailed as exc:
        raise HTTPException(
            status_code=502, detail="Speech-to-text service request failed"
        ) from exc

    history = database.list_messages(session_id, limit=20)
    messages = build_messages(medicine, history, transcript)
    database.add_message(session_id, "user", transcript, now())

    async def events():
        answer_parts: list[str] = []
        yield sse_event(
            "transcript",
            {
                "session_id": session_id,
                "medicine_id": medicine["id"],
                "transcript": transcript,
            },
        )
        try:
            async for chunk in stream_complete(messages):
                answer_parts.append(chunk)
                yield sse_event("delta", {"content": chunk})
        except LLMNotConfigured:
            yield sse_event("error", {"detail": "LLM service is not configured"})
            return
        except LLMTimeout:
            yield sse_event("error", {"detail": "LLM service timed out"})
            return
        except LLMRequestFailed:
            yield sse_event("error", {"detail": "LLM service request failed"})
            return

        answer = "".join(answer_parts).strip()
        timestamp = now()
        if answer:
            database.add_message(session_id, "assistant", answer, timestamp)
            logger.info(
                "voice_chat_completed path=%s medicine_id=%s session_id=%s",
                request.url.path,
                medicine["id"],
                session_id,
            )
        yield sse_event(
            "done",
            {
                "session_id": session_id,
                "medicine_id": medicine["id"],
                "answer": answer,
                "created_at": timestamp,
            },
        )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
