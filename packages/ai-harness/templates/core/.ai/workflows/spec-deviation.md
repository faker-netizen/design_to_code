# 规格偏差回流

实现中发现与 planning 不一致时：

1. **分类**：需求变了 / AC 不清 / 纯实现 bug
2. **需求/AC 变了** → 回到 planning 更新文档 → 用户确认 ⏸ → 再改代码
3. **纯实现 bug** → 直接修，必要时记 fixes
4. 在 change-meta 或 log 里留一句「偏差说明」

不要 silent drift（文档与代码各说各话）。
