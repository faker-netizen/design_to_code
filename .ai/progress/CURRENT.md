# 项目现状（新会话请先读此文件）

> 最后更新：2026-05-31

## 一句话

**AI 工作平台**：并行主线 **F-20 Studio 编排**（搜资料 → 多步 Worker → 产物）；**Chat / 知识库** 是独立的文档问答与存储能力，不是 Studio 的同义词。

## 产品方向（必读）

→ [功能规划 FEATURE-PLAN.md](../planning/FEATURE-PLAN.md)  
→ [F-20 方案](../planning/feat-studio-orchestration-platform/README.md)  
→ [方向决策](../memory/project-decisions.md#2026-05-31--f-20-studio-编排工作台方向)

## F-20 Studio（当前主线）

| 阶段 | 状态 | 说明 |
|------|------|------|
| P0 | ✅ | LangGraph Executor、SSE、Material 外置、Project CRUD |
| P1 | ✅ | `plannerAgent`、SearchWorker ReAct、react_trace |
| P2 | ✅ | Summarize Map-Reduce、Script/Chat/Critic、`contextStrategy` |
| P3 | ✅ | Dock `studio`、Tab UI、产物编辑/导出、E2E spec |
| P4 | 🟡 | MemorySaver、trim_messages、env Web/URL、结构化日志 |

→ 存档：[log/2026-05-31-f-20-studio-p0-p4.md](./log/2026-05-31-f-20-studio-p0-p4.md)

## 已完成（技术底座）

| 存档 | 摘要 |
|------|------|
| [log/2026-05-jwt-dual-token.md](./log/2026-05-jwt-dual-token.md) | JWT 双 token 鉴权 |
| [log/2026-05-rag-backend.md](./log/2026-05-rag-backend.md) | RAG 后端与知识库基础 |
| [log/2026-05-rag-agentic.md](./log/2026-05-rag-agentic.md) | RAG Agentic 能力 |
| [log/2026-05-chat-raf-stream.md](./log/2026-05-chat-raf-stream.md) | 聊天流式 + rAF 节流 |
| [log/2026-05-macos-desktop-shell.md](./log/2026-05-macos-desktop-shell.md) | macOS 桌面壳 |
| [log/2026-05-ai-harness.md](./log/2026-05-ai-harness.md) | 开发侧 AI harness |
| [log/2026-05-product-pivot-doc-platform.md](./log/2026-05-product-pivot-doc-platform.md) | 产品方向 → 文档 AI 平台 |
| [log/2026-06-ci-e2e-kb-finder.md](./log/2026-06-ci-e2e-kb-finder.md) | KB Finder、Playwright E2E、GitHub CI |
| [log/2026-05-31-f-20-studio-p0-p4.md](./log/2026-05-31-f-20-studio-p0-p4.md) | **F-20 Studio P0～P4 实现** |

## 进行中

- **F-20**：人工验收、缺口迭代（见上表 🟡）
- **F-00**：业务域 Skill 框架（与 Studio Worker 工具层收敛）
- **F-05 ChatPDF**：阅读 UI 已降级，代码保留 upload

## 已搁置

- **F-13 Android** — WebView 壳；RN MVP 见 `apps/mobile`

## 下一步建议

- [ ] 手动验收：Studio 建 Project → 绑 KB → Run → Trace → 导出摘要
- [ ] 跑 E2E：`e2e/tests/integration/studio-run-summary.spec.ts`
- [ ] F-20 增强：`rag_select`、Checkpoint 持久化、Chat 真流式
- [ ] F-00：Skill 注册表与 Studio Tool 白名单对齐
- [ ] 工程债：`MacSidebar.tsx` React 类型（全仓 tsc）；前端 `max-lines-per-function`

## 本地跑起来

```bash
pnpm dev
pnpm -C apps/backend lint
pnpm test:e2e:smoke      # 需 e2e/.env + MySQL
```

## 关键路径速查

| 区域 | 路径 |
|------|------|
| **功能规划** | `.ai/planning/FEATURE-PLAN.md` |
| **F-20 方案** | `.ai/planning/feat-studio-orchestration-platform/` |
| **Studio 后端** | `apps/backend/src/studio/` |
| **Studio 前端** | `apps/web/src/pages/studio/` |
| 桌面壳 | `apps/web/src/desktop/appRegistry.tsx` |
| E2E | `e2e/tests/integration/studio-run-summary.spec.ts` |
