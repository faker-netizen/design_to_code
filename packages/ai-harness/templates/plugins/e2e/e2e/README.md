# E2E（Playwright）骨架

由 `@d2c/ai-harness init --e2e` 生成。按项目补 spec 与 CI。

## Setup

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
cp e2e/playwright.config.mts.example e2e/playwright.config.mts
cp e2e/.env.example e2e/.env
```

## 运行

```bash
pnpm exec playwright test -c e2e/playwright.config.mts
```

## 与 Harness 的关系

- **MCP Playwright**：开发时 Agent 探路
- **本目录 spec**：固定回归，CI 可跑 smoke
