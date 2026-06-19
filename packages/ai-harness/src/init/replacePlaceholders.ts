import fs from "node:fs";
import path from "node:path";

export type PlaceholderMap = Record<string, string>;

const TEXT_EXTENSIONS = new Set([
    ".md",
    ".mdc",
    ".json",
    ".mjs",
    ".js",
    ".ts",
    ".tsx",
    ".yml",
    ".yaml",
    ".example",
    ".gitkeep",
]);

function isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    if (TEXT_EXTENSIONS.has(ext)) return true;
    const base = path.basename(filePath);
    return base === "pre-commit" || base.startsWith(".env");
}

export function applyPlaceholders(content: string, map: PlaceholderMap): string {
    let out = content;
    for (const [key, value] of Object.entries(map)) {
        out = out.split(`{{${key}}}`).join(value);
    }
    return out;
}

/** 递归替换目录内文本文件的占位符 */
export function replaceInTree(rootDir: string, map: PlaceholderMap): void {
    const entries = fs.readdirSync(rootDir, {withFileTypes: true});
    for (const entry of entries) {
        const full = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            replaceInTree(full, map);
            continue;
        }
        if (!isTextFile(full)) continue;
        const raw = fs.readFileSync(full, "utf8");
        fs.writeFileSync(full, applyPlaceholders(raw, map), "utf8");
    }
}
