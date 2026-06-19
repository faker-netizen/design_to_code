import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 包根目录（含 templates/） */
export function packageRoot(): string {
    return path.resolve(__dirname, "..");
}

export function templatesDir(): string {
    return path.join(packageRoot(), "templates");
}

export function templatePath(...segments: string[]): string {
    return path.join(templatesDir(), ...segments);
}
