# F-20 Studio — 上下文管理方案（行业成熟实践）

> **落盘路径**：`.ai/planning/feat-studio-orchestration-platform/03-context-management.md`  
> **约束**：实现时 **优先框架内置能力**；自研仅限业务 schema 与 Material 存储。

## 1. 原则（Anthropic Context Engineering + 业界共识）

| 原则 | 含义 | Studio 落地 |
|------|------|-------------|
| **Isolate** | 子 Agent 隔离上下文 | Planner 不看 material 正文；Worker 各管各的 ReAct 窗口 |
| **Compress** | 摘要代替 raw | 步骤间 Handoff JSON + `stepSummary` |
| **Retrieve** | 检索代替塞全文 | RAG、Map-Reduce、`load_material` tool |
| **Trim** | 窗口内只留必要 token | LangChain `trim_messages`、conversation summary |
| **Externalize** | 状态外置 | LangGraph State + MySQL Materials + Checkpoint |

**不采用**：把全部搜索结果、全部 ReAct Observation 串进下一个 Agent 的 messages。

---

## 2. 对标：行业成熟方案映射

| 行业模式 | 代表 | Studio 用法 |
|----------|------|-------------|
| **RAG** | LangChain/LlamaIndex 检索链 | Search/Chat Worker：`kb_search`；Run 内 materials 向量检索 |
| **Map-Reduce** | LangChain MapReduceDocumentsChain | SummarizeWorker：`contextStrategy=map_reduce` |
| **Refine** | LangChain RefineDocumentsChain | 可选 P2：逐 material refine 摘要 |
| **分层记忆 Core/Recall/Archival** | Letta（MemGPT） | Core=SearchProfile+Plan；Recall=stepOutputs；Archival=materials 表 |
| **Graph State + Checkpoint** | LangGraph | `StudioGraphState` + `thread_id=runId` |
| **Message Trim / Summary** | LangChain `trim_messages`、LangGraph summarization middleware | ChatWorker 多轮 |
| **Structured Handoff** | OpenAI Agents/Swarm、LangGraph supervisor | `WorkerHandoff` JSON |
| **Trace 与 Prompt 分离** | LangSmith、OpenTelemetry | `react_trace_json` 落库，不进下一 LLM |

---

## 3. 五类上下文（分类治理）

| ID | 名称 | 存储 | 进 LLM 方式 |
|----|------|------|-------------|
| C1 | 任务上下文 | Run State | 短：userQuery、outputKind |
| C2 | 搜索配置 | SearchProfile | Planner/SearchWorker system 常驻 |
| C3 | 资料全文 | `studio_materials.content` | **仅 Tool 按需** `load_material` |
| C4 | ReAct 轨迹 | `studio_run_steps.react_trace_json` | Worker 内 **trim 后** 最近 K 轮 |
| C5 | 跨步简报 | `stepOutputs[stepId].summary` | Handoff.priorSummary |

---

## 4. 三层记忆模型（对齐 Letta）

```text
┌─────────────────────────────────────────┐
│  Core Memory                             │
│  SearchProfile、Plan、outputKind、约束    │  → 短，常驻 system
├─────────────────────────────────────────┤
│  Recall Memory                           │
│  stepOutputs.summary、sessionSummary      │  → 中等，Handoff / chat trim
├─────────────────────────────────────────┤
│  Archival Memory                         │
│  studio_materials、Project KB embeddings │  → 大，仅 retrieval / tool
└─────────────────────────────────────────┘
```

### 4.1 Archival 访问契约

Worker **禁止**在 system 里粘贴 `material.content`。

允许：

```text
list_materials(runId) → titles + ids
load_material(id, offset, limit) → 分段
kb_search(query) / run_material_rag(query, runId) → top-k chunks
```

与 Letta `archival_memory_search` 同构。

---

## 5. SearchProfile.contextStrategy

用户在工作台可选（或 Planner 按 material 数量推荐）：

| 策略 | 何时 | 成熟实现 |
|------|------|----------|
| **direct** | materials ≤ 8 且总 char < 阈值 | RAG top-k + snippet |
| **map_reduce** | 多篇/长文 | Map：`map_summarize_material` 并行 → Reduce：`reduce_summaries` |
| **rag_select** | materials 很多 | 对 Run materials 建临时索引；LlamaIndex/LangChain retriever |

默认规则（Executor 代码）：

```text
if materialCount > 15 OR totalChars > 200_000 → map_reduce
else if materialCount > 8 → rag_select
else → direct
```

---

## 6. Planner 上下文包（≤ ~2k tokens）

**包含**：

- userQuery、outputKind、templateId  
- SearchProfile（query、kbIds、limits、strategy）  
- 已有 material **标题列表**（非正文）  
- 已完成 step 名称列表  

**不包含**：

- Material 全文、ReAct trace、PDF 内容  

**实现**：

- MVP：`withStructuredOutput(PlanSchema)`  
- P2：ReAct Planner + tools `list_material_titles`、`validate_plan`  

---

## 7. Executor / LangGraph State

### 7.1 只用 State 传话

