from __future__ import annotations

import json
import logging
import os
import re
import tempfile
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
from .tools.knowledge_base import (
    format_knowledge_context,
    load_knowledge_text,
)
from .tools.source_router import SourceRoute, route_sources
from .tools.web_search import (
    WebSearchError,
    format_search_results,
    search_web,
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
voice_upload_dir = Path(
    os.getenv("VOICE_UPLOAD_DIR", str(Path(tempfile.gettempdir()) / "tina-voice-uploads"))
)
voice_upload_dir.mkdir(parents=True, exist_ok=True)

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


def voice_file_path(token: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]{1,8})?", token):
        raise HTTPException(status_code=404, detail="Voice file not found")
    return voice_upload_dir / token


@app.get("/api/voice-files/{token}")
def voice_file(token: str):
    path = voice_file_path(token)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Voice file not found")
    return FileResponse(path)


def sse_event(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def source_payload(
    knowledge_sources: list,
    web_results: list[dict[str, str]],
) -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []
    for source in knowledge_sources:
        sources.append(
            {
                "id": source.id,
                "type": "knowledge",
                "title": source.title,
                "url": source.url,
                "snippet": source.excerpt,
            }
        )
    for index, result in enumerate(web_results, start=1):
        sources.append(
            {
                "id": f"W{index}",
                "type": "web",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "snippet": result.get("snippet", ""),
            }
        )
    return sources


def knowledge_context_for_question(question: str) -> tuple[str, list]:
    text, sources = load_knowledge_text(question, include_all_on_miss=True)
    logger.info(
        "knowledge_loaded sources=%s chars=%s titles=%s",
        len(sources),
        len(text),
        [source.title for source in sources],
    )
    return format_knowledge_context(text), sources


async def web_context_for_route(
    route: SourceRoute,
    question: str,
) -> tuple[str, list[dict[str, str]], bool]:
    if not route.needs_web:
        return "", [], False
    try:
        results = await search_web(route.search_query, extra_queries=[question])
    except WebSearchError:
        logger.warning("web_search_failed query=%s", route.search_query[:120])
        return "", [], True
    return format_search_results(results), [
        {"title": result.title, "url": result.url, "snippet": result.snippet}
        for result in results
    ], False


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
    try:
        source_route = await route_sources(payload.message)
    except LLMNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="LLM service is not configured"
        ) from exc
    except LLMTimeout as exc:
        raise HTTPException(status_code=504, detail="LLM service timed out") from exc
    except (LLMRequestFailed, ValueError) as exc:
        raise HTTPException(status_code=502, detail="LLM service request failed") from exc

    knowledge_context = ""
    knowledge_sources = []
    if source_route.needs_knowledge:
        knowledge_context, knowledge_sources = knowledge_context_for_question(
            payload.message
        )
    web_context = ""
    if source_route.needs_web:
        web_context, _web_results, _web_search_failed = await web_context_for_route(
            source_route, payload.message
        )
    messages = build_messages(
        medicine, history, payload.message, knowledge_context, web_context
    )
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
    database.add_message(payload.session_id, "user", payload.message, now())

    async def events():
        answer_parts: list[str] = []
        try:
            source_route = await route_sources(payload.message)
        except LLMNotConfigured:
            yield sse_event("error", {"detail": "LLM service is not configured"})
            return
        except LLMTimeout:
            yield sse_event("error", {"detail": "LLM service timed out"})
            return
        except (LLMRequestFailed, ValueError):
            yield sse_event("error", {"detail": "LLM service request failed"})
            return

        yield sse_event(
            "routing",
            {
                "route": source_route.route,
                "query": source_route.search_query,
                "reason": source_route.reason,
            },
        )

        knowledge_context = ""
        knowledge_sources = []
        if source_route.needs_knowledge:
            yield sse_event(
                "knowledge_reading",
                {"reason": source_route.reason},
            )
            knowledge_context, knowledge_sources = knowledge_context_for_question(
                payload.message
            )
            yield sse_event(
                "knowledge_done",
                {"count": len(knowledge_sources), "sources": source_payload(knowledge_sources, [])},
            )
        web_context = ""
        web_results: list[dict[str, str]] = []
        if source_route.needs_web:
            visible_query = "\n".join(
                item
                for item in (source_route.search_query, payload.message)
                if item
            )
            yield sse_event(
                "searching",
                {
                    "query": visible_query,
                    "category": source_route.route,
                    "reason": source_route.reason,
                },
            )
            web_context, web_results, web_search_failed = await web_context_for_route(
                source_route, payload.message
            )
            yield sse_event(
                "search_done",
                {
                    "query": visible_query,
                    "category": source_route.route,
                    "reason": source_route.reason,
                    "results": web_results,
                    "count": len(web_results),
                    "error": web_search_failed,
                },
            )

        sources = source_payload(knowledge_sources, web_results)
        if sources:
            yield sse_event("sources", {"sources": sources})

        messages = build_messages(
            medicine, history, payload.message, knowledge_context, web_context
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

    extension_by_type = {
        "audio/webm": ".webm",
        "audio/mp4": ".mp4",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/ogg": ".ogg",
    }
    media_type = (audio.content_type or "").split(";", 1)[0].lower()
    suffix = extension_by_type.get(media_type, ".webm")
    token = f"{uuid.uuid4().hex}{suffix}"
    audio_path = voice_file_path(token)
    audio_url = f"{settings.public_base_url}/api/voice-files/{token}"
    audio_path.write_bytes(audio_bytes)
    try:
        transcript = await transcribe_audio(
            audio_bytes,
            audio.filename or "voice.webm",
            audio.content_type,
            audio_url=audio_url,
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
    finally:
        audio_path.unlink(missing_ok=True)

    history = database.list_messages(session_id, limit=20)
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
            source_route = await route_sources(transcript)
        except LLMNotConfigured:
            yield sse_event("error", {"detail": "LLM service is not configured"})
            return
        except LLMTimeout:
            yield sse_event("error", {"detail": "LLM service timed out"})
            return
        except (LLMRequestFailed, ValueError):
            yield sse_event("error", {"detail": "LLM service request failed"})
            return

        yield sse_event(
            "routing",
            {
                "route": source_route.route,
                "query": source_route.search_query,
                "reason": source_route.reason,
            },
        )

        knowledge_context = ""
        knowledge_sources = []
        if source_route.needs_knowledge:
            yield sse_event(
                "knowledge_reading",
                {"reason": source_route.reason},
            )
            knowledge_context, knowledge_sources = knowledge_context_for_question(
                transcript
            )
            yield sse_event(
                "knowledge_done",
                {"count": len(knowledge_sources), "sources": source_payload(knowledge_sources, [])},
            )
        web_context = ""
        web_results: list[dict[str, str]] = []
        if source_route.needs_web:
            visible_query = "\n".join(
                item
                for item in (source_route.search_query, transcript)
                if item
            )
            yield sse_event(
                "searching",
                {
                    "query": visible_query,
                    "category": source_route.route,
                    "reason": source_route.reason,
                },
            )
            web_context, web_results, web_search_failed = await web_context_for_route(
                source_route, transcript
            )
            yield sse_event(
                "search_done",
                {
                    "query": visible_query,
                    "category": source_route.route,
                    "reason": source_route.reason,
                    "results": web_results,
                    "count": len(web_results),
                    "error": web_search_failed,
                },
            )

        sources = source_payload(knowledge_sources, web_results)
        if sources:
            yield sse_event("sources", {"sources": sources})

        messages = build_messages(
            medicine, history, transcript, knowledge_context, web_context
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
