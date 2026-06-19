# 代码质量门禁

在 **commit** 或宣称任务完成**之前**通过。

## 自动化（按项目配置）

```bash
pnpm lint
pnpm build
pnpm exec lint-staged    # 若已配置 Husky
```

## 代码标准

- [ ] 禁止 `@ts-ignore`（若 ESLint 已启用）
- [ ] 禁止随意 `any`
- [ ] 组件 TypeScript；props 有类型
- [ ] 请求处理 loading / error / empty
- [ ] 业务逻辑不堆在 JSX 里

## ESLint AI Guardrails

若已安装 `eslint.ai-guardrails.mjs`：

| 范围 | 函数行数 | 文件行数 | 参数 |
|------|----------|----------|------|
| backend | ≤50 | ≤250 | ≤4 |
| frontend | ≤80 | ≤250 | ≤4 |

历史踩坑：`.ai/memory/common-failures.md`
