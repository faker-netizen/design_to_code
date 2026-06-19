# Backend 源码目录说明

> 路径：`apps/backend/src/`  
> 技术栈：Express 5 + TypeScript + MySQL + **Vercel AI SDK**（流式 LLM）+ LangChain / LangGraph（Agent 编排）  
> 入口：`server.ts` — 初始化数据库、挂载 `/api/*` 路由（除 auth 外均需 JWT）

---

## 先读：产品分层（别把所有模块都当成 RAG）

本仓库 **不是**「只有一个 RAG 知识库问答」——后端是 **多条产品线共用底座**：

| 层级 | 目录 | 做什么 |
|------|------|--------|
| **编排主线（F-20）** | `studio/` | **Studio**：用户配 SearchProfile + Plan → 多 Worker 执行 → 产出摘要/脚本/对话。**资料来源**可以是网页、URL、上传、**或可选**知识库——Run 级 Material 外置，不以 KB 为中心 |
| **文档问答（旧主线）** | `domainSkill/` + `ragAgent/` + `services/ragService` 等 | **Chat / RAG 页**用的「在已入库文档里问答」能力；与 Studio **并列**，不是 Studio 的定义 |
| **文档基础设施** | `services/knowledgeBase*`、`document*`、`routes/knowledgeBases` | 知识库 = **一种文档存储与索引方式**；Studio 可接、可不接 |
| **其它应用** | `chatpdf/`、`agent/` | PDF 场景、Agent 演示，独立边界 |

**实现上的诚实说明**：Studio 的 SearchWorker 目前 **复用** `ragService` 做「从 KB 拉片段」这一种工具；产品上 KB 只是 SearchProfile 里的一格，后续 web/url/upload 应与 KB **平级**，而不是处处叫 RAG。

---

## 根文件

| 文件 | 做什么 |
|------|--------|
| `server.ts` | 应用启动：CORS、JSON、cookie、健康检查、注册全部 API 路由、启动前建表 |

---

## `studio/` ⭐ 编排主线

**通用 AI 工作流**：Project → SearchProfile（搜什么）→ Plan（怎么处理）→ Run → Material / Artifact。

| 子目录 | 做什么 |
|--------|--------|
| `types/` | Plan、Handoff、SearchProfile、Graph State |
| `planner/` | 模板（调研摘要 / 问答 / 短视频）或 LLM 出 Plan |
| `graph/` | LangGraph 编排：注入 Plan → 逐步 Worker → 合成产物；Checkpoint |
| `workers/` | **search**（web / url / **可选** kb 工具）→ **summarize** / **script** / **chat** / **critic** |
| `context/` | token 预算、Observation 截断、contextStrategy（direct / map_reduce） |
| `tools/` | `webSearch`、`urlFetch`（与 KB 无关的外部资料） |
| `services/` | Project、Run、**Material 全文外置**、Artifact |
| `log.ts` | 结构化运行日志 |

→ `routes/studio*`（`/api/studio`）  
→ 方案：`.ai/planning/feat-studio-orchestration-platform/`

---

## `agent/`

**与业务无关的 LangChain 演示**（ReAct / tool_calls 联调）。

| 文件 | 做什么 |
|------|--------|
| `minAgent.ts` | 示例工具 + `createAgent`，供 `/api/agent/min` |

---

## `config/`

数据库、鉴权、LLM、向量索引、表迁移（含 Studio 表 `studioTableDefs.ts`）。

---

## `ai/` — Vercel AI SDK

**通义千问**（DashScope OpenAI 兼容）的流式调用层，供 Chat / RAG 生成使用：

| 文件 | 做什么 |
|------|--------|
| `provider.ts` | `createOpenAI` + Qwen baseURL / model |
| `streamPlainChat.ts` | `streamText` → 纯聊天 / RAG 生成 token 流 |
| `uiStreamAdapter.ts` | 将业务事件（meta / sources / done）桥接为 AI SDK UI Message Stream |

Chat 发送接口 `POST /api/chat/sessions/:id/messages` 使用 `pipeUIMessageStreamToResponse`；LangGraph Agent（Studio Worker、domainSkill）仍用 LangChain，可逐步迁移。

---

## `middleware/`

| 文件 | 做什么 |
|------|--------|
| `requireAuth.ts` | JWT Bearer → `req.user` |

---

## `routes/`

HTTP 薄层。按 **产品** 分组：

| 产品 | 路由 | 做什么 |
|------|------|--------|
| 鉴权 | `auth.ts` | 登录 / refresh / **`POST /guest` 访客（C 端）** |
| **Studio** | `studio.ts`、`studioProjects.ts`、`studioRuns.ts`、`studioRunHandler.ts` | 项目、Run SSE、产物 |
| 文档库 | `knowledgeBases.ts`、`chunkUploads.ts` | KB CRUD、上传（**基础设施**） |
| 文档问答 | `chat.ts`、`rag.ts`、`skills.ts` | 会话、RAG 查询、Skill 列表 |
| PDF | `chatpdf.ts` | PDF 上传与摘要 |
| 演示 | `agentMin.ts` | Mini Agent |

---

## `services/`

按域划分（**Studio 不在这里**，在 `studio/services/`）：

| 域 | 做什么 |
|----|--------|
| 鉴权 | `authService.ts` |
| 文档库 | `knowledgeBaseService.ts`、`documentService.ts`、`documentJobQueue.ts` 等 |
| **文档问答专用** | `ragService.ts`、`ragMultiRecall*.ts` — 向量检索 + 生成，供 **chat/rag** |
| 聊天 | `chatService.ts`、`chatStreamHelpers.ts` |
| ChatPDF | `chatpdfDocumentService.ts`、`pdf*` |
| 上传 | `chunkUpload*` |

---

## `domainSkill/` + `ragAgent/`（文档问答栈）

仅服务 **Chat / RAG 应用**：内置 Skill、KB scope、检索子图。  
**Studio 编排不经过这里**（Worker 自带工具链）。

| 目录 | 做什么 |
|------|--------|
| `domainSkill/` | Skill 注册、ReAct、`kb_search` 工具、流式回答 |
| `ragAgent/` | LangGraph 检索子图（评估片段够不够、改写 query） |

---

## `storage/`、`types/`、`utils/`

| 目录 | 做什么 |
|------|--------|
| `storage/` | 本地文件 `uploads/` |
| `types/` | Express 类型扩展 |
| `utils/` | SSE、路由 helper、聊天历史、**ragSources**（仅 RAG 页用）等 |

---

## API 速查（按产品）

| 前缀 | 产品 |
|------|------|
| `/api/studio` | **Studio 编排** |
| `/api/knowledge-bases` | 文档库（基础设施） |
| `/api/chat`、`/api/rag`、`/api/skills` | 文档问答 |
| `/api/chatpdf` | PDF |
| `/api/agent` | 演示 |
| `/api/auth` | 鉴权 |

---

## 依赖简图

```
server.ts
  ├── studio/          ← 编排主线（Material、Plan、Worker）
  ├── routes/chat,rag  ← 文档问答（可选读 KB）
  ├── services/document,knowledgeBase  ← 文档基础设施
  └── ragAgent/        ← 仅 ragService / chat 检索链
```
