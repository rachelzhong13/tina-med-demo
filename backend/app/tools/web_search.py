from __future__ import annotations

import re
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from urllib.parse import parse_qs, unquote, urlparse

import httpx

from ..config import get_settings

PREFERRED_SITES = (
    ("中药医药信息查询平台", "www.dayi.org.cn"),
    ("中国药典", "2025.chp.org.cn"),
    ("国家药监局", "www.nmpa.gov.cn"),
)


@dataclass(frozen=True)
class WebSearchResult:
    title: str
    url: str
    snippet: str


@dataclass(frozen=True)
class WebSearchPlan:
    needs_search: bool
    query: str
    category: str
    reason: str


class WebSearchError(Exception):
    pass


class DuckDuckGoHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[WebSearchResult] = []
        self._in_title = False
        self._in_snippet = False
        self._current_url = ""
        self._title_parts: list[str] = []
        self._snippet_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        class_name = attr.get("class", "")
        if tag == "a" and "result__a" in class_name:
            self._in_title = True
            self._current_url = normalize_duckduckgo_url(attr.get("href", "") or "")
            self._title_parts = []
            self._snippet_parts = []
        elif tag in ("a", "div") and "result__snippet" in class_name:
            self._in_snippet = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_title:
            self._in_title = False
        if tag in ("a", "div") and self._in_snippet:
            self._in_snippet = False
            self._commit_result()

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_parts.append(data)
        if self._in_snippet:
            self._snippet_parts.append(data)

    def _commit_result(self) -> None:
        title = clean_text(" ".join(self._title_parts))
        snippet = clean_text(" ".join(self._snippet_parts))
        if not title or not self._current_url:
            return
        result = WebSearchResult(title=title, url=self._current_url, snippet=snippet)
        if all(existing.url != result.url for existing in self.results):
            self.results.append(result)


def strip_tags(value: str) -> str:
    return clean_text(re.sub(r"<[^>]+>", " ", value))


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def normalize_duckduckgo_url(value: str) -> str:
    if not value:
        return ""
    url = unescape(value)
    parsed = urlparse(url)
    if parsed.path.startswith("/l/"):
        target = parse_qs(parsed.query).get("uddg", [""])[0]
        if target:
            return unquote(target)
    return url


def result_host(url: str) -> str:
    return urlparse(url).netloc.lower()


def preferred_site_rank(url: str) -> int:
    host = result_host(url)
    for index, (_name, domain) in enumerate(PREFERRED_SITES):
        if host == domain or host.endswith("." + domain):
            return index
    return len(PREFERRED_SITES)


def merge_ranked_results(
    result_groups: list[list[WebSearchResult]], limit: int
) -> list[WebSearchResult]:
    merged: list[WebSearchResult] = []
    seen: set[str] = set()
    for group in result_groups:
        for result in group:
            key = result.url.rstrip("/")
            if key in seen:
                continue
            seen.add(key)
            merged.append(result)
    merged.sort(key=lambda result: preferred_site_rank(result.url))
    return merged[:limit]


