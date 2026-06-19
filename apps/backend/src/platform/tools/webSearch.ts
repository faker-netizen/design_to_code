import {tool} from "@langchain/core/tools";
import {z} from "zod";

const schema = z.object({
    query: z.string().describe("搜索关键词或自然语言查询"),
    maxResults: z.number().int().min(1).max(8).optional().describe("最多返回条数，默认 5"),
});

export type WebSearchHit = {title: string; url: string; snippet: string};

const FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_MAX = 5;

function decodeHtml(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/** 从 DuckDuckGo HTML 结果页解析标题与链接 */
function parseDuckDuckGoHtml(html: string, maxResults: number): WebSearchHit[] {
    const hits: WebSearchHit[] = [];
    const blockRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = blockRe.exec(html)) !== null && hits.length < maxResults) {
        const url = decodeHtml(match[1].replace(/&amp;/g, "&"));
        const title = decodeHtml(match[2].replace(/<[^>]+>/g, "").trim());
        if (!title || !url.startsWith("http")) continue;
        hits.push({title, url, snippet: ""});
    }
    return hits;
}

/** 请求 DuckDuckGo HTML 搜索接口 */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchHit[]> {
    const body = new URLSearchParams({q: query});
    const res = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "d2c-agent-platform/1.0"},
        body,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    console.log(res)
    if (!res.ok) throw new Error(`搜索请求失败: HTTP ${res.status}`);
    const html = await res.text();
    return parseDuckDuckGoHtml(html, maxResults);
}

/** web_search 薄工具实际搜索逻辑 */
export async function runWebSearch(query: string, maxResults = DEFAULT_MAX): Promise<WebSearchHit[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchDuckDuckGo(trimmed, maxResults);
}

/** 注册 LangChain web_search 工具 */
export function createWebSearchTool() {
    return tool(
        async ({query, maxResults}: z.infer<typeof schema>) => {
            const hits = await runWebSearch(query, maxResults ?? DEFAULT_MAX);
            return JSON.stringify({query, count: hits.length, results: hits});
        },
        {
            name: "web_search",
            description: "在互联网上搜索，返回标题、URL 与摘要列表。",
            schema,
        }
    );
}
