import {tool} from "@langchain/core/tools";
import {z} from "zod";
import materialService from "../services/materialService.js";
import type {PlatformRunContext} from "../context/runContext.js";

const schema = z.object({
    materialId: z.number().int().positive().describe("fetch_url 返回的材料 id"),
});

/** 注册 LangChain read_text 工具（读 platform_materials） */
export function createReadTextTool(ctx: PlatformRunContext) {
    return tool(
        async ({materialId}: z.infer<typeof schema>) => {
            const text = await materialService.readMaterialText(ctx.runId, materialId);
            if (text == null) return JSON.stringify({error: "材料不存在", materialId});
            return text;
        },
        {
            name: "read_text",
            description: "读取已保存材料的正文（可能截断）。",
            schema,
        }
    );
}
