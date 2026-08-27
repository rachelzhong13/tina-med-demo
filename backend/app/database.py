from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from .config import get_settings
from .seed import DEMO_MEDICINES


SCHEMA = """
CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    approval_number TEXT NOT NULL,
    barcode TEXT NOT NULL,
    category TEXT NOT NULL,
    indications TEXT NOT NULL,
    usage TEXT NOT NULL,
    contraindications TEXT NOT NULL,
    warnings TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    image_url TEXT NOT NULL,
    qr_target_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    medicine_id TEXT NOT NULL REFERENCES medicines(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
ON chat_messages(session_id, created_at);
"""


def _path() -> Path:
    path = Path(get_settings().database_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db(*, seed_products: bool = True) -> None:
    with connect() as connection:
        connection.executescript(SCHEMA)
        count = connection.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
        if seed_products and count == 0:
            _insert_medicines(connection, DEMO_MEDICINES)


def _insert_medicines(
    connection: sqlite3.Connection, medicines: list[dict[str, Any]]
) -> None:
    for medicine in medicines:
        updated = connection.execute(
            """
            UPDATE medicines SET
                slug=:slug,
                name=:name,
                generic_name=:generic_name,
                manufacturer=:manufacturer,
                approval_number=:approval_number,
                barcode=:barcode,
                category=:category,
                indications=:indications,
                usage=:usage,
                contraindications=:contraindications,
                warnings=:warnings,
                description=:description,
                source=:source,
                image_url=:image_url,
                qr_target_url=:qr_target_url,
                updated_at=:updated_at
            WHERE id=:id
            """,
            medicine,
        )
        if updated.rowcount == 0:
            connection.execute(
                """
                INSERT INTO medicines (
                    id, slug, name, generic_name, manufacturer, approval_number,
                    barcode, category, indications, usage, contraindications,
                    warnings, description, source, image_url, qr_target_url,
                    created_at, updated_at
                ) VALUES (
                    :id, :slug, :name, :generic_name, :manufacturer,
                    :approval_number, :barcode, :category, :indications, :usage,
                    :contraindications, :warnings, :description, :source,
                    :image_url, :qr_target_url, :created_at, :updated_at
                )
                """,
                medicine,
            )


def import_medicines(medicines: list[dict[str, Any]]) -> None:
    with connect() as connection:
        _insert_medicines(connection, medicines)


def list_medicines() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM medicines ORDER BY name"
        ).fetchall()
    return [dict(row) for row in rows]


def get_medicine(identifier: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM medicines WHERE id = ? OR slug = ?",
            (identifier, identifier),
        ).fetchone()
    return dict(row) if row else None


def create_session(session_id: str, medicine_id: str, timestamp: str) -> dict[str, Any]:
    with connect() as connection:
        connection.execute(
            "INSERT INTO chat_sessions (id, medicine_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, medicine_id, timestamp, timestamp),
        )
    return {
        "session_id": session_id,
        "medicine_id": medicine_id,
        "created_at": timestamp,
        "updated_at": timestamp,
    }


def get_session(session_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM chat_sessions WHERE id = ?", (session_id,)
        ).fetchone()
    return dict(row) if row else None


def add_message(session_id: str, role: str, content: str, timestamp: str) -> None:
    with connect() as connection:
        connection.execute(
            "INSERT INTO chat_messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, timestamp),
        )
        connection.execute(
            "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
            (timestamp, session_id),
        )


def list_messages(session_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    sql = "SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at"
    params: tuple[Any, ...] = (session_id,)
    if limit is not None:
        sql = """
        SELECT role, content, created_at FROM (
            SELECT role, content, created_at FROM chat_messages
            WHERE session_id = ? ORDER BY created_at DESC LIMIT ?
        ) ORDER BY created_at
        """
        params = (session_id, limit)
    with connect() as connection:
        rows = connection.execute(sql, params).fetchall()
    return [dict(row) for row in rows]
