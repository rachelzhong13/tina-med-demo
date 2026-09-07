from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from ..config import get_settings


@dataclass(frozen=True)
class KnowledgeSource:
    id: str
    title: str
    path: str
    excerpt: str
    url: str = ""


@dataclass(frozen=True)
class KnowledgePlan:
    relevant: bool
    reason: str


@dataclass(frozen=True)
class KnowledgeEntry:
    title: str
    path: str
    text: str


KNOWLEDGE_WIKI = {
    "name": "粤药盾常见问题知识库",
    "description": "粤药盾下载安装、登录、忘记密码、同步监管系统、入库、出库、药品追溯节点平台等常见操作问答。",
    "keywords": (
        "粤药盾",
        "药品追溯",
        "追溯节点",
        "码上放心",
        "入库",
        "出库",
        "同步监管系统",
        "忘记密码",
        "忘了密码",
        "密码忘了",
        "找回密码",
        "重置密码",
        "修改密码",
        "密码",
        "账号",
        "用户名",
        "初始密码",
        "安装",
        "下载",
        "登录",
        "供应商",
        "商品码",
        "追溯码",
        "扫码异常",
        "扫码",
        "扫不了码",
        "扫错码",
        "乱码",
        "医保结算",
        "企业信息",
        "退货",
        "退药",
        "顾客退药",
        "用户退药",
        "客户退药",
        "退货入库",
        "退款",
        "上传数据",
        "删除药品",
        "未授权",
    ),
}

STOP_TERMS = {
    "粤药盾",
    "怎么",
    "如何",
    "什么",
    "怎么办",
    "咋办",
    "怎么弄",
    "怎么处理",
    "如何处理",
    "处理",
    "问题",
    "软件",
    "用户",
    "客户",
    "顾客",
}

