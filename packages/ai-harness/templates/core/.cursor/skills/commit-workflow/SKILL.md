---
name: commit-workflow
description: >-
  创建 git 提交并过 pre-commit。用户要求 commit、git add 或提交前审查时使用。
---

# Git 提交流程

1. `git status` / `git diff` / `git log -5`
2. 只提交相关文件；不提交 `.env`
3. `pnpm exec lint-staged` 或项目 lint 命令
4. 失败 → 读 `.ai/memory/common-failures.md`
5. 简洁 commit message（why 优先）
6. 功能级变更 → `project-progress` 写 log

**不要** `--no-verify`（除非用户明确要求）
