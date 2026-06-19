---
name: project-progress
description: >-
  读写项目进度——新会话先读 CURRENT.md，功能完成并提交后写 log 并更新摘要。
  用户说续作、进度、上次做到哪时使用。
---

# 项目进度存档

## 新会话

1. `.ai/progress/CURRENT.md`
2. `.ai/planning/FEATURE-PLAN.md`（若做新功能）
3. 按 `ai-harness.mdc` 路由

## 功能完成后

1. 复制 `.ai/templates/progress-checkpoint.md` → `.ai/progress/log/YYYY-MM-DD-slug.md`
2. 更新 `CURRENT.md`（保持简短）

## 分工

| 内容 | 位置 |
|------|------|
| 做到哪了 | progress/ |
| 为什么这样设计 | memory/project-decisions.md |
| 踩坑 | memory/common-failures.md |
