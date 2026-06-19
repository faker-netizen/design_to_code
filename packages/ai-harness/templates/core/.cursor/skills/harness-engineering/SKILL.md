---
name: harness-engineering
description: >-
  维护 AI harness 本身。用户要加 gate、skill、rule 或 init 新项目 harness 时使用。
---

# Harness 工程

## 分层

Rules → Skills → Workflows → Gates → Hook/CI → Memory/Progress

## 扩展

1. 新约束 → `.cursor/rules/<name>.mdc`
2. 新任务 → `.cursor/skills/<name>/SKILL.md` + optional workflow
3. 新清单 → `.ai/gates/<name>.md`
4. 更新 `ai-harness.mdc` 路由表

## 新项目初始化

本 monorepo 提供 `@d2c/ai-harness` CLI：

```bash
pnpm harness:init -- --target ../my-app --name my-app
pnpm harness:doctor -- --target ../my-app
```

包源码：`packages/ai-harness/`（学习脚手架从这里看）
