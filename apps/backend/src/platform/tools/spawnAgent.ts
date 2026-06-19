import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {childSpawnContext, MAX_SPAWN_DEPTH, type PlatformRunContext} from "../context/runContext.js";
import type {PlatformToolId} from "../types.js";
import {getPlatformSkillById} from "../skills/registry.js";

const schema = z.object({
    task: z.string().min(1).describe("子 Agent 要完成的清晰任务"),
    skillId: z.string().optional().describe("子 Skill id，默认 general-assistant"),
    tools: z.array(z.string()).optional().describe("覆盖工具白名单"),
    maxSteps: z.number().int().min(1).max(12).optional(),
});

/** 解析子 Agent 可用工具（受父级白名单约束） */
function resolveSpawnTools(
    ctx: PlatformRunContext,
    skillId: string | undefined,
    toolsOverride?: string[]
): readonly PlatformToolId[] {
    if (toolsOverride?.length) {
        return toolsOverride.filter((t): t is PlatformToolId =>
            ctx.allowedTools.includes(t as PlatformToolId)
        );
    }
    const skill = getPlatformSkillById(skillId ?? "general-assistant");
    const allowed = skill?.allowedTools ?? ["read_text", "write_artifact"];
    return allowed.filter((t) => ctx.allowedTools.includes(t));
}

/** 注册 LangChain spawn_agent 工具（递归调 runPlatformAgent） */
export function createSpawnAgentTool(ctx: PlatformRunContext) {
    return tool(
        async ({task, skillId, tools, maxSteps}: z.infer<typeof schema>) => {
            if (ctx.depth >= MAX_SPAWN_DEPTH) {
                return JSON.stringify({error: "spawn 深度已达上限", maxDepth: MAX_SPAWN_DEPTH});
            }
            const spawnTools = resolveSpawnTools(ctx, skillId, tools);
            const childCtx = childSpawnContext(ctx, spawnTools);
            const {runPlatformAgent} = await import("../agent/executor.js");
            const result = await runPlatformAgent({
                userMessage: task,
                skillId: skillId ?? "general-assistant",
                toolsOverride: [...spawnTools],
                maxSteps,
                ctx: childCtx,
            });
            return JSON.stringify({
                reply: result.reply,
                stoppedReason: result.stoppedReason,
                stepCount: result.steps.length,
                error: result.error,
            });
        },
        {
            name: "spawn_agent",
            description: "启动子 Agent 执行子任务，返回子 Agent 的回复摘要。",
            schema,
        }
    );
}
