from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from .. import database
from ..llm import LLMNotConfigured, LLMRequestFailed, LLMTimeout, complete
from ..product_client import ProductServiceUnavailable, get_product_for_chat
from ..prompt import build_messages
from ..schemas import (
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    CreateSessionRequest,
    SessionResponse,
)


logger = logging.getLogger("tina-med-demo.chat")
router = APIRouter()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def require_product(identifier: str) -> dict:
    try:
        product = await get_product_for_chat(identifier)
    except ProductServiceUnavailable as exc:
        raise HTTPException(
            status_code=503, detail="Product service is unavailable"
        ) from exc
    if product is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return product


@router.post("/api/chat/sessions", response_model=SessionResponse, status_code=201)
async def create_chat_session(payload: CreateSessionRequest) -> dict:
    product = await require_product(payload.medicine_id)
    timestamp = now()
    session_id = str(uuid.uuid4())
    return database.create_session(session_id, product["id"], timestamp)


@router.get(
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


@router.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> dict:
    product = await require_product(payload.medicine_id)
    session = database.get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session["medicine_id"] != product["id"]:
        raise HTTPException(
            status_code=409, detail="Chat session belongs to another medicine"
        )

    history = database.list_messages(payload.session_id, limit=20)
    messages = build_messages(product, history, payload.message)
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
        product["id"],
        payload.session_id,
    )
    return {
        "session_id": payload.session_id,
        "medicine_id": product["id"],
        "answer": answer,
        "created_at": timestamp,
    }
