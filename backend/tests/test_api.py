from __future__ import annotations


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_medicines(client):
    response = client.get("/api/medicines")
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert all("DEMO" in item["source"] for item in response.json())


def test_get_medicine_by_slug(client):
    response = client.get("/api/medicines/demo-clear-a")
    assert response.status_code == 200
    assert response.json()["id"] == "medicine-001"


def test_medicine_not_found(client):
    response = client.get("/api/medicines/not-found")
    assert response.status_code == 404


def test_create_session_requires_medicine(client):
    response = client.post(
        "/api/chat/sessions", json={"medicine_id": "medicine-001"}
    )
    assert response.status_code == 201
    assert response.json()["medicine_id"] == "medicine-001"


def test_chat_without_llm_config(client):
    session = client.post(
        "/api/chat/sessions", json={"medicine_id": "medicine-001"}
    ).json()
    response = client.post(
        "/api/chat",
        json={
            "medicine_id": "medicine-001",
            "session_id": session["session_id"],
            "message": "这个 Demo 是什么？",
        },
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "LLM service is not configured"


def test_session_medicine_mismatch_is_rejected(client):
    session = client.post(
        "/api/chat/sessions", json={"medicine_id": "medicine-001"}
    ).json()
    response = client.post(
        "/api/chat",
        json={
            "medicine_id": "medicine-002",
            "session_id": session["session_id"],
            "message": "test",
        },
    )
    assert response.status_code == 409
