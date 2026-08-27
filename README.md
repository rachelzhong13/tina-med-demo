# TINA 药品智能 Agent Demo

用于 2026 年 9 月 29 日展会展示的最小闭环：

```text
物品二维码 → 对应药品详情 → 小水滴问答 → 当前药品上下文 → OpenAI-compatible LLM
```

当前仓库中的 3 条药品记录全部是明显标记的虚构 Demo 数据，不是正式药品信息，不能据此用药。

## 项目结构

- `backend/`：FastAPI、SQLite、药品 API、Chat Session、LLM Service。
- `frontend/`：Vue 3 + Vite + TypeScript，扫码直达的药品详情页和小水滴内嵌问答组件。
- `deploy/nginx.conf`：供现有 HTTPS Nginx include 的 `/TINAapimed` 配置片段。
- `docker-compose.yml`：backend 绑定 `127.0.0.1:8000`，frontend 绑定 `127.0.0.1:8080`。
- `scripts/`：Windows PowerShell 和 Linux 部署/测试脚本。

## 本地运行

要求 Python 3.11+、Node.js 20+。

后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

前端另开终端：

```powershell
cd frontend
npm install
npm run dev
```

开发地址为 `http://localhost:5173/`，Vite 会把 `/api` 代理到 `http://127.0.0.1:8000`。

本项目没有药品选择首页，也没有页面内扫码器。访问根路径会直接重定向到默认样品；展会二维码应直接指向对应详情，例如：

```text
http://localhost:5173/medicine/medicine-001
http://localhost:5173/medicine/medicine-002
http://localhost:5173/medicine/medicine-003
```

本地开发环境还提供 `/design-review`，用于让团队以同一份样品内容并排比较三套候选 UI。它默认不会进入生产构建；如确需在非开发环境启用，设置 `VITE_ENABLE_DESIGN_REVIEW=true`。

也可以运行：

```powershell
.\scripts\dev.ps1
```

## 环境变量

复制 `.env.example` 为 `.env`。`LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL` 必须由部署方填写，示例文件不包含真实 Key。

`LLM_BASE_URL` 应为 OpenAI-compatible API 的基础地址，例如以 `/v1` 结尾的地址；服务会请求其 `/chat/completions` 路径。

如果 LLM 配置为空，药品列表和详情仍然可用，Chat 返回 `503 LLM service is not configured`。不会生成伪造 AI 回答。

## API

```text
GET  /api/health
GET  /api/medicines
GET  /api/medicines/{id-or-slug}
POST /api/chat/sessions       { "medicine_id": "medicine-001" }
GET  /api/chat/sessions/{id}
POST /api/chat                { "medicine_id": "medicine-001", "session_id": "uuid", "message": "..." }
```

Session 固定绑定一个药品。使用另一种药品调用同一 Session 时返回 `409`，避免上下文串线。

## 测试和构建

```powershell
.\scripts\test.ps1
```

或者分别执行：

```powershell
cd backend
python -m pytest
cd ..\frontend
npm install
npm run build
```

前端生产构建默认使用 `/TINAapimed/` 作为 Vite base path。Nginx 部署使用 history 路由，深层链接必须转发到 frontend 容器并由其 SPA fallback 处理。

GitHub Pages 工作流使用 hash 路由，因此二维码和手机验证链接应写成：

```text
https://rachelzhong13.github.io/tina-med-demo/#/medicine/medicine-001
https://rachelzhong13.github.io/tina-med-demo/#/medicine/medicine-002
https://rachelzhong13.github.io/tina-med-demo/#/medicine/medicine-003
```

详情页右下角的“小水滴”是进入 Agent 对话的唯一入口；页面不会再提供第二个聊天按钮或“扫码查看”模块。

## Docker 和 Nginx 部署

默认部署模式是“现有宿主机 Nginx + Docker Compose backend/frontend”：

```bash
cp .env.example .env
# 编辑 .env，填写真实 LLM 配置
docker compose config
docker compose up -d --build
curl http://127.0.0.1:8000/api/health
```

将 `deploy/nginx.conf` include 到现有 `iotns.org.cn` HTTPS server 中。该片段不管理 SSL 证书，也不执行 SSH 登录。

路径转换是固定的：外部 `/TINAapimed/api/...` 转发到后端 `/api/...`；外部 `/TINAapimed/...` 转发到 frontend 容器。验证目标：

```text
https://iotns.org.cn/TINAapimed/
https://iotns.org.cn/TINAapimed/api/health
https://iotns.org.cn/TINAapimed/medicine/medicine-001
```

Docker 在当前 Windows 开发机上不可用时，不能把 Docker build 或 compose up 标记为通过。

## 替换真实数据

编辑 `backend/data/medicines.json`，替换为已确认来源的 3–5 个真实药品公共信息，并移除 Demo 标记前先完成来源核对。导入：

```bash
cd backend
python -m app.seed_cli data/medicines.json
```

真实数据必须保留来源 URL 和采集日期；不要编造批准文号、条码、生产企业或医疗结论。

## 当前未完成的外部事项

- 公司 LLM 的真实 Base URL、API Key、Model 名称。
- 其他负责人提供的真实药品公共资料和真实二维码规则。
- 服务器 Docker、现有 Nginx include 权限和 HTTPS 环境。
- 远程服务器联调与手机网络现场验收。

没有 SSH 权限或真实服务器访问证据时，只能报告“部署配置已准备”，不能报告“线上已部署”。
