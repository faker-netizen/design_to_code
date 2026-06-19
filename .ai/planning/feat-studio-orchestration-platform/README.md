# Studio 通用编排工作台 + Planner–Executor Multi-Agent

> **状态**：**P0～P4 主体已实现**（2026-05-31），待人工验收  
> **slug**：`feat-studio-orchestration-platform`  
> **backlog**：**F-20**（与 F-00 Skill 框架互补）

## 文档索引

| 文档 | 内容 |
|------|------|
| [00-change-meta.md](./00-change-meta.md) | 定级、范围、与现有模块关系 |
| [01-requirements.md](./01-requirements.md) | 产品需求、用户流程、AC |
| [02-solution-design.md](./02-solution-design.md) | 架构、Planner–Executor、ReAct Worker、API、数据模型 |
| [03-context-management.md](./03-context-management.md) | 行业成熟上下文方案 |
| [04-implementation-plan.md](./04-implementation-plan.md) | 分期 MVP、**实现状态与缺口** |

## 代码入口

| 层 | 路径 |
|----|------|
| 后端 | `apps/backend/src/studio/`、`/api/studio` |
| 前端 | `apps/web/src/pages/studio/`、Dock `studio` |
| E2E | `e2e/tests/integration/studio-run-summary.spec.ts` |
| 进度存档 | `.ai/progress/log/2026-05-31-f-20-studio-p0-p4.md` |

## 一句话

**通用 AI 编排工作台**：用户配置 **搜什么（SearchProfile）** 与 **怎么处理（Workflow/Plan）**，系统以 **Planner–Executor Multi-Agent + ReAct Worker** 执行，产出 **对话 / 摘要 / 短视频脚本**；**不做内置 PDF 阅读器**。

## 与「知识库 / RAG」的边界

| | Studio（F-20） | Chat / RAG（旧主线） |
|--|----------------|----------------------|
| 核心 | 编排 Run、多步骤 Worker、Artifact | 对已入库文档单次问答 |
| 资料 | Run 级 **Material**（web / url / upload / **可选** KB） | 绑定 KB / 文档 scope |
| 代码 | `apps/backend/src/studio/` | `domainSkill/`、`ragService`、`pages/chat` |

KB 是 SearchProfile 的**可选数据源**，不是 Studio 的产品定义。实现上 SearchWorker 暂复用 `kb_search` 工具，与 web/url 工具 **平级**，后续应减少「处处 RAG」的表述与默认路径。

## 官方模板

`tpl-research-summary` · `tpl-qa` · `tpl-short-video`（Workflow 模板 + SearchProfile，引擎通用）