SYNONYMS = {
    "退药": ("顾客退药", "用户退药", "客户退药", "退货", "退货入库"),
    "退款": ("退药", "顾客退药", "退货", "退货入库"),
    "用户退药": ("顾客退药", "退药", "退货", "退货入库"),
    "客户退药": ("顾客退药", "退药", "退货", "退货入库"),
    "顾客退药": ("用户退药", "客户退药", "退药", "退货", "退货入库"),
    "退货": ("退药", "顾客退药", "退货入库"),
    "出库": ("零售出库", "销售出库", "结算"),
    "入库": ("采购入库", "一键入库", "强制入库"),
    "扫码异常": ("扫不了码", "扫错码", "扫码", "条形码", "追溯码"),
    "登录失败": ("登录", "账号", "用户名", "密码"),
    "密码": ("忘记密码", "密码忘了", "忘了密码", "找回密码", "重置密码", "修改密码"),
    "忘记密码": ("密码", "密码忘了", "忘了密码", "找回密码", "重置密码"),
    "忘了密码": ("忘记密码", "密码忘了", "找回密码", "重置密码"),
    "密码忘了": ("忘记密码", "忘了密码", "找回密码", "重置密码"),
    "找回密码": ("忘记密码", "密码忘了", "忘了密码", "重置密码"),
    "重置密码": ("忘记密码", "密码忘了", "忘了密码", "找回密码"),
    "修改密码": ("忘记密码", "密码忘了", "忘了密码", "重置密码"),
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def first_url(value: str) -> str:
    match = re.search(r"https?://[^\s，。！？；;、）)]+", value)
    return match.group(0).rstrip(".,;:!?") if match else ""


def knowledge_root() -> Path:
    configured = Path(get_settings().knowledge_dir)
    if configured.is_absolute():
        return configured
    candidates = (
        Path.cwd() / configured,
        Path(__file__).resolve().parents[3] / configured,
        Path(__file__).resolve().parents[2] / configured,
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def read_knowledge_file(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def load_manual_text(root: Path) -> str:
    manual_path = root / "LLMWIKI.md"
    if not manual_path.is_file():
        return ""
    return clean_text(read_knowledge_file(manual_path))


def manual_terms(manual_text: str) -> tuple[str, ...]:
    terms: list[str] = []
    for raw_term in re.split(r"[\s,，、。；;：:（）()\-/`]+", manual_text):
        term = raw_term.strip()
        if len(term) >= 2 and term not in {"Source", "file", "this", "when", "about"}:
            terms.append(term)
    return tuple(dict.fromkeys(terms))


def question_terms(question: str) -> tuple[str, ...]:
    normalized = clean_text(question).lower()
    terms: list[str] = []
    for keyword in KNOWLEDGE_WIKI["keywords"]:
        keyword = keyword.lower()
        if keyword in normalized and keyword not in STOP_TERMS:
            terms.append(keyword)
            terms.extend(item.lower() for item in SYNONYMS.get(keyword, ()))
    for term in re.findall(r"[\u4e00-\u9fffA-Za-z0-9]{2,}", normalized):
        if term not in STOP_TERMS:
            terms.append(term)
            terms.extend(item.lower() for item in SYNONYMS.get(term, ()))
            simplified = re.sub(r"(怎么办|怎么处理|如何处理|怎么弄|咋办)$", "", term)
            if simplified and simplified != term and simplified not in STOP_TERMS:
                terms.append(simplified)
                terms.extend(item.lower() for item in SYNONYMS.get(simplified, ()))
    return tuple(dict.fromkeys(terms))


def analyze_knowledge(question: str) -> KnowledgePlan:
    normalized = clean_text(question)
    if any(keyword in normalized for keyword in KNOWLEDGE_WIKI["keywords"]):
        return KnowledgePlan(True, f"问题与{KNOWLEDGE_WIKI['name']}相关")
    manual_text = load_manual_text(knowledge_root())
    if manual_text and normalized and any(
        term in normalized for term in manual_terms(manual_text)
    ):
        return KnowledgePlan(True, "问题命中知识库说明书")
    return KnowledgePlan(False, "问题未命中知识库说明书")


def split_knowledge_entries(path: Path, text: str) -> list[KnowledgeEntry]:
    blocks = re.split(r"(?m)(?=^\s*\d+(?:\.\d+)?[、.．])", text)
    entries: list[KnowledgeEntry] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        first_line = block.splitlines()[0].strip()
        title = clean_text(first_line)
        entries.append(KnowledgeEntry(title=title, path=str(path), text=block))
    if entries:
        return entries
    stripped = text.strip()
    return [KnowledgeEntry(title=path.stem, path=str(path), text=stripped)] if stripped else []


def score_entry(entry: KnowledgeEntry, terms: tuple[str, ...]) -> int:
    haystack = clean_text(f"{entry.title} {entry.text}").lower()
    title = entry.title.lower()
    score = 0
    for term in terms:
        if not term:
            continue
        count = haystack.count(term)
        if count:
            score += count
        if term in title:
            score += 8
    return score


def load_knowledge_text(
    question: str = "", *, include_all_on_miss: bool = False
) -> tuple[str, list[KnowledgeSource]]:
    root = knowledge_root()
    if not root.exists():
        return "", []

    settings = get_settings()
    all_entries: list[KnowledgeEntry] = []
    for path in sorted(root.glob("*.txt")):
        text = read_knowledge_file(path).strip()
        if not text:
            continue
        all_entries.extend(split_knowledge_entries(path, text))

    if not all_entries:
        return "", []

    terms = question_terms(question)
    scored_entries = [
        (score_entry(entry, terms), index, entry)
        for index, entry in enumerate(all_entries)
    ]
    scored_entries.sort(key=lambda item: (-item[0], item[1]))
    top_score = scored_entries[0][0] if scored_entries else 0
    if top_score <= 0:
        if not include_all_on_miss:
            return "", []
        selected_entries = all_entries
    else:
        minimum_score = max(3, top_score // 2)
        selected_entries = [
            entry for score, _index, entry in scored_entries if score >= minimum_score
        ][:4]

    parts: list[str] = []
    sources: list[KnowledgeSource] = []
    total_chars = 0
    for source_index, entry in enumerate(selected_entries, start=1):
        remaining = settings.knowledge_max_chars - total_chars
        if remaining <= 0:
            break
        clipped = entry.text[:remaining]
        source_id = f"K{source_index}"
        source_title = entry.title or Path(entry.path).stem
        parts.append(f"[{source_id}] {source_title}\n{clipped}")
        sources.append(
            KnowledgeSource(
                id=source_id,
                title=source_title,
                path=entry.path,
                excerpt=clean_text(clipped[:260]),
                url=first_url(clipped),
            )
        )
        total_chars += len(clipped)

    if not parts:
        return "", []
    return "\n\n".join(parts), sources


def format_knowledge_context(text: str) -> str:
    if not text:
        return ""
    return (
        "Knowledge base context. Use it when it answers the question. "
        "Cite it with the source marker, for example 【K1】.\n"
        f"{text}"
    )
