# ESLint Guardrails 接入说明

`init` 会在项目根复制：

- `eslint.ai-guardrails.mjs`
- `lint-staged.config.mjs`（路径占位符已替换）

## backend `eslint.config.js` 示例

```js
import {backendGuardrails, backendServiceMagicNumbers} from "../../eslint.ai-guardrails.mjs";

// 在 rules 中 spread：
// ...backendGuardrails,
// 对 src/services/** 再加 ...backendServiceMagicNumbers
```

## web `eslint.config.js` 示例

```js
import {frontendGuardrails, frontendServiceMagicNumbers} from "../../eslint.ai-guardrails.mjs";
```

## 根 `package.json`

```json
{
  "scripts": {
    "prepare": "husky",
    "lint-staged": "lint-staged"
  },
  "devDependencies": {
    "husky": "^9",
    "lint-staged": "^17"
  }
}
```

非 monorepo 时改 `lint-staged.config.mjs` 里的 glob 即可。
