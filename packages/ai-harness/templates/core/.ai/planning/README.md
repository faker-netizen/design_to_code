# 功能规划目录

## 变更档位（Change Tier）

**任何任务开工前**：Agent **提议**档位 → 用户 **确认**（[tier-classification gate](../gates/tier-classification.md)）。

| 档位 | 类型 | 落盘 |
|------|------|------|
| **T0** | bugfix | `.ai/fixes/<slug>/00-bugfix.md` |
| **T1** | minor | `planning/<slug>/00-change-meta.md` + `01-change-lite.md` |
| **T2/T3** | refactor / feature | `00-change-meta.md` + `01-requirements.md` + `02-solution-design.md` |

### 定级参考

```text
改变用户可感知的行为契约？  否 → T0/T1；是 → T2/T3
跨多个 app / package？       否 → T0/T1；是 → T2/T3
新 API / 新持久化？         是 → 至少 T2
```

### slug 命名

英文小写连字符，如 `feat-user-auth`。

## 与 progress 的关系

| 阶段 | 落盘 |
|------|------|
| 实施前 | `fixes/` 或 `planning/<slug>/` |
| 实施后 | `progress/log/` + 更新 `CURRENT.md` |
