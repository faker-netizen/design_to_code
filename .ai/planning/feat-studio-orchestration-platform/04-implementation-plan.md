# F-20 Studio — 实施计划

> **落盘路径**：`.ai/planning/feat-studio-orchestration-platform/04-implementation-plan.md`

## 阶段总览

| 阶段 | 目标 | 练到 / 交付 |
|------|------|-------------|
| **P0** | 固定 Plan Executor | LangGraph State、SSE、Material 外置 |
| **P1** | Planner + SearchWorker ReAct | Planner–Executor 闭环 |
| **P2** | Summarize + Script + Map-Reduce | 多 Worker、成熟上下文 |
| **P3** | Studio UI + 模板 | 产品可 demo |
| **P4** | Chat trim、Critic、Checkpoint 持久化 | 生产化 |

---

## P0 — Executor 骨架（~1 周）

### 后端

- [x] MySQL migration：`studio_*` 表（见 02 §8）
- [x] `studio/projects` CRUD、`search-profile` PUT
- [x] **固定 Plan** 模板 `tpl-research-summary`：`search → summarize`（summarize 可先 mock LLM）
- [x] `studioOrchestratorGraph`：plan 跳过（注入固定 Plan）→ execute steps → synthesize
- [x] `SearchWorker` stub：仅 `kb_search` + `save_materials`
- [x] `POST /projects/:id/runs` SSE：`step_start/done`、`run_done`
- [x] `truncateObservation.ts` 硬兜底

### 前端

- [x] 最小页面或 API-only；可选 Postman 验收（已由 P3 完整 UI 覆盖）

### 验收

- [x] 固定 Project + KB → Run → DB 有 materials + artifact

---

## P1 — Planner + Search ReAct（~1 周）

### 后端

- [x] `plannerAgent.ts`：`withStructuredOutput(PlanSchema)` + 模板短路
- [x] `SearchWorker` 完整 ReAct：`kb_search`、`web_search`(mock)、`url_fetch`(可选)
- [x] `WorkerHandoff` 组装
- [x] SSE：`plan_ready`、`react_step`
- [x] `studio_run_steps` 写 react_trace

### 上下文

- [x] Materials Archival 强制：Worker 无全文 paste
- [x] SearchProfile.limits 校验

### 验收

- 用户改 SearchProfile query → Planner 出 Plan → Search ReAct Trace 可见

---

## P2 — Summarize / Script + Map-Reduce（~1～1.5 周）

### 后端

- [x] `SummarizeWorker`：Map-Reduce（LangGraph Send 或 chain）
- [x] `ScriptWorker`：依赖 summarize 的 Handoff
- [x] 模板：`tpl-short-video`、`tpl-qa`
- [x] `ChatWorker`：`kb_search` + SSE token
- [x] `validate_citations`（Critic 轻量）
- [x] `contextStrategy` 自动选择（03 §5）

### 验收

- 同一 Project：摘要 MD + 脚本 JSON；materials>15 走 map_reduce

---

## P3 — Studio 桌面 UI（~1～1.5 周）

### 前端

- [x] `AppId: studio` 注册 Dock
- [x] Tab：搜索配置 | 流程（步骤列表）| 运行 Trace | 产物
- [x] Artifact 编辑 + 导出 MD/JSON
- [x] ChatPDF Dock **改文案/隐藏**（`available: false`，标签「PDF 上传」）

### E2E

- [x] `@integration` studio-run-summary.spec.ts（创建项目 API + Dock 打开 Studio）

### 验收

- [ ] 用户零代码路径：建 Project → 配搜索 → Run → 看 Trace → 导出摘要（**待人工验收**）

---

## P4 — 生产增强（~1 周，可后移）

- [x] LangGraph checkpointer 持久化（MemorySaver MVP；MySQL/Redis 待后移）
- [x] ChatWorker `trim_messages` + sessionSummary
- [x] Web search 真实 API + URL allowlist（`STUDIO_WEB_SEARCH_URL` / `STUDIO_URL_ALLOWLIST`）
- [ ] React Flow 编辑 Plan（v2 UI）
- [ ] MCP 拆包：`kb-mcp`、`search-mcp`、`studio-mcp`
- [x] 结构化日志（`studio/log.ts`；LangSmith 未接）

---

## 目录结构（目标）

```text
apps/backend/src/studio/
  types/plan.ts, state.ts, handoff.ts, searchProfile.ts
  planner/plannerAgent.ts, planTemplates.ts
  graph/studioOrchestratorGraph.ts
  workers/searchWorker.ts, summarizeWorker.ts, scriptWorker.ts, chatWorker.ts
  tools/*.ts
  context/truncateObservation.ts, estimateTokens.ts, selectContextStrategy.ts
  services/studioProjectService.ts, studioRunService.ts
  routes/studio.ts

apps/web/src/pages/studio/
  index.tsx, ProjectList.tsx, ProjectEditor.tsx
  SearchProfileForm.tsx, WorkflowSteps.tsx, RunPanel.tsx, ArtifactPanel.tsx
  useStudioRun.ts, studioApi.ts
```

---

## 与现有模块改动

| 模块 | 改动 |
|------|------|
| `server.ts` | `app.use('/api/studio', requireAuth, studioRoutes)` |
| `database.ts` | 调用 `migrateStudioSchema` |
| `appRegistry.tsx` | 增加 `studio` App |
| ChatPDF | 产品层降级；代码可保留 upload 逻辑供复用 |
| FEATURE-PLAN | 增加 F-20 |
| F-00 | 并行；Worker tools 可复用 skill tool catalog |

---

## 风险与依赖

| 风险 | 缓解 |
|------|------|
| LLM 成本 | limits + map_reduce 前置 |
| Web 搜索合规 | MVP mock，P4 接 API |
| 范围膨胀 | P3 前不做画布、不出 MP4 |
| 与 F-00 重复 | Studio 编排层，F-00 执行层/tool |

---

## 实现状态（2026-05-31）

**P0～P3 + P4 MVP 已合入代码库。** 后端 `pnpm typecheck` / `pnpm lint` 通过。

### 已知缺口（后续迭代）

| 项 | 说明 |
|----|------|
| `rag_select` | 策略可选中，Summarize 仍走 direct/map_reduce |
| Chat 流式 | SSE `token` 为分块推送，非 LLM 真流式 |
| Checkpoint | MemorySaver 仅进程内；无 MySQL/Redis / 续跑 API |
| Critic 回环 | citation 失败不自动回 Search |
| v2 | React Flow、MCP 拆包、LangSmith |

---

## 建议开工顺序

1. ~~阅读 02 + 03~~ → ~~P0~~ → ~~P1 → P2 → P3~~（已完成）  
2. **人工验收** P3 全路径 + E2E  
3. 按上表缺口与 F-00 收敛排期
