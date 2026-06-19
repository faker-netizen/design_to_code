#!/usr/bin/env node
import path from "node:path";
import {runInit} from "./init/initCommand.js";
import {runDoctor} from "./doctor/doctorCommand.js";

function printHelp(): void {
    console.log(`
@d2c/ai-harness — AI 开发协作脚手架

用法:
  ai-harness init [选项]     在新项目根目录初始化 Harness 文件
  ai-harness doctor [选项]   检查 Harness 是否齐全
  ai-harness help            显示帮助

init 选项:
  --target, -t <dir>         目标目录（默认当前目录）
  --name, -n <name>          项目名（默认取目录名）
  --description, -d <text>   项目一句话描述
  --force, -f                覆盖已存在的同名文件/目录
  --no-eslint                不复制 ESLint guardrails 插件
  --no-husky                 不复制 Husky pre-commit 插件
  --e2e                      额外复制 Playwright E2E 骨架

示例:
  pnpm -C packages/ai-harness dev init -- --target ../../my-app --name my-app
  pnpm harness:init -- --target ./sandbox/demo
  pnpm harness:doctor
`);
}

type ParsedArgs = {
    command: string;
    flags: Record<string, string | boolean>;
    positional: string[];
};

function parseArgv(argv: string[]): ParsedArgs {
    const positional: string[] = [];
    const flags: Record<string, string | boolean> = {};
    let command = "help";

    const rest = argv[0] === "--" ? argv.slice(1) : argv;
    if (rest.length > 0 && !rest[0].startsWith("-")) {
        command = rest[0];
    }

    for (let i = 1; i < rest.length; i++) {
        const arg = rest[i];
        if (arg === "--force" || arg === "-f") {
            flags.force = true;
            continue;
        }
        if (arg === "--no-eslint") {
            flags.noEslint = true;
            continue;
        }
        if (arg === "--no-husky") {
            flags.noHusky = true;
            continue;
        }
        if (arg === "--e2e") {
            flags.e2e = true;
            continue;
        }
        if (arg === "--target" || arg === "-t") {
            flags.target = rest[++i] ?? ".";
            continue;
        }
        if (arg === "--name" || arg === "-n") {
            flags.name = rest[++i] ?? "";
            continue;
        }
        if (arg === "--description" || arg === "-d") {
            flags.description = rest[++i] ?? "";
            continue;
        }
        if (!arg.startsWith("-")) positional.push(arg);
    }

    return {command, flags, positional};
}

function flagStr(flags: Record<string, string | boolean>, key: string, fallback: string): string {
    const v = flags[key];
    return typeof v === "string" ? v : fallback;
}

function flagBool(flags: Record<string, string | boolean>, key: string): boolean {
    return flags[key] === true;
}

async function main(): Promise<void> {
    const {command, flags} = parseArgv(process.argv.slice(2));

    if (command === "help" || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    if (command === "init") {
        const targetDir = flagStr(flags, "target", ".");
        const projectName = flagStr(flags, "name", path.basename(path.resolve(targetDir)));
        const result = runInit({
            targetDir,
            projectName,
            projectDescription: flagStr(flags, "description", ""),
            force: flagBool(flags, "force"),
            withEslint: !flagBool(flags, "noEslint"),
            withHusky: !flagBool(flags, "noHusky"),
            withE2e: flagBool(flags, "e2e"),
        });

        console.log("\n✅ AI Harness 初始化完成\n");
        console.log("目标:", result.targetDir);
        if (result.copied.length) {
            console.log("\n已复制:");
            for (const c of result.copied) console.log("  +", c);
        }
        if (result.skipped.length) {
            console.log("\n已跳过（已存在，加 --force 覆盖）:");
            for (const s of result.skipped) console.log("  ~", s);
        }
        console.log("\n下一步:");
        for (const step of result.nextSteps) console.log("  •", step);
        console.log("");
        return;
    }

    if (command === "doctor") {
        const targetDir = flagStr(flags, "target", ".");
        const result = runDoctor({targetDir});
        console.log("\n🔍 Harness Doctor:", result.targetDir, "\n");
        for (const c of result.checks) {
            console.log(c.ok ? "  ✓" : "  ✗", c.id, "—", c.detail);
        }
        console.log(result.ok ? "\n整体: 通过\n" : "\n整体: 未通过（运行 init 或补全缺失文件）\n");
        process.exitCode = result.ok ? 0 : 1;
        return;
    }

    console.error(`未知命令: ${command}`);
    printHelp();
    process.exitCode = 1;
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
