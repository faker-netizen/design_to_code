# F-20 Studio — 技术方案（Planner–Executor Multi-Agent）

> **落盘路径**：`.ai/planning/feat-studio-orchestration-platform/02-solution-design.md`  
> **上下文管理**：必须同时阅读 [03-context-management.md](./03-context-management.md)

## 1. 架构总览

```text
┌────────────────────────────────────────────────────────────────┐
│  Web：Studio App（desktop AppId: studio）                         │
│  Project · SearchProfile · Plan/Workflow · Run Trace · Artifacts│
└───────────────────────────────┬────────────────────────────────┘
                                │ REST + SSE
┌───────────────────────────────▼────────────────────────────────┐
│  apps/backend/src/studio/                                       │
│  studioRunService → studioOrchestratorGraph (LangGraph)         │
│    ├─ plannerNode        Structured Plan / 模板实例化             │
│    ├─ executePlanNode    拓扑调度 + Handoff                      │
│    ├─ workerNodes        search | summarize | script | chat      │
│    └─ synthesizeNode     合并 Artifact                           │
└───────────────────────────────┬────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────┐
│  Tool Layer（in-process MVP → MCP v2）                          │
│  kb_search · web_search · url_fetch · merge_materials            │
│  load_material · llm_structured · save_artifact                  │
└───────────────────────────────┬────────────────────────────────┘
                                │
         MySQL (projects/runs/materials/artifacts) + KB/embeddings
```

**运行时内核**：LangGraph Checkpoint + Shared State（非 chat history 传话）。

---

## 2. Multi-Agent 模型

### 2.1 角色

| 角色 | 实现 | LLM | 说明 |
|------|------|-----|------|
| **Planner** | `plannerAgent.ts` | 是 | 输出 `Plan`；不执行 search |
| **Executor** | `studioOrchestratorGraph.ts` | 否 | 调度、并行、重试、写 State |
| **SearchWorker** | `workers/searchWorker.ts` | ReAct | 按 SearchProfile gather Materials |
| **SummarizeWorker** | `workers/summarizeWorker.ts` | ReAct + Map-Reduce | 摘要 Artifact |
| **ScriptWorker** | `workers/scriptWorker.ts` | ReAct | 短视频脚本 Artifact |
| **ChatWorker** | `workers/chatWorker.ts` | ReAct | 流式问答 |
| **Synthesizer** | `synthesizeNode` | 可选 | 多 Artifact 合并 |
| **Critic**（P2） | `workers/criticWorker.ts` | 轻 ReAct | citation 校验 |

### 2.2 ReAct（Worker 内）

使用 LangChain **`createAgent`** + Zod **`tool`**（与现有 `minAgent` / `runSkillAgent` 一致）。

```text
Thought → Action(tool) → Observation → … → Final
```

- Observation 截断与 Material 外置：**03-context-management.md**
- `maxReActSteps`  per Worker（默认 8）

### 2.3 Planner–Executor 流

```text
User Query + SearchProfile + templateId?
        ↓
   [Planner] → Plan { steps[], outputKind }
        ↓
   [Executor LangGraph]
        for step in topoSort(plan):
            build Handoff from stepOutputs[dependsOn]
            dispatch Worker(ReAct)
            merge stepOutputs[step.id]
        ↓
   [Synthesize] → studio_artifacts
```

**Planner 两种模式（MVP）**：

1. **模板实例化**：`templateId` 命中 → 填充 `plan_json` 变量  
2. **Structured Planner**：`ChatOpenAI.withStructuredOutput(PlanSchema)`，输入仅 metadata（见 03）

Planner **禁止**直接调用 `web_search` / `kb_search`。

---

## 3. Plan 与 Handoff Schema

### 3.1 Plan

```typescript
type PlanStep = {
  id: string;
  worker: "search" | "summarize" | "video_script" | "chat" | "critic";
  goal: string;
  dependsOn: string[];
  inputs?: Record<string, string>;
  parallelGroup?: string;
  maxReActSteps?: number;
  onError?: "abort" | "continue";
};

type Plan = {
  version: 1;
  outputKind: "chat" | "summary" | "video_script" | "report";
  steps: PlanStep[];
  plannerNotes?: string;
};
```

