from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("LLM_API_KEY", "")
    monkeypatch.setenv("LLM_BASE_URL", "")
    monkeypatch.setenv("LLM_MODEL", "")
    monkeypatch.setenv("STT_API_KEY", "")
    monkeypatch.setenv("STT_BASE_URL", "")
    monkeypatch.setenv("STT_MODEL", "")
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
