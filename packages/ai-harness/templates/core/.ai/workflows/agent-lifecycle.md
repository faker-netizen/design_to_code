# Agent 生命周期

> 入口：`.cursor/rules/ai-harness.mdc`

每个 **⏸** 须用户确认后再继续。

## 简图

```text
读 CURRENT / PLAN → 定级 T0–T3 ⏸
  → T0: bugfix → 验证 ⏸
  → T1: change-lite ⏸ → 实现
  → T2/T3: requirements ⏸ → solution ⏸ → 实现
  → 自验 (post-implementation) → 用户认可 ⏸
  → 可选 commit / progress 存档
```

## 档位与落盘

| 档位 | 落盘 | 设计停点 |
|------|------|----------|
| T0 | `.ai/fixes/<slug>/` | 定级确认 |
| T1 | `planning/<slug>/` lite | 1 |
| T2/T3 | `planning/<slug>/` 完整 | 2 |

规格偏差：见 [spec-deviation.md](./spec-deviation.md)