```typescript
stepOutputs[stepId] = {
  summary: string;      // Worker 结束时生成，200~500 字
  materialIds: string[];
  artifactRefs: string[];
};
```

下游 Worker 输入 = `WorkerHandoff`，由 Executor 从 State **组装**，非 LLM 转述。

### 7.2 Checkpoint

- LangGraph `checkpointer`：MySQL 或 Redis（MVP 可用 MemorySaver，P1 持久化）  
- `thread_id = runId`：失败从 `currentStepId` 续跑，**不重复**已完成的 Worker LLM 调用  

### 7.3 Reducer 防膨胀

```typescript
materialIndex: dedupeById merge
reactTrace in DB: full
reactTrace in Graph State: 不存或仅存 lastWorker 摘要
```

---

## 8. Worker ReAct 上下文

### 8.1 框架级 Trim（必用）

| 场景 | 方案 |
|------|------|
| ChatWorker 多轮 | `@langchain/core/messages` **`trim_messages`** + maxTokens |
| 长会话 | LangGraph **summarization node** 或 conversation summary middleware |
| ReAct 轮数 | `createAgent` **`recursionLimit`** = maxReActSteps |

**禁止**自研「保留最近 6 轮」作为主方案；trim/summary 为主，自研截断仅作 Observation 硬上限。

### 8.2 Tool Observation 上限（硬兜底）

| Tool | Observation 写入 ReAct |
|------|------------------------|
| web_search | 每条 title + url + snippet≤200 + materialId |
| url_fetch | charCount + 前 800 字 + materialId |
| kb_search | top-k chunk，每 chunk ≤400 字 |
| load_material | min(剩余 token 预算, 4000 字符) |

全文已在 `studio_materials.content`。

### 8.3 Map-Reduce 摘要 Worker

```text
Map（可并行 LangGraph Send）:
  for material in materials:
    microSummary = LLM( material snippet, schema=MicroSummary )  # ≤200字

Reduce:
  finalSummary = LLM( all microSummaries, schema=SummaryArtifact )

Citation 阶段:
  validate_citations tool 查 material id
```

标准 LangChain 文档链模式，**不**一次 prompt 读完全部 materials。

---

## 9. Chat Worker 与会话

| 项 | 方案 |
|----|------|
| 单次 Q&A | userQuery + Project KB / Run materials RAG top-k |
| 同 Project 多轮 | `chat_sessions` 绑 `project_id` |
| 历史压缩 | **trim_messages** + 周期性 **sessionSummary**（≤500 字）写入 session metadata |
| Query 改写 | 复用 `contextualizeRagQuery`（已有） |

---

## 10. Token 预算与熔断

### 10.1 估算（运行前）

使用模型 tokenizer（如 `js-tiktoken` 或 provider 计数）：

```text
estimated = plannerBudget + Σ workerBudget[step.worker]
if estimated > modelLimit * 0.85 → 拒绝或强制 map_reduce
```

### 10.2 运行中

| 条件 | 动作 |
|------|------|
| Worker 达 recursionLimit | 强制输出 partial + stepSummary |
| Run 总 LLM 调用 > 上限 | abort 并标记 degraded |
| Critic 无 citation | 最多 1 次回 SearchWorker 补检索 |

 limits 来自 SearchProfile + 全局 config。

---

## 11. 实现清单（框架优先）

| 模块 | 实现方式 |
|------|----------|
| Graph State / Checkpoint | **LangGraph** Annotation + checkpointer |
| Worker ReAct | **LangChain createAgent** |
| Map-Reduce | LangGraph Send 或 LangChain map_reduce chain |
| Material 外置 | MySQL + `load_material` tool |
| Chat trim/summary | **trim_messages** + summary middleware |
| Run material RAG | 现有 `embeddings` + `run_id` filter 或临时 index |
| Observation 截断 | `studio/tools/truncateObservation.ts`（硬兜底） |
| Handoff | `studio/types/handoff.ts`（业务） |
| Token 估算 | `studio/context/estimateTokens.ts` |

**不自研**：完整 memory OS、完整 compression 框架。

---

## 12. 验收（上下文专项）

1. Run 后 `studio_materials.content` 有全文，但任意 Worker 的 prompt 日志中 **无整篇 paste**（抽检）。  
2. materials > 15 时自动走 **map_reduce**，摘要 Artifact 仍含 citation。  
3. Chat 多轮 20+ 后，prompt token 增长 **有界**（trim + summary 生效）。  
4. Trace 页面可见完整 react_trace；下一 Worker 的 input **不含**上一 Worker 全部 observation 原文。  
5. 失败 Run 从 checkpoint 续跑，**不重复**已完成 step 的 LLM 调用。

---

## 13. 参考文献（实现时查阅）

- LangGraph：Persistence / Checkpoint / State reducers  
- LangChain：trim_messages、MapReduceDocumentsChain  
- Letta (MemGPT)：Core / Recall / Archival memory  
- Anthropic：Context Engineering（isolate, compress, retrieve）  
- 本项目：`ragRetrievalGraph.ts`（Agentic 检索子图）
