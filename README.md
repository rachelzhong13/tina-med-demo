# TINA 药品智能 Agent Demo

用于 2026 年 9 月 29 日展会展示的最小闭环：

```text
药品入口 / 二维码 → 药品详情 → Chat → 当前药品上下文 → OpenAI-compatible LLM
```

当前仓库中的 3 条药品记录全部是明显标记的虚构 Demo 数据，不是正式药品信息，不能据此用药。

## 项目结构

- `backend/`：两个可独立启动的 FastAPI 服务：产品 API 和 Chat API，共享数据模型与存储代码。
- `frontend/`：Vue 3 + Vite + TypeScript，首页、详情页、Chat 页面。
- `deploy/nginx.conf`：供现有 HTTPS Nginx include 的 `/TINAapimed` 配置片段。
- `docker-compose.yml`：product-api 绑定 `127.0.0.1:8001`，chat-api 绑定 `127.0.0.1:8002`，frontend 绑定 `127.0.0.1:8080`。
- `deploy/systemd/`：不使用 Docker 时，在现有服务器上分别运行两个后端服务的 systemd 单元。
- `scripts/`：Windows PowerShell 和 Linux 部署/测试脚本。

## 本地运行

要求 Python 3.11+、Node.js 20+。

产品后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.product_api:app --reload --port 8001
```

Chat 后端另开终端：

```powershell
cd backend
python -m uvicorn app.chat_api:app --reload --port 8002
```

前端再开终端：

```powershell
cd frontend
npm install
npm run dev
```

开发地址为 `http://localhost:5173/`。Vite 将 `/api/chat` 代理到 Chat API（8002），其他 `/api` 路径代理到产品 API（8001）。

也可以运行：

```powershell
.\scripts\dev.ps1
```

## 环境变量

复制 `.env.example` 为 `.env`。`LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL` 必须由部署方填写，示例文件不包含真实 Key。模型继续使用外部 TINA OpenAI-compatible API，不在本项目中部署模型。

`LLM_BASE_URL` 应为 OpenAI-compatible API 的基础地址，例如以 `/v1` 结尾的地址；服务会请求其 `/chat/completions` 路径。

如果 LLM 配置为空，药品列表和详情仍然可用，Chat 返回 `503 LLM service is not configured`。不会生成伪造 AI 回答。

GitHub Pages 构建需要在仓库 Settings → Secrets and variables → Actions → Variables 中配置 `VITE_API_BASE_URL`，值应指向现有服务器上的 HTTPS API 根地址，例如 `https://iotns.org.cn/TINAapimed/api`。不能填 HTTP 地址，否则 GitHub Pages 页面会被浏览器的混合内容策略阻止调用后端。

## API

```text
产品 API（product-api，8001）：

GET  /api/health
GET  /api/products
GET  /api/products/{id-or-slug}

Chat API（chat-api，8002）：

GET  /api/health
POST /api/chat/sessions       { "medicine_id": "medicine-001" }
GET  /api/chat/sessions/{id}
POST /api/chat                { "medicine_id": "medicine-001", "session_id": "uuid", "message": "..." }

旧的 `/api/medicines` 路径仍由产品 API 保留，用于兼容当前二维码和前端代码。
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

前端生产构建默认使用 `/TINAapimed/` 作为 Vite base path。生产环境的深层链接必须通过 Nginx 转发到 frontend 容器并由其 SPA fallback 处理。

## Docker 和 Nginx 部署

默认部署模式是“现有宿主机 Nginx + Docker Compose product-api/chat-api/frontend”：

```bash
cp .env.example .env
# 编辑 .env，填写真实 LLM 配置
docker compose config
docker compose up -d --build
curl http://127.0.0.1:8001/api/health
curl http://127.0.0.1:8002/api/health
```

将 `deploy/nginx.conf` include 到现有 `iotns.org.cn` HTTPS server 中。该片段不管理 SSL 证书，也不执行 SSH 登录。

路径转换是固定的：外部 `/TINAapimed/api/chat/...` 转发到 Chat API，其他外部 `/TINAapimed/api/...` 转发到产品 API；外部 `/TINAapimed/...` 转发到 frontend 容器。验证目标：

```text
https://iotns.org.cn/TINAapimed/
https://iotns.org.cn/TINAapimed/api/health
https://iotns.org.cn/TINAapimed/medicine/medicine-001
```

Docker 在当前 Windows 开发机上不可用时，不能把 Docker build 或 compose up 标记为通过。

不使用 Docker 时，在服务器执行：

```bash
cp deploy/systemd/tina-product-api.service /etc/systemd/system/
cp deploy/systemd/tina-chat-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tina-product-api tina-chat-api
curl http://127.0.0.1:8001/api/health
curl http://127.0.0.1:8002/api/health
```

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