### 3.2 Handoff（步骤间）

```typescript
type WorkerHandoff = {
  runId: string;
  stepId: string;
  goal: string;
  userQuery: string;
  searchProfile: SearchProfile;
  priorSummary: string;
  materialIds: string[];
  artifactRefs: string[];
  outputSchemaRef?: string;
};
```

Executor 构造 Handoff；Worker **system prompt 只收 Handoff JSON + tool 说明**。

---

## 4. SearchProfile

```typescript
type SearchProfile = {
  query: string;
  kbIds: number[];
  urls: string[];
  webSearch?: {
    enabled: boolean;
    queryTemplate?: string;
    maxResults: number;
  };
  limits: {
    maxUrls: number;
    maxWebResults: number;
    maxMaterialChars: number;
    maxPlanSteps: number;
    maxReActStepsPerWorker: number;
  };
  contextStrategy: "direct" | "map_reduce" | "rag_select";
};
```

用户在工作台 **「搜索配置」Tab** 编辑；Run 时可覆盖 `query`。

---

## 5. LangGraph Orchestrator

### 5.1 State（Annotation）

```typescript
type StudioGraphState = {
  runId: string;
  projectId: number;
  userId: number;
  userQuery: string;
  searchProfile: SearchProfile;
  plan: Plan | null;
  currentStepIds: string[];
  stepOutputs: Record<string, StepOutput>;
  materialIndex: MaterialMeta[];
  artifacts: Artifact[];
  error: string | null;
};
```

- Reducer：materialIndex 去重合并；stepOutputs 按 stepId 合并  
- **Checkpoint**：`thread_id = runId`，支持失败续跑（P2）

### 5.2 节点

| 节点 | 类型 |
|------|------|
| `init_run` | 写 DB status=running |
| `plan` | Planner |
| `execute_step` | 选 ready steps |
| `worker_search` / `worker_summarize` / … | 调对应 Worker |
| `merge_outputs` | 更新 State |
| `route_continue` | 是否还有 step |
| `synthesize` | 写 artifacts |
| `finish_run` | status=completed/failed |

### 5.3 与 `ragRetrievalGraph` 关系

- **SearchWorker** 的 tool `kb_search_agentic` 内部调用 `invokeRagRetrievalGraph`  
- 上层 Orchestrator **不**替代 RAG 子图

---

## 6. Tool Catalog（MVP in-process）

| Tool | Worker | 说明 |
|------|--------|------|
| `kb_search` | search, chat | 现有 RAG |
| `kb_search_agentic` | search | LangGraph 检索 |
| `web_search` | search | MVP: mock 或单 API |
| `url_fetch` | search | 抓取正文入库 |
| `merge_materials` | search | 去重 |
| `save_materials` | search | 写 studio_materials |
| `load_material` | summarize, script, chat | 按 id 分段读取 |
| `list_materials` | summarize | 仅 metadata |
| `map_summarize_material` | summarize | Map 阶段 |
| `reduce_summaries` | summarize | Reduce 阶段 |
| `llm_structured` | summarize, script | Zod schema 输出 |
| `save_artifact` | all | 写 studio_artifacts |
| `validate_citations` | critic | 引用检查 |
| `stream_chat` | chat | SSE token |

v2：拆为 MCP Server（`kb-mcp`、`search-mcp`、`studio-mcp`）。

---

## 7. 官方 Workflow 模板

| templateId | outputKind | steps |
|------------|------------|-------|
| `tpl-qa` | chat | search → chat |
| `tpl-research-summary` | summary | search → summarize |
| `tpl-book-deep-read` | summary | search → summarize（SearchProfile 预填书相关提示） |
| `tpl-short-video` | video_script | search → summarize → video_script |

模板存 `studio_workflow_templates.plan_json`。

---

## 8. 数据模型（MySQL）

