import {tool} from "@langchain/core/tools";
import {z} from "zod";
import artifactService from "../services/artifactService.js";
import type {PlatformRunContext} from "../context/runContext.js";

const schema = z.object({
    title: z.string().min(1).describe("产物标题"),
    markdown: z.string().min(1).describe("Markdown 正文"),
});

/** 注册 LangChain write_artifact 工具（写 platform_artifacts） */
export function createWriteArtifactTool(ctx: PlatformRunContext) {
    return tool(
        async ({title, markdown}: z.infer<typeof schema>) => {
            const artifactId = await artifactService.saveArtifact(ctx.runId, title, markdown);
            return JSON.stringify({artifactId, title, chars: markdown.length});
        },
        {
            name: "write_artifact",
            description: "将 markdown 报告保存为 run 产物，返回 artifactId。",
            schema,
        }
    );
}
