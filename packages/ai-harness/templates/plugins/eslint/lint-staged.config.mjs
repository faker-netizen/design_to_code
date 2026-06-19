/** @type {import('lint-staged').Configuration} */
export default {
    "{{WEB_APP_PATH}}/**/*.{ts,tsx}": "pnpm -C {{WEB_APP_PATH}} exec eslint --fix --max-warnings=0",
    "{{BACKEND_APP_PATH}}/**/*.ts": [
        "pnpm -C {{BACKEND_APP_PATH}} exec eslint --fix --max-warnings=0",
        () => "pnpm -C {{BACKEND_APP_PATH}} exec tsc --noEmit",
    ],
};
