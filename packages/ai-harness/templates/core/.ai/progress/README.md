# 项目进度（存档点）

**{{PROJECT_NAME}}** 的跨会话续作入口。新会话或换 Agent：**先读 [CURRENT.md](./CURRENT.md)**。

## 文件说明

| 文件 | 用途 |
|------|------|
| `CURRENT.md` | 新会话入口：一句话现状、进行中、下一步 |
| `log/` | 已完成功能存档（`YYYY-MM-DD-slug.md`，只增不改） |

## 何时写存档

功能 **实现 + gate 验证 + git commit** 后：

1. 复制 `templates/progress-checkpoint.md` → `log/YYYY-MM-DD-slug.md`
2. 更新 `CURRENT.md`

详细步骤：`.cursor/skills/project-progress/SKILL.md`
