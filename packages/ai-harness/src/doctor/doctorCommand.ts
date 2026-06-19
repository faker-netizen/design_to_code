import fs from "node:fs";
import path from "node:path";

export type DoctorOptions = {
    targetDir: string;
};

export type DoctorCheck = {
    id: string;
    ok: boolean;
    detail: string;
};

export type DoctorResult = {
    targetDir: string;
    checks: DoctorCheck[];
    ok: boolean;
};

const REQUIRED_PATHS = [
    ".cursor/rules/ai-harness.mdc",
    ".ai/README.md",
    ".ai/progress/CURRENT.md",
    ".ai/planning/FEATURE-PLAN.md",
    ".ai/gates/tier-classification.md",
    ".ai/workflows/agent-lifecycle.md",
];

const OPTIONAL_PATHS = [
    "eslint.ai-guardrails.mjs",
    "lint-staged.config.mjs",
    ".husky/pre-commit",
    "e2e/README.md",
];

export function runDoctor(opts: DoctorOptions): DoctorResult {
    const target = path.resolve(opts.targetDir);
    const checks: DoctorCheck[] = [];

    if (!fs.existsSync(target)) {
        return {
            targetDir: target,
            ok: false,
            checks: [{id: "target", ok: false, detail: `目录不存在: ${target}`}],
        };
    }

    for (const rel of REQUIRED_PATHS) {
        const full = path.join(target, rel);
        checks.push({
            id: rel,
            ok: fs.existsSync(full),
            detail: fs.existsSync(full) ? "存在" : "缺失（core 未初始化或不完整）",
        });
    }

    for (const rel of OPTIONAL_PATHS) {
        const full = path.join(target, rel);
        if (!fs.existsSync(full)) continue;
        checks.push({id: rel, ok: true, detail: "已安装（可选插件）"});
    }

    const ok = checks.filter((c) => REQUIRED_PATHS.some((r) => c.id === r)).every((c) => c.ok);

    return {targetDir: target, checks, ok};
}
