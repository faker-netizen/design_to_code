# F-20 Studio 编排工作台 — 需求分析

> **落盘路径**：`.ai/planning/feat-studio-orchestration-platform/01-requirements.md`  
> **前置**：`00-change-meta.md`  
> **技术方案**：`02-solution-design.md`、`03-context-management.md`

## Feature slug

`feat-studio-orchestration-platform`（Backlog **F-20**）

## 问题

用户需要在 **同一平台** 上：

1. **自己决定搜什么**（关键词、知识库、URL、API 等），而不是写死「只搜书」；
2. **编排处理流程**（搜索 → 理解 → 产出），而非单次 Chat；
3. 获得多种 **可编辑、可导出** 的产物：文本回复、结构化摘要、短视频脚本；
4. 可观测 **Planner / Worker / Tool** 全链路（面试与调试）。

当前平台仅有 KB + RAG 对话 + Skill 下拉，**缺少 Project 级搜索配置、Plan 执行、Artifact 与 Trace**。

## 产品定位

| 是 | 不是 |
|----|------|
| 通用编排工作台（Coze 类引擎） | 垂直「只搜书」App |
| SearchProfile + Workflow/Plan | 内置 PDF 阅读器 |
| Planner–Executor Multi-Agent | 用户任意 HTTP / 任意代码节点（MVP） |
| 官方模板（读书/调研/短视频） | 替换 F-00 全部能力 |

## 用户与角色

| 角色 | 说明 |
|------|------|
| 已登录用户 | 创建 Project、配置搜索、运行、编辑产物 |
| 运营/开发者（MVP 后） | 维护 Workflow 模板、Tool/MCP 插件 |

## 核心概念

| 术语 | 定义 |
|------|------|
| **Project** | 一个编排项目（类似 Bot），含 SearchProfile + Workflow |
| **SearchProfile** | 用户定义「搜什么、从哪搜、上限」 |
| **Plan** | Planner 输出或模板预置的步骤 DAG/列表 |
| **Run** | 一次执行实例，含 Trace 与 Artifacts |
| **Material** | 搜索/抓取到的资料条目（外置存储，非 prompt 全文） |
| **Artifact** | 交付物：summary、video_script、report、chat 结果 |
| **Worker** | Search / Summarize / Script / Chat 等 ReAct Agent |

## 用户主流程

```text
1. 新建 Project（或从模板创建）
2. 配置 SearchProfile（KB、query、URL 列表、web 搜索开关与上限）
3. 选择/编辑 Workflow（模板或步骤列表）
4. 输入本次 Run 的 query（如「做 60 秒短视频脚本，角度：一书一句」）
5. 运行 → 查看 Trace（Plan → 各 Worker ReAct → Tool）
6. 编辑产物 → 导出 MD / JSON
7. （可选）在同一 Project 下继续对话，scope 绑 Project KB + Materials
```

## 功能需求

### FR-1 Project 与 SearchProfile

- [ ] FR-1.1 创建/编辑/删除/列表 Project
- [ ] FR-1.2 SearchProfile 表单：KB 多选、搜索 query（支持变量）、URL 列表、limits（maxResults 等）
- [ ] FR-1.3 可选绑定 `strategy`：direct / map_reduce / rag_select（见上下文文档）
- [ ] FR-1.4 资料上传进 Project KB（**无 PDF 阅读 UI**，仅入库进度）

### FR-2 编排（Workflow / Plan）

- [ ] FR-2.1 官方模板：纯问答、调研摘要、读书摘要、短视频脚本（至少 3 个）
- [ ] FR-2.2 MVP：表单 + 步骤列表编辑 Plan（非画布）；底层 `graph_json` / `plan_json` 统一
- [ ] FR-2.3 步骤类型白名单：search、summarize、video_script、chat、condition（MVP 可不含 condition）
- [ ] FR-2.4 模板 fork 后可改步骤顺序与参数（v1.1）

### FR-3 运行与 Trace