```sql
studio_projects (
  id, user_id, name, description,
  search_profile_json JSON NOT NULL,
  default_template_id VARCHAR(64) NULL,
  kb_id INT NULL,
  created_at, updated_at
);

studio_workflow_templates (
  id VARCHAR(64) PK,
  name, description,
  plan_json JSON NOT NULL,
  default_search_profile_json JSON NULL
);

studio_runs (
  id, project_id, user_id,
  user_query TEXT NOT NULL,
  plan_json JSON,
  status ENUM('pending','running','completed','failed','aborted'),
  error_message TEXT NULL,
  started_at, finished_at
);

studio_run_steps (
  id, run_id, step_id, worker,
  status, handoff_json JSON, react_trace_json JSON,
  step_summary TEXT, duration_ms INT
);

studio_materials (
  id, run_id, project_id,
  source_type ENUM('kb','web','url','upload'),
  title, url, snippet, content MEDIUMTEXT,
  content_char_count INT,
  metadata_json JSON,
  created_at
);

studio_artifacts (
  id, run_id, kind ENUM('summary','video_script','report','chat_transcript'),
  content_json JSON NOT NULL,
  markdown MEDIUMTEXT NULL,
  created_at, updated_at
);
```

**Material.content** = Archival 层全文；prompt 默认不读。

可选：`studio_material_embeddings` 或在现有 `embeddings` 加 `run_id` 过滤，供 `rag_select`。

---

## 9. API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/studio/projects` | 列表/创建 |
| GET/PUT/DELETE | `/api/studio/projects/:id` | 详情/更新/删 |
| PUT | `/api/studio/projects/:id/search-profile` | 搜索配置 |
| GET | `/api/studio/templates` | 官方模板 |
| POST | `/api/studio/projects/:id/runs` | body: `{ userQuery, templateId?, outputKind? }` → **SSE** |
| POST | `/api/studio/runs/:id/abort` | 中止 |
| GET | `/api/studio/projects/:id/runs` | Run 列表 |
| GET | `/api/studio/runs/:id` | Run 详情 + artifacts |
| GET | `/api/studio/runs/:id/trace` | steps + react_trace |
| GET/PATCH | `/api/studio/artifacts/:id` | 读/改产物 |
| POST | `/api/studio/projects/:id/materials/upload` | 资料上传（无阅读 UI） |

SSE 事件：见 `01-requirements.md` FR-3.1。

---

## 10. 前端（桌面）

### AppId: `studio`

| Tab | 内容 |
|-----|------|
| 概览 | Project 列表 / 新建 / 选模板 |
| 搜索配置 | SearchProfile 表单 |
| 流程 | 步骤列表（MVP）；v2 React Flow |
| 运行 | query 输入 + Trace 时间线 + 流式输出 |
| 产物 | Artifact 列表、编辑、导出 |

复用：`MacAppPage`、`GlassSurface`、现有 SSE 客户端模式。

---

## 11. 与 F-00 Skill 边界

| F-00 | F-20 Studio |
|------|-------------|
| 运行时 Skill 注册、scope、Tool 白名单 | Project 级 SearchProfile + Plan |
| 聊天页 Skill 下拉 | Studio Run + Worker |
| 长期可收敛：Skill = Worker 配置包 | Template 引用 Skill tool 子集 |

---

## 12. 安全与限流

- 所有 Run 绑定 `userId`；Material/Artifact 不可跨用户  
- `web_search` / `url_fetch` 受 SearchProfile.limits 约束  
- URL 抓取 MVP：仅 https；v1.1 域名 allowlist  
- Planner/Worker 总 step 超限 → 拒绝 Run 或降级 map_reduce  

---

## 13. 测试策略

| 层 | 内容 |
|----|------|
| 单测 | Plan 拓扑排序、Handoff 构建、Observation 截断 |
| 集成 | 固定 Plan P0：search→summarize mock LLM |
| E2E | 创建 Project → Run → 摘要 Artifact 存在（Playwright @integration） |

---

## 14. 参考实现路径（现有代码）

| 新模块 | 参考 |
|--------|------|
| Worker ReAct | `apps/backend/src/agent/minAgent.ts` |
| LangGraph | `apps/backend/src/ragAgent/ragRetrievalGraph.ts` |
| SSE Run | `apps/backend/src/routes/chat.ts`, `chatStreamHelpers` |
| Scope/KB | `domainSkill/scopeEnforcer.ts` |
