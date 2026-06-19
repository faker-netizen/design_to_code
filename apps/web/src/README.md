# Web 源码目录说明

> 路径：`apps/web/src/`  
> 技术栈：React 19 + Vite + Ant Design + React Router  
> 入口：`main.tsx` — 主题 + Router；主界面为 **macOS 桌面壳**，应用在窗口内打开

---

## 先读：桌面上的几个 App（别混成「全是 RAG」）

| Dock App | 目录 | 产品定位 |
|----------|------|----------|
| **Studio** | `pages/studio/` | **编排工作台**：配搜索范围与流程 → Run → Trace / 产物。**主入口（F-20）** |
| **RAG 对话** | `pages/chat/` | 传统「对已入库文档聊天」；Skill + 会话 |
| **知识库** | `pages/knowledge-bases/` | **文档管理**（上传、索引）；是数据源之一，不是 Studio 本身 |
| PDF 上传 | `pages/chatpdf/` | 已移出 Dock，独立 PDF 场景 |

`pages/rag/`、`pages/agent/` 为调试/遗留，未进 Dock。

**SSE 共用** `service/sseClient.ts`，但 **Studio Run 事件**（plan / step / artifact）与 **聊天 token** 是不同产品语义。

---

## 启动链路

```
main.tsx → router/ → desktop/DesktopShell → appRegistry → pages/*
```

- REST：`service/request.ts`
- SSE：`service/sseClient.ts`（聊天 + **Studio Run** 等）

---

## `desktop/`

macOS 桌面壳：Dock、多窗口、应用注册。

| 文件 | 做什么 |
|------|--------|
| `appRegistry.tsx` | 注册 **Studio / chat / kb-finder** 等；lazy 映射到 `pages/*` |
| `DesktopShell.tsx` | 桌面根组件 |
| `windowManager*.tsx` | 窗口状态 |
| `Dock.tsx` | 底部 Dock（**Studio 与 RAG 对话并列**，不是从属关系） |
| `DesktopSurface.tsx` | 桌面快捷入口（可开知识库 Finder） |
| 其余 | 拖拽、位置持久化、Context 传 `meta` |

---

## `pages/`（按产品）

### `pages/studio/` ⭐ 编排工作台

Project、**SearchProfile**（query / URL / web / 可选 KB）、Workflow、Run Trace、产物编辑导出。

→ `studioApi.ts`、`useStudioRun.ts`（SSE：`plan_ready`、`step_*`、`artifact`）  
→ 后端 `/api/studio/*` — **不经过** chat 或 rag 页面

### `pages/chat/`

**文档问答**：会话、Skill、流式消息（走 `/api/chat`）。

### `pages/knowledge-bases/`

**文档库管理** + Finder 窗口；与 Studio **解耦**——Studio 里可选填 `kbIds`，不在此 App 里做编排。

### `pages/chatpdf/`、`pages/rag/`、`pages/agent/`

PDF、独立 RAG 表单、Agent 调试（次要/遗留）。

### `pages/login/`、`pages/notFound/`

登录、404。

---

## `router/`

`/login` + `/`（DesktopShell）；`/chat` 重定向 `/?open=chat`。

---

## `components/`

| 目录 | 做什么 |
|------|--------|
| `shell/` | macOS 窗口壳（玻璃拟态） |
| `MarkdownContent/` | 消息 Markdown |
| `ChatMessage*` | **聊天**虚拟列表 |
| `ChunkUploadModal/`、`knowledge-base/` | **文档上传**相关 UI |

---

## `service/`

| 文件 | 产品 |
|------|------|
| `studioApi`（在 pages/studio） | **Studio** |
| `chatApi.ts`、`skillsApi.ts` | 文档问答 |
| `knowledgeBaseApi.ts`、`chunkUploadApi.ts` | 文档库 |
| `ragApi.ts` | 遗留 RAG 页 |
| `chatpdfApi.ts` | PDF |
| `sseClient.ts` | 流式通用层 |

---

## `hooks/`

多数 hook 服务 **知识库上传/列表**（`useKnowledgeBase*`）。  
Studio 状态在 `pages/studio/useStudioProjects.ts`、`useStudioRun.ts`。

---

## `layout/`、`theme/`、`assets/`

`layout/RootLayout` 遗留 Admin 布局；`theme/` 设计令牌；`assets/` 静态资源。

---

## 快速定位

| 想改… | 去看… |
|--------|--------|
| **Studio 编排 UI** | `pages/studio/*` |
| 文档问答聊天 | `pages/chat/*` |
| 文档库上传 | `pages/knowledge-bases/*` |
| 新增 Dock App | `desktop/appRegistry.tsx` |
| 窗口壳样式 | `components/shell/*`、`theme/tokens.css` |

---

## 简图

```
DesktopShell
  ├─ Studio      → pages/studio     → /api/studio
  ├─ RAG 对话    → pages/chat       → /api/chat (+ skills)
  └─ 知识库      → knowledge-bases  → /api/knowledge-bases
```

路径别名 `@/` → `src/`。
