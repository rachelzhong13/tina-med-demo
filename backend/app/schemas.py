from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MedicineSummary(BaseModel):
    id: str
    slug: str
    name: str
    generic_name: str
    manufacturer: str
    category: str
    source: str


class Medicine(MedicineSummary):
    approval_number: str
    barcode: str
    indications: str
    usage: str
    contraindications: str
    warnings: str
    description: str
    image_url: str
    qr_target_url: str
    created_at: str
    updated_at: str


class CreateSessionRequest(BaseModel):
    medicine_id: str = Field(min_length=1, max_length=100)


class SessionResponse(BaseModel):
    session_id: str
    medicine_id: str
    created_at: str
    updated_at: str


class ChatRequest(BaseModel):
    medicine_id: str = Field(min_length=1, max_length=100)
    session_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=2000)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    session_id: str
    medicine_id: str
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    session_id: str
    medicine_id: str
    answer: str
    created_at: str
