from __future__ import annotations

from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _medicine(
    medicine_id: str,
    slug: str,
    name: str,
    generic_name: str,
    category: str,
    description: str,
) -> dict[str, str]:
    timestamp = _now()
    target = f"https://iotns.org.cn/TINAapimed/medicine/{medicine_id}"
    return {
        "id": medicine_id,
        "slug": slug,
        "name": name,
        "generic_name": generic_name,
        "manufacturer": "DEMO 虚构企业（非真实药品）",
        "approval_number": "DEMO-MOCK-NOT-FOR-USE",
        "barcode": f"DEMO-{medicine_id[-3:]}-NOT-FOR-SALE",
        "category": category,
        "indications": "仅用于展会界面演示，不代表真实适应症。",
        "usage": "仅用于展会界面演示，不能作为用药指导。",
        "contraindications": "当前 Mock 资料未提供。请勿据此用药。",
        "warnings": "这是 DEMO / MOCK 数据，不是正式药品资料。",
        "description": description,
        "source": "DEMO MOCK DATA - REPLACE BEFORE EXHIBITION",
        "image_url": "",
        "qr_target_url": target,
        "created_at": timestamp,
        "updated_at": timestamp,
    }


DEMO_MEDICINES = [
    _medicine(
        "medicine-001",
        "demo-clear-a",
        "演示清润片 DEMO",
        "演示清润片（虚构）",
        "展会演示药品",
        "用于展示药品结构化资料、二维码和 AI 问答流程的虚构样例。",
    ),
    _medicine(
        "medicine-002",
        "demo-care-b",
        "演示舒缓胶囊 DEMO",
        "演示舒缓胶囊（虚构）",
        "展会演示药品",
        "用于展示多个药品之间的详情页和会话隔离的虚构样例。",
    ),
    _medicine(
        "medicine-003",
        "demo-health-c",
        "演示康护颗粒 DEMO",
        "演示康护颗粒（虚构）",
        "展会演示药品",
        "用于展示来源字段、Mock 标识和上下文问答的虚构样例。",
    ),
]
