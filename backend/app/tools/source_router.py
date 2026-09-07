from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

from ..llm import complete
from .knowledge_base import knowledge_root, load_manual_text
from .web_search import build_search_query


logger = logging.getLogger("tina-med-demo.source_router")

ALLOWED_ROUTES = {"none", "knowledge", "web", "both"}


@dataclass(frozen=True)
class SourceRoute:
    route: str
    search_query: str
    reason: str

    @property
    def needs_knowledge(self) -> bool:
        return self.route in {"knowledge", "both"}

    @property
    def needs_web(self) -> bool:
        return self.route in {"web", "both"}


def _extract_json_object(value: str) -> dict:
    text = value.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise
        parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("source route must be a JSON object")
    return parsed


def normalize_route(raw_route: str) -> str:
    route = raw_route.strip().lower()
    if route in ALLOWED_ROUTES:
        return route
    return "none"


async def route_sources(question: str) -> SourceRoute:
    manual = load_manual_text(knowledge_root())
    messages = [
        {
            "role": "system",
            "content": (
                "You are a fast retrieval router for a Chinese medicine demo assistant. "
                "Decide what external context is needed before answering the user's question.\n"
                "Return JSON only, with keys: route, search_query, reason.\n"
                "route must be one of: none, knowledge, web, both.\n"
                "- knowledge: use when the question asks about local knowledge-base content, "
                "especially 粤药盾, 药品追溯, 登录, 下载, 密码, 扫码, 入库, 出库, 退药, 上传, "
                "节点平台, 码上放心, or related operation support.\n"
                "- web: use when current, official, dynamic, newly updated, factual verification, "
                "or broad internet information is needed.\n"
                "- both: use when the local knowledge base may help but current/official web "
                "verification may also be useful.\n"
                "- none: use when current medicine page context and chat history are enough.\n"
                "Do not answer the user. Do not include markdown."
            ),
        },
        {
            "role": "user",
            "content": (
                "Knowledge manual:\n"
                f"{manual or 'No local knowledge manual is available.'}\n\n"
                f"User question:\n{question}"
            ),
        },
    ]
    raw = await complete(messages)
    try:
        parsed = _extract_json_object(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("source_route_parse_failed raw=%s", raw[:1000])
        raise ValueError("LLM source route parse failed") from exc

    route = normalize_route(str(parsed.get("route", "")))
    search_query = str(parsed.get("search_query") or "").strip()
    if route in {"web", "both"} and not search_query:
        search_query = build_search_query(question)
    reason = str(parsed.get("reason") or "").strip()
    return SourceRoute(route=route, search_query=search_query, reason=reason)
