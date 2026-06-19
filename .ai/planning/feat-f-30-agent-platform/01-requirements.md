# F-30 通用 Agent 平台 — 需求

> 状态：**已确认**（2026-06-11）

## 背景

- 已撤回 F-20 Studio 编排（LangGraph 多 Worker、一切绑 RAG）。
- 产品拆为：**薄工具通用 Agent 平台**（Dock 应用）+ **厚工具垂直应用**（如书籍分析，Phase 1）。
- 社会开放场景：用户自定义靠 **Skill 配置**（prompt + 工具白名单），平台不为每人写 Service。

## 目标用户故事

1. 作为用户，我打开 **Agent** 应用，选择一个 Skill，用自然语言下达任务，看到 tool trace 与最终回答。
2. 作为用户，我使用「开放调研」类 Skill 时，Agent 可 **搜索、抓取、阅读** 网页材料，必要时 **spawn 子 Agent** 分工。
3. 作为开发者，我可在后端注册 **少量固定薄工具**，不为每个垂直场景写新 tool 代码。
4. 作为产品，**RAG/知识库** 仅作为可选工具 `kb_search`，不再是 Agent 平台默认心智。

## 范围（Phase 0 MVP）

### In

- 薄工具：`web_search`、`fetch_url`、`read_text`、`spawn_agent`、`write_artifact`
- Skill 注册表（内置）：`open-research`、`general-assistant`
- Agent Executor（ReAct / `createAgent`）
- API：`GET /api/platform/skills`、`POST /api/platform/runs`（SSE）
- DB：`platform_runs`、`platform_run_steps`、`platform_materials`、`platform_artifacts`
- 前端 Dock 应用 **Agent**：Skill 选择、对话、Tool Trace 侧栏

### Out（Phase 0）

- 用户自定义 Skill CRUD（F-11）
- 书籍分析厚应用（F-31 / Phase 1）
- LangGraph 编排台、Project/Plan/Worker
- Chat 应用重构（保持现状，后续可降为 KB 问答）

## 验收标准（AC）

| # | 验收项 |
|---|--------|
| AC-1 | Dock 出现 **Agent** 应用，可开窗对话 |
| AC-2 | `GET /api/platform/skills` 返回内置 Skill 列表 |
| AC-3 | 选择 `open-research`，发送「搜索 X 并总结」类任务，SSE 可见 `tool_call` / `tool_result` 事件 |
| AC-4 | `spawn_agent` 在 trace 中可见子任务结果 |
| AC-5 | Run 结束后 `reply` 非空；`platform_runs` 有记录 |
| AC-6 | 未配置搜索 API 时，`web_search` 降级可用（DuckDuckGo 或明确错误提示） |
| AC-7 | `pnpm -C apps/backend lint` 与 `tsc` 通过 |

## 非功能

- 单 run `maxSteps` 默认 8，可配置上限 16
- `spawn_agent` 嵌套深度 ≤ 2
- 材料正文单条截断（防 token 爆炸）
- 需登录（`requireAuth`）
