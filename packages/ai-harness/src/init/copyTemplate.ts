import fs from "node:fs";
import path from "node:path";

export type CopyOptions = {
    srcDir: string;
    destDir: string;
    force: boolean;
};

export type CopyResult = {
    copied: string[];
    skipped: string[];
};

function existsNonEmpty(dir: string): boolean {
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir).length > 0;
}

/** 将模板目录复制到目标；点文件（如 .ai）一并复制 */
export function copyTemplateTree(opts: CopyOptions): CopyResult {
    const {srcDir, destDir, force} = opts;
    const copied: string[] = [];
    const skipped: string[] = [];

    if (!fs.existsSync(srcDir)) {
        throw new Error(`模板目录不存在: ${srcDir}`);
    }

    fs.mkdirSync(destDir, {recursive: true});

    const entries = fs.readdirSync(srcDir, {withFileTypes: true});
    for (const entry of entries) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            if (fs.existsSync(dest) && !force && existsNonEmpty(dest)) {
                skipped.push(path.relative(destDir, dest) + "/");
                continue;
            }
            fs.cpSync(src, dest, {recursive: true, force: true});
            copied.push(path.relative(destDir, dest) + "/");
            continue;
        }

        if (fs.existsSync(dest) && !force) {
            skipped.push(path.relative(destDir, dest));
            continue;
        }
        fs.mkdirSync(path.dirname(dest), {recursive: true});
        fs.copyFileSync(src, dest);
        copied.push(path.relative(destDir, dest));
    }

    return {copied, skipped};
}
