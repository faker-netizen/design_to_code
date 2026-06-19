# AI Harness（{{PROJECT_NAME}}）

面向人类的概览。**Agent 应以 `.cursor/rules/ai-harness.mdc` 为权威路由地图。**

## 目录结构

```
.cursor/rules/     → 自动注入的约束
.cursor/skills/    → Cursor 可发现的任务入口
.ai/workflows/     → 详细流程（按需阅读）
.ai/gates/         → 验证检查清单
.ai/templates/     → 产出物模板
.ai/memory/        → 决策记录与失败日志
.ai/progress/      → 进度存档（CURRENT + log/）
.ai/planning/      → FEATURE-PLAN + 各档位变更落盘
.ai/fixes/         → T0 Bug 修复落盘
```

## 快速链接

- [功能规划](./planning/FEATURE-PLAN.md)
- [Planning 落盘与档位](./planning/README.md)
- [项目现状 / 续作入口](./progress/CURRENT.md)
- [Agent 生命周期](./workflows/agent-lifecycle.md)
- [变更定级门禁](./gates/tier-classification.md)
- [代码质量门禁](./gates/code-quality.md)

## 维护

每次 harness 漏检后：修复代码 → 在 `memory/common-failures.md` 追加 → 必要时加强 gate 或 Husky。
