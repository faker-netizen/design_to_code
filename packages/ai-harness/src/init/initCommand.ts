import fs from "node:fs";
import path from "node:path";
import {copyTemplateTree} from "./copyTemplate.js";
import {replaceInTree} from "./replacePlaceholders.js";
import {templatePath} from "../paths.js";

export type InitOptions = {
    targetDir: string;
    projectName: string;
    projectDescription: string;
    force: boolean;
    withEslint: boolean;
    withHusky: boolean;
    withE2e: boolean;
};

export type InitResult = {
    targetDir: string;
    copied: string[];
    skipped: string[];
    nextSteps: string[];
};

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function buildPlaceholders(opts: InitOptions): Record<string, string> {
    return {
        PROJECT_NAME: opts.projectName,
        PROJECT_DESCRIPTION: opts.projectDescription || opts.projectName,
        INIT_DATE: todayIso(),
        WEB_APP_PATH: "apps/web",
        BACKEND_APP_PATH: "apps/backend",
        PACKAGES_GLOB: "packages/*",
    };
}

function mergeCopyResults(...lists: {copied: string[]; skipped: string[]}[]) {
    return {
        copied: lists.flatMap((r) => r.copied),
        skipped: lists.flatMap((r) => r.skipped),
    };
}

export function runInit(opts: InitOptions): InitResult {
    const target = path.resolve(opts.targetDir);
    fs.mkdirSync(target, {recursive: true});

    const coreSrc = templatePath("core");
    const coreResult = copyTemplateTree({srcDir: coreSrc, destDir: target, force: opts.force});

    const pluginResults: {copied: string[]; skipped: string[]}[] = [coreResult];

    if (opts.withEslint) {
        const eslintResult = copyTemplateTree({
            srcDir: templatePath("plugins", "eslint"),
            destDir: target,
            force: opts.force,
        });
        pluginResults.push(eslintResult);
    }

    if (opts.withHusky) {
        const huskyResult = copyTemplateTree({
            srcDir: templatePath("plugins", "husky"),
            destDir: target,
            force: opts.force,
        });
        pluginResults.push(huskyResult);
    }

    if (opts.withE2e) {
        const e2eResult = copyTemplateTree({
            srcDir: templatePath("plugins", "e2e"),
            destDir: target,
            force: opts.force,
        });
        pluginResults.push(e2eResult);
    }

    const merged = mergeCopyResults(...pluginResults);

    replaceInTree(target, buildPlaceholders(opts));

    const nextSteps = buildNextSteps(opts, target);

    return {targetDir: target, copied: merged.copied, skipped: merged.skipped, nextSteps};
}

function buildNextSteps(opts: InitOptions, target: string): string[] {
    const rel = (p: string) => path.relative(process.cwd(), p) || ".";
    const steps: string[] = [
        `已写入 ${rel(target)} — 请先读 .cursor/rules/ai-harness.mdc 与 .ai/progress/CURRENT.md`,
    ];

    if (opts.withEslint) {
        steps.push("将 eslint.ai-guardrails.mjs 接入 web/backend 的 eslint.config.js（见 templates/plugins/eslint/README.snippet.md）");
    }

    if (opts.withHusky) {
        steps.push("安装并启用 Husky: pnpm add -D husky lint-staged && pnpm exec husky init && 确认 .husky/pre-commit 存在");
        steps.push("根 package.json 添加: \"prepare\": \"husky\"，\"lint-staged\": \"lint-staged\" 或使用 lint-staged.config.mjs");
    }

    if (opts.withE2e) {
        steps.push("E2E: pnpm add -D @playwright/test && pnpm exec playwright install chromium");
        steps.push("复制 e2e/playwright.config.mts.example → e2e/playwright.config.mts 并按项目改路径");
    }

    steps.push("验证: pnpm harness:doctor -- --target " + rel(target));

    return steps;
}
