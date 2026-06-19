# F-30 通用 Agent 平台 — 方案设计

> 状态：**已确认**（2026-06-11）

## 架构总览

```text
pages/agent (Dock)
    → POST /api/platform/runs (SSE)
        → platform/skills/registry
        → platform/agent/executor
            → platform/tools/* (白名单)
            → spawn_agent → 子 executor
        → platform/services/* (run / material / artifact)
```

## 后端目录

```text
apps/backend/src/platform/
  types.ts
  skills/registry.ts
  tools/{webSearch,urlFetch,readText,spawnAgent,writeArtifact,index}.ts
  agent/{executor,messageHelpers}.ts
  services/{runService,materialService,artifactService}.ts
  context/runContext.ts
apps/backend/src/config/migratePlatformSchema.ts
apps/backend/src/routes/platform.ts
```

## 薄工具契约

| id | 输入 | 输出 |
|----|------|------|
| `web_search` | `query`, `maxResults?` | JSON：结果列表 `{title,url,snippet}` |
| `fetch_url` | `url` | JSON：`materialId`, `title`, `chars` |
| `read_text` | `materialId` | 正文（截断） |
| `spawn_agent` | `task`, `skillId?`, `tools?`, `maxSteps?` | JSON：`reply`, `steps` |
| `write_artifact` | `title`, `markdown` | JSON：`artifactId` |

## Skill 定义

```ts
type PlatformSkill = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: ToolId[];
  defaultMaxSteps: number;
  kind: "builtin";
};
```

内置 Skill：

- **open-research**：开放调研，工具全开（除 kb）
- **general-assistant**：仅 `read_text`、`write_artifact`

## SSE 事件

| event | 载荷 |
|-------|------|
| `run_started` | `runId`, `skillId`, `skillName` |
| `tool_call` | `stepIndex`, `name`, `arguments` |
| `tool_result` | `stepIndex`, `toolCallId`, `summary` |
| `status` | `message` |
| `done` | `reply`, `runId` |
| `error` | `message` |

## 数据模型

- `platform_runs`：一次用户任务
- `platform_run_steps`：tool trace 持久化
- `platform_materials`：fetch 正文
- `platform_artifacts`：write_artifact 产物

## 与 RAG / Chat 关系

- `domainSkill` / `chat` **不删**，Phase 0 不改动
- 新平台 **默认不挂载** `kb_search`；后续可加 Skill `kb-assistant`

## 前端

- `pages/agent/`：Layout 仿 chat，右侧 Tool Trace
- `usePlatformRun.ts`：SSE 消费
- Dock `appId: "agent"`

## F-31 预留（Phase 1）

- `apps/backend/src/apps/bookAnalysis/`
- Dock `book-analysis`，入口仅书名
- 厚工具 `book_distill` 内部组合薄工具
