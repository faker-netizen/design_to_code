# @d2c/ai-harness

**AI 开发协作脚手架** — 在新项目里一键生成 `.ai/`、`.cursor/`、可选 ESLint 门禁与 Husky。

> 第一次做脚手架？建议按下面「包结构」→「init 做了什么」→「自己试一次」顺序读。

---

## 这个包解决什么问题

Agent 写代码容易：**跳过设计、忘记验证、跨会话失忆**。  
Harness 用 **文档 + 规则 + 门禁** 把协作流程固定下来：

```text
Rules（.cursor/rules）→ Skills（任务入口）→ Workflows（详细步骤）
  → Gates（检查清单）→ Husky/CI（机器执行）→ Progress（续作）
```

本包只负责 **「初始化这些文件」**，不包含业务代码。

---

## 包结构（脚手架长什么样）

```text
packages/ai-harness/
├── package.json          # bin: ai-harness
├── README.md             # 你正在读的文档
├── src/
│   ├── cli.ts            # 命令行入口：init / doctor / help
│   ├── paths.ts          # 定位 templates/ 目录
│   ├── init/
│   │   ├── initCommand.ts      # 编排：拷模板 → 替换占位符 → 打印下一步
│   │   ├── copyTemplate.ts     # 递归复制（支持 .ai 等点目录）
│   │   └── replacePlaceholders.ts  # {{PROJECT_NAME}} 等
│   └── doctor/
│       └── doctorCommand.ts    # 检查必需文件是否齐全
└── templates/
    ├── core/             # 必装：.ai + .cursor
    └── plugins/          # 可选：eslint / husky / e2e
        ├── eslint/
        ├── husky/
        └── e2e/
```

**脚手架三件套：**

1. **模板（templates/）** — 静态文件，带 `{{占位符}}`
2. **CLI（src/）** — 复制 + 替换 + 提示
3. **插件（plugins/）** — 按需叠加，不污染 core

---

## 快速使用

```bash
# 1. 构建 CLI（改 src 后都要 build）
pnpm -C packages/ai-harness build

# 2. 初始化到另一个目录（示例）
pnpm harness:init -- --target ../my-new-app --name my-new-app --description "我的新项目"

# 3. 检查是否齐全
pnpm harness:doctor -- --target ../my-new-app

# 开发时直接跑 TS（免 build）
pnpm -C packages/ai-harness dev init -- --target ./sandbox/demo -n demo
```

### init 选项

| 选项 | 说明 |
|------|------|
| `--target, -t` | 目标目录（默认 `.`） |
| `--name, -n` | 项目名 → 替换 `{{PROJECT_NAME}}` |
| `--description, -d` | 一句话描述 |
| `--force, -f` | 覆盖已存在文件 |
| `--no-eslint` | 不复制 ESLint guardrails |
| `--no-husky` | 不复制 pre-commit |
| `--e2e` | 额外复制 Playwright 骨架 |

---

## init 内部做了什么（学习用）

```text
1. mkdir 目标目录
2. copyTemplateTree(templates/core → 目标)
3. 可选 copy plugins/eslint、husky、e2e
4. replaceInTree：把所有 {{PROJECT_NAME}} 等换成实际值
5. 打印「下一步」：接 ESLint、装 husky 等
```

**占位符（可在模板里自行扩展）：**

| 占位符 | 含义 |
|--------|------|
| `{{PROJECT_NAME}}` | `--name` |
| `{{PROJECT_DESCRIPTION}}` | `--description` |
| `{{INIT_DATE}}` | 初始化日期 |
| `{{WEB_APP_PATH}}` | 默认 `apps/web` |
| `{{BACKEND_APP_PATH}}` | 默认 `apps/backend` |

改默认值：编辑 `src/init/initCommand.ts` 的 `buildPlaceholders`。

---

## core 模板包含什么

| 路径 | 内容 |
|------|------|
| `.cursor/rules/ai-harness.mdc` | Agent 路由地图（alwaysApply） |
| `.cursor/rules/project.mdc` | 项目通用约定 |
| `.cursor/skills/*` | progress、commit、requirements、feature、bugfix、harness |
| `.ai/workflows/` | 生命周期、需求、开发、bugfix |
| `.ai/gates/` | 定级、代码质量、实现前后 |
| `.ai/templates/` | change-meta、progress-checkpoint 等 |
| `.ai/progress/CURRENT.md` | 新会话入口 |
| `.ai/planning/FEATURE-PLAN.md` | 空 backlog 模板 |

---

## 如何扩展（做第二个插件）

1. 新建 `templates/plugins/my-plugin/`，目录结构相对于**项目根**（如 `scripts/foo.sh`）
2. 在 `initCommand.ts` 里加 `if (opts.withMyPlugin) copyTemplateTree(...)`
3. `cli.ts` 增加 `--my-plugin`  flag
4. `doctorCommand.ts` 可选检查

---

## 与本仓库 design_to_code 的关系

- **design_to_code** 的 `.ai/`、`.cursor/` 是「生产环境」完整版（含 macbook-ui、Studio 等）
- **本包** 是 **可拷贝的最小核心 + 插件**，用于 `init` 到新 repo
- 本仓库自身不必再 `init`；维护 harness 时改 `packages/ai-harness/templates` 或根目录 `.ai` 同步回模板

---

## 开发本包

```bash
pnpm -C packages/ai-harness typecheck
pnpm -C packages/ai-harness build
pnpm -C packages/ai-harness dev doctor -- --target ../../
```

---

## 常见下一步（init 之后）

1. 读目标项目 `.cursor/rules/ai-harness.mdc`
2. 填 `.ai/planning/FEATURE-PLAN.md`
3. 按 `templates/plugins/eslint/README.snippet.md` 接入 ESLint
4. `pnpm add -D husky lint-staged && pnpm exec husky init`
5. 第一个功能走 T1 定级 → `planning/<slug>/01-change-lite.md`
