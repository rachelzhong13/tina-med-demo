from __future__ import annotations

import json
from typing import Any


def build_messages(
    medicine: dict[str, Any],
    history: list[dict[str, Any]],
    question: str,
    knowledge_context: str = "",
    web_context: str = "",
) -> list[dict[str, str]]:
    context = {
        key: medicine.get(key, "")
        for key in (
            "name",
            "generic_name",
            "manufacturer",
            "approval_number",
            "barcode",
            "category",
            "dosage_form",
            "specification",
            "package_description",
            "appearance",
            "storage",
            "indications",
            "usage",
            "contraindications",
            "warnings",
            "description",
            "source",
        )
    }
    system = (
        "你是用于展会药品信息展示的智能助手。\n"
        "只能依据系统提供的当前药品资料、知识库资料、网页检索资料和会话上下文回答。\n"
        "如果所有已提供资料都不足，必须明确说当前资料没有相关信息，不得自行补全具体事实。\n"
        "不得进行诊断，不得替代医生或药师提供个体化建议。\n"
        "涉及剂量、禁忌、严重不良反应或药物相互作用时，如果资料没有明确提供，"
        "请提示用户查阅正式说明书或咨询医生/药师。\n"
        "当前资料是 Demo / Mock 时，要明确提醒用户，不要把它当作真实药品资料。\n\n"
        "当前药品资料：\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}"
    )
    if knowledge_context:
        system += (
            "\n\nAdditional knowledge base context:\n"
            f"{knowledge_context}\n\n"
            "For questions answered by the knowledge base, prefer this context over web search. "
            "Cite the knowledge source with markers such as 【K1】."
        )
    if web_context:
        system += (
            "\n\nAdditional web search context:\n"
            f"{web_context}\n\n"
            "Use the web context only as supplemental information. "
            "When you rely on it, mention that it comes from web search. "
            "Cite at most five sources with markers such as 【W1】. "
            "Do not output raw URLs or percent-encoded URLs as standalone text. "
            "You may summarize web search results for general informational questions, "
            "but do not treat search snippets as medical advice or official drug instructions. "
            "For medicine safety, dosage, contraindications, adverse reactions, and interactions, "
            "tell the user to verify against official instructions or a clinician/pharmacist."
        )
    if knowledge_context or web_context:
        system += (
            "\n\nCitation rules: put source markers right after the sentence they support, "
            "for example: 下载入口在药监部门页面提供【K1】. "
            "Only cite markers that appear in the provided context."
        )

    messages = [{"role": "system", "content": system}]
    messages.extend(
        {"role": item["role"], "content": item["content"]} for item in history
    )
    messages.append({"role": "user", "content": question})
    return messages
