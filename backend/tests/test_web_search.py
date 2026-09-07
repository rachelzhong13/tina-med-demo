from __future__ import annotations

from app.tools.web_search import (
    WebSearchResult,
    analyze_web_search,
    build_web_search_queries,
    build_search_query,
    merge_ranked_results,
)


def test_build_search_query_removes_search_instruction():
    assert build_search_query("帮我查一下连花清瘟胶囊") == "连花清瘟胶囊"


def test_build_web_search_queries_includes_keywords_and_full_question():
    queries = build_web_search_queries(
        "药品监管 新闻 国家药监局", ["今天有什么药品监管新闻"]
    )

    assert "药品监管 新闻 国家药监局 site:www.dayi.org.cn" in queries
    assert "药品监管 新闻 国家药监局" in queries
    assert "今天有什么药品监管新闻 site:www.dayi.org.cn" in queries
    assert "今天有什么药品监管新闻 site:2025.chp.org.cn" in queries
    assert "今天有什么药品监管新闻 site:www.nmpa.gov.cn" in queries
    assert "今天有什么药品监管新闻" in queries


def test_web_search_plan_skips_local_context_questions():
    plan = analyze_web_search("介绍一下这个展品")
    assert not plan.needs_search
    assert plan.category == "local_context"


def test_web_search_plan_detects_realtime_news():
    plan = analyze_web_search("今天有什么药品监管新闻")
    assert plan.needs_search
    assert plan.category == "realtime_news"


def test_web_search_plan_detects_latest_policy():
    plan = analyze_web_search("最新政策是什么")
    assert plan.needs_search
    assert plan.category == "time_sensitive_policy"


def test_web_search_plan_detects_fact_verification():
    plan = analyze_web_search("这个统计数据是真的吗")
    assert plan.needs_search
    assert plan.category == "fact_verification"


def test_merge_ranked_results_prioritizes_medicine_sources():
    results = merge_ranked_results(
        [
            [
                WebSearchResult("General", "https://example.com/a", "general"),
                WebSearchResult("NMPA", "https://www.nmpa.gov.cn/item", "nmpa"),
            ],
            [
                WebSearchResult("Dayi", "https://www.dayi.org.cn/item", "dayi"),
                WebSearchResult("Pharmacopoeia", "https://2025.chp.org.cn/#/main", "chp"),
            ],
        ],
        5,
    )

    assert [item.url for item in results] == [
        "https://www.dayi.org.cn/item",
        "https://2025.chp.org.cn/#/main",
        "https://www.nmpa.gov.cn/item",
        "https://example.com/a",
    ]


def test_merge_ranked_results_limits_to_five_and_dedupes_urls():
    results = merge_ranked_results(
        [
            [
                WebSearchResult(str(index), f"https://example.com/{index}", "")
                for index in range(1, 8)
            ],
            [WebSearchResult("Duplicate", "https://example.com/1", "")],
        ],
        5,
    )

    assert len(results) == 5
    assert len({item.url for item in results}) == 5
