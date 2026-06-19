# 实现后门禁

宣称任务完成**之前**：

- [ ] `pnpm lint` 通过
- [ ] `pnpm build` 通过（若有）
- [ ] 手动验证 AC / 关键路径
- [ ] 无 `.env`、密钥进 git
- [ ] 功能级变更：写 `progress/log/` + 更新 `CURRENT.md`（`project-progress` skill）

E2E：仅当用户同意或 CI 要求时跑 `pnpm test:e2e:smoke`。
