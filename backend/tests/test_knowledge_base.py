from __future__ import annotations

from app.tools.knowledge_base import analyze_knowledge, load_knowledge_text


def test_password_forgotten_question_loads_knowledge_base():
    plan = analyze_knowledge("密码忘了怎么办")
    assert plan.relevant

    context, sources = load_knowledge_text("密码忘了怎么办")
    assert "忘记密码" in context
    assert "node.iotns.org.cn" in context
    assert sources
    assert "忘记密码" in sources[0].title