- [ ] FR-3.1 `POST .../runs` SSE：plan_ready、step_start/done、react_step、materials、token、artifact、run_done
- [ ] FR-3.2 Run 历史列表与详情（Plan + Trace + Artifacts）
- [ ] FR-3.3 中止 Run（AbortSignal）

### FR-4 产物

- [ ] FR-4.1 **文本回复**：流式 SSE，带 Material/KB 引用卡片
- [ ] FR-4.2 **摘要**：结构化 JSON + Markdown（一书一句、观点列表、概念表、引用列表）
- [ ] FR-4.3 **短视频脚本**：title、hook、scenes[]、fullScript、tags；**MVP 不出 MP4**
- [ ] FR-4.4 产物可编辑、导出 MD/JSON

### FR-5 Planner–Executor Multi-Agent

- [ ] FR-5.1 Planner 输出 Plan（structured output 或模板填充）
- [ ] FR-5.2 Executor（LangGraph）按 Plan 调度 Worker
- [ ] FR-5.3 各 Worker 内 ReAct + 白名单 Tool
- [ ] FR-5.4 步骤间 **Handoff JSON**，非自然语言长链

### FR-6 桌面 UI

- [ ] FR-6.1 新 Dock App「编排工作台」
- [ ] FR-6.2 Tab：概览 | 搜索配置 | 流程 | 运行/Trace | 产物
- [ ] FR-6.3 ChatPDF Dock **隐藏或改为「资料上传」入口**（产品决策，MVP 可保留 Dock 位但改文案）

## 非功能需求

| 项 | 要求 |
|----|------|
| 鉴权 | 沿用 JWT；Project/Run 按 user_id 隔离 |
| 上下文 | 遵循 `03-context-management.md` 成熟方案 |
| 可观测 | Trace 落库；LLM Trace 不进下一 Agent prompt |
| 限流 | SearchProfile.limits + Run 级 maxSteps / maxReActSteps |
| 合规 | Web 搜索 MVP：单 API 或 mock；用户 URL 抓取需域名策略（v1.1） |

## 验收标准（MVP）

1. 用户创建 Project，配置 SearchProfile（KB + query），选模板「调研摘要」。
2. 输入 Run query，SSE 可见 **Plan 步骤** 与 **SearchWorker ReAct Tool 调用**。
3. 运行结束得到 **摘要 Artifact**（MD），含引用 Material id/标题。
4. 换模板「短视频脚本」，同一 Project 再 Run，得到 **script JSON**。
5. 纯问答模板可流式对话，回答引用 Project KB。
6. **无 PDF 阅读器**；上传 PDF 仅显示「已入库」，可在 Material 列表查看元数据。
7. 刷新页面后 Project、Run、Artifact 仍在。

## 范围外（明确不做 MVP）

- React Flow 画布编排
- 自动 MP4 成片（TTS + ffmpeg）
- 用户自定义 Tool / 任意 HTTP 节点
- 扫描件 OCR
- 团队空间、权限细粒度
- 全网无限制爬虫

## 与现有代码复用

| 能力 | 路径 |
|------|------|
| RAG / 多路召回 | `ragService`, `multiRecallChunks` |
| LangGraph 子图 | `ragRetrievalGraph`（SearchWorker 内 Tool） |
| ReAct Agent | `createAgent`, `minAgent`, `runSkillAgent` |
| SSE | `chatStreamHelpers`, `utils/sse` |
| KB / 文档入库 | `knowledge-bases`, `documentService` |
| 桌面壳 | `apps/web/src/desktop` |

## 已决策

| # | 决策 |
|---|------|
| D1 | 通用工作台，用户自定 SearchProfile |
| D2 | 不做 PDF 阅读器 |
| D3 | Planner–Executor + Worker ReAct |
| D4 | 上下文用 RAG + Map-Reduce + LangGraph State + trim/summary（见 03） |
| D5 | 短视频 MVP 只出脚本，不出片 |
