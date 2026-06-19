# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/feat-studio-orchestration-platform/00-change-meta.md`

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | **T3**（建议） |
| change-type | feature |
| slug | `feat-studio-orchestration-platform` |
| backlog | **F-20** Studio 编排工作台 + Planner–Executor |
| workflow | requirements-design-full |
| 定级理由 | 新子系统：Project/SearchProfile/Plan/Run/Artifact；LangGraph Executor；多 Worker ReAct；新 API + 表；新桌面 App；跨前后端与现有 RAG/Skill 演进。 |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认（用户「开工」）**；**P0～P4 MVP 已实现**（2026-05-31） |
| 确认人 | 用户 |
| 确认时间 | 2026-05-31 |

## 产品决策（已对齐）

| 决策 | 结论 |
|------|------|
| 是否做通用编排工作台 | **是** |
| 是否做内置 PDF 阅读器 | **否**；资料搜/抓/入库/引用，不在 App 内读 PDF |
| 用户是否决定「搜什么」 | **是**；SearchProfile 一等配置 |
| Multi-Agent 模式 | **Planner–Executor**；Worker 内 **ReAct** |
| 上下文管理 | **行业成熟组合**（见 `03-context-management.md`） |
| ChatPDF | **降级**：可选保留「上传入库」，不作为阅读入口 |

## 与现有 backlog 关系

| 模块 | 关系 |
|------|------|
| F-00 业务域 Skill | Worker 可复用 Tool Catalog / scope；Studio 为上层编排 |
| F-11 Skill 工坊 | 可选：模板/插件来源；非 MVP 阻塞 |
| F-05 ChatPDF | 不再扩展阅读 UI；upload→KB 可合并到 Studio 资料源 |
| F-13 / mobile | 独立；Studio MVP 先 Web 桌面 |

## 本档位落盘清单

- [x] `01-requirements.md`
- [x] `02-solution-design.md`
- [x] `03-context-management.md`
- [x] `04-implementation-plan.md`

## 链接

- FEATURE-PLAN：[F-20 条目](../FEATURE-PLAN.md)
- project-decisions：[F-20 Studio 方向](../../memory/project-decisions.md#2026-05-31--f-20-studio-编排工作台方向)
- 实现存档：[2026-05-31-f-20-studio-p0-p4.md](../../progress/log/2026-05-31-f-20-studio-p0-p4.md)
- 相关 progress：[CURRENT.md](../../progress/CURRENT.md)
