from __future__ import annotations

import json
from typing import Any


def build_messages(
    medicine: dict[str, Any], history: list[dict[str, Any]], question: str
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
        "只能依据系统提供的当前药品资料和会话上下文回答。\n"
        "如果资料不足，必须明确说当前资料没有相关信息，不得自行补全具体药品事实。\n"
        "不得进行诊断，不得替代医生或药师提供个体化建议。\n"
        "涉及剂量、禁忌、严重不良反应或药物相互作用时，如果资料没有明确提供，"
        "请提示用户查阅正式说明书或咨询医生/药师。\n"
        "当前资料是 Demo / Mock 时，要明确提醒用户，不要把它当作真实药品资料。\n\n"
        "当前药品资料：\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}"
    )
    messages = [{"role": "system", "content": system}]
    messages.extend(
        {"role": item["role"], "content": item["content"]} for item in history
    )
    messages.append({"role": "user", "content": question})
    return messages
