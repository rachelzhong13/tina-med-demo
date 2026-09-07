from __future__ import annotations

from app.tools.source_router import _extract_json_object, normalize_route


def test_extract_json_object_from_markdown_fence():
    parsed = _extract_json_object(
        """
        ```json
        {"route": "knowledge", "search_query": "", "reason": "命中本地知识库"}
        ```
        """
    )
    assert parsed["route"] == "knowledge"


def test_unknown_source_route_falls_back_to_none():
    assert normalize_route("local_database") == "none"
