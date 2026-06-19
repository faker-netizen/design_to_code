import {tool} from "@langchain/core/tools";
import {z} from "zod";
import materialService from "../services/materialService.js";
import type {PlatformRunContext} from "../context/runContext.js";

const schema = z.object({
    url: z.string().url().describe("要抓取的 HTTP/HTTPS 地址"),
});

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 512_000;

/** HTML 去标签抽纯文本 */
function stripHtmlToText(html: string): string {
    const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    const text = noScript
        .replace(/<\/(p|div|br|li|h\d)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text;
}

function titleFromHtml(html: string): string | undefined {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return undefined;
    return m[1].replace(/\s+/g, " ").trim().slice(0, 200) || undefined;
}

/** 下载网页并提取 title + 正文 */
async function fetchPageText(url: string): Promise<{title?: string; text: string}> {
    const res = await fetch(url, {
        headers: {"User-Agent": "d2c-agent-platform/1.0"},
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`抓取失败: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const html = new TextDecoder("utf-8", {fatal: false}).decode(slice);
    return {title: titleFromHtml(html), text: stripHtmlToText(html)};
}

/** 注册 LangChain fetch_url 工具（抓取后存 material） */
export function createFetchUrlTool(ctx: PlatformRunContext) {
    return tool(
        async ({url}: z.infer<typeof schema>) => {
            const {title, text} = await fetchPageText(url);
            if (!text) throw new Error("页面无可用正文");
            const materialId = await materialService.saveMaterial(ctx.runId, {
                sourceUrl: url,
                title,
                content: text,
            });
            return JSON.stringify({materialId, title: title ?? url, chars: text.length, url});
        },
        {
            name: "fetch_url",
            description: "下载网页正文并保存为 material，返回 materialId 供 read_text 使用。",
            schema,
        }
    );
}