def parse_bing_results(html: str) -> list[WebSearchResult]:
    results: list[WebSearchResult] = []
    blocks = re.split(r'<li\b[^>]*class="[^"]*\bb_algo\b[^"]*"[^>]*>', html)
    for block in blocks[1:]:
        link = re.search(
            r"<h2[^>]*>\s*<a\b[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not link:
            continue
        url = unescape(link.group(1))
        if not url.startswith(("http://", "https://")):
            continue
        title = strip_tags(link.group(2))
        snippet_match = re.search(
            r"<p\b[^>]*>(.*?)</p>",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        snippet = strip_tags(snippet_match.group(1)) if snippet_match else ""
        if title and all(existing.url != url for existing in results):
            results.append(WebSearchResult(title=title, url=url, snippet=snippet))
    return results


def parse_so_results(html: str) -> list[WebSearchResult]:
    results: list[WebSearchResult] = []
    blocks = re.split(r'<li\b[^>]*class="[^"]*\bres-list\b[^"]*"[^>]*>', html)
    for block in blocks[1:]:
        link = re.search(
            r"<h3\b[^>]*>\s*<a\b([^>]*)href=\"([^\"]+)\"([^>]*)>(.*?)</a>",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not link:
            continue
        attrs = f"{link.group(1)} {link.group(3)}"
        direct_url = re.search(r'data-mdurl="([^"]+)"', attrs, flags=re.IGNORECASE)
        url = unescape(direct_url.group(1) if direct_url else link.group(2))
        if not url.startswith(("http://", "https://")):
            continue
        title = strip_tags(link.group(4))
        snippet_match = re.search(
            r'<p\b[^>]*class="[^"]*\bres-desc\b[^"]*"[^>]*>(.*?)</p>',
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        snippet = strip_tags(snippet_match.group(1)) if snippet_match else ""
        if title and all(existing.url != url for existing in results):
            results.append(WebSearchResult(title=title, url=url, snippet=snippet))
    return results


def parse_duckduckgo_results(html: str) -> list[WebSearchResult]:
    parser = DuckDuckGoHtmlParser()
    parser.feed(html)
    return parser.results


def build_search_query(question: str) -> str:
    query = clean_text(question)
    patterns = (
        r"^请?帮我(?:查一下|查询|搜索|检索)",
        r"^帮我(?:查一下|查询|搜索|检索)",
        r"^请?(?:查一下|查询|搜索|检索)",
        r"^(?:网页|网上|联网)(?:查一下|查询|搜索|检索)?",
        r"(?:的)?(?:最新|最近)(?:信息|资料|新闻|政策)?$",
    )
    for pattern in patterns:
        query = re.sub(pattern, "", query, flags=re.IGNORECASE).strip()
    query = re.sub(r"[，。！？?；;：:]+$", "", query).strip()
    return query or clean_text(question)


def analyze_web_search(question: str) -> WebSearchPlan:
    query = clean_text(question)
    lowered = query.lower()
    if re.search(r"新闻|今日|今天|刚刚|实时", query, flags=re.IGNORECASE):
        return WebSearchPlan(
            True,
            build_search_query(query),
            "realtime_news",
            "问题包含新闻、今天、当前进展等实时信息需求",
        )

    priority_criteria = (
        (
            "time_sensitive_policy",
            "问题包含最新政策、法规、指南、公告等时效性内容",
            (r"最新.*政策", r"政策", r"法规", r"指南", r"公告", r"通知", r"文件", r"监管"),
        ),
        (
            "fact_verification",
            "问题需要确认统计数据、官方声明、发布信息或批准备案状态",
            (r"统计", r"统计数据", r"官方声明", r"声明", r"发布", r"批准", r"备案", r"是否属实", r"确认一下"),
        ),
        (
            "dynamic_data",
            "问题包含价格、库存、排名、汇率、股价等动态变化数据",
            (r"价格", r"库存", r"销量", r"排名", r"汇率", r"股价", r"天气"),
        ),
    )
    for category, reason, patterns in priority_criteria:
        if any(re.search(pattern, query, flags=re.IGNORECASE) for pattern in patterns):
            return WebSearchPlan(True, build_search_query(query), category, reason)

    criteria = (
        (
            "realtime_news",
            "问题包含新闻、今天、当前进展等实时信息需求",
            (r"新闻", r"今天", r"今日", r"刚刚", r"目前", r"现在", r"当前进展", r"实时"),
        ),
        (
            "time_sensitive_policy",
            "问题包含最新政策、法规、指南、公告等时效性内容",
            (r"最新.*政策", r"政策", r"法规", r"指南", r"公告", r"通知", r"文件", r"监管"),
        ),
        (
            "fact_verification",
            "问题需要确认统计数据、官方声明、发布信息或批准备案状态",
            (
                r"统计",
                r"统计数据",
                r"官方声明",
                r"声明",
                r"发布",
                r"批准",
                r"备案",
                r"是否属实",
                r"确认一下",
            ),
        ),
        (
            "dynamic_data",
            "问题包含价格、库存、排名、汇率、股价等动态变化数据",
            (r"价格", r"库存", r"销量", r"排名", r"汇率", r"股价", r"天气"),
        ),
        (
            "explicit_web_request",
            "用户明确要求联网、网页搜索或帮忙查询",
            (r"搜索", r"检索", r"网页", r"网上", r"联网", r"查一下", r"查询", r"帮我查"),
        ),
    )

    for category, reason, patterns in criteria:
        if any(re.search(pattern, query, flags=re.IGNORECASE) for pattern in patterns):
            return WebSearchPlan(True, build_search_query(query), category, reason)

    english_triggers = (
        "search",
        "web",
        "latest",
        "news",
        "policy",
        "price",
        "official",
        "statistics",
    )
    if any(trigger in lowered for trigger in english_triggers):
        return WebSearchPlan(
            True,
            build_search_query(query),
            "explicit_web_request",
            "用户问题包含英文联网检索触发词",
        )

    return WebSearchPlan(False, "", "local_context", "可直接基于当前展品资料和会话上下文回答")


def should_search_web(question: str) -> bool:
    return analyze_web_search(question).needs_search


def build_web_search_queries(query: str, extra_queries: list[str] | None = None) -> list[str]:
    base_queries: list[str] = []
    for item in [query, *(extra_queries or [])]:
        normalized = clean_text(item)
        if normalized and normalized not in base_queries:
            base_queries.append(normalized)

    search_queries: list[str] = []
    for base_query in base_queries:
        search_queries.extend(
            f"{base_query} site:{domain}" for _name, domain in PREFERRED_SITES
        )
        search_queries.append(base_query)
    return search_queries


async def fetch_bing_results(
    client: httpx.AsyncClient, query: str
) -> list[WebSearchResult]:
    response = await client.get(
        "https://cn.bing.com/search",
        params={"q": query},
    )
    if response.status_code >= 400:
        raise WebSearchError
    return parse_bing_results(response.text)


async def fetch_so_results(
    client: httpx.AsyncClient, query: str
) -> list[WebSearchResult]:
    response = await client.get(
        "https://www.so.com/s",
        params={"q": query},
    )
    if response.status_code >= 400:
        raise WebSearchError
    return parse_so_results(response.text)


async def fetch_duckduckgo_results(
    client: httpx.AsyncClient, query: str
) -> list[WebSearchResult]:
    response = await client.post(
        "https://html.duckduckgo.com/html/",
        data={"q": query},
    )
    if response.status_code >= 400:
        raise WebSearchError
    return parse_duckduckgo_results(response.text)


async def search_web(
    query: str, extra_queries: list[str] | None = None
) -> list[WebSearchResult]:
    settings = get_settings()
    if not settings.web_search_enabled:
        return []

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        )
    }
    last_error: Exception | None = None
    max_results = max(1, settings.web_search_max_results)
    search_queries = build_web_search_queries(query, extra_queries)
    collected: list[list[WebSearchResult]] = []
    try:
        async with httpx.AsyncClient(
            timeout=settings.web_search_timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            for search_query in search_queries:
                for searcher in (
                    fetch_so_results,
                    fetch_bing_results,
                    fetch_duckduckgo_results,
                ):
                    try:
                        results = await searcher(client, search_query)
                    except (httpx.HTTPError, WebSearchError) as exc:
                        last_error = exc
                        continue
                    if results:
                        collected.append(results)
                        ranked = merge_ranked_results(collected, max_results)
                        if len(ranked) >= max_results:
                            return ranked
                        break
    except httpx.HTTPError as exc:
        raise WebSearchError from exc

    if collected:
        return merge_ranked_results(collected, max_results)
    if last_error is not None:
        raise WebSearchError from last_error
    return []


def format_search_results(results: list[WebSearchResult]) -> str:
    if not results:
        return ""
    lines = [
        "Web search results for reference.",
        "Cite them with source markers like 【W1】. Do not print raw URLs.",
    ]
    for index, result in enumerate(results, start=1):
        lines.append(f"[W{index}] {result.title}")
        lines.append(f"   URL: {result.url}")
        if result.snippet:
            lines.append(f"   Snippet: {result.snippet}")
    return "\n".join(lines)
