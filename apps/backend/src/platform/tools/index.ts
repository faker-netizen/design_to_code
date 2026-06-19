import type {StructuredToolInterface} from "@langchain/core/tools";
import type {PlatformRunContext} from "../context/runContext.js";
import type {PlatformToolId} from "../types.js";
import {createWebSearchTool} from "./webSearch.js";
import {createFetchUrlTool} from "./urlFetch.js";
import {createReadTextTool} from "./readText.js";
import {createWriteArtifactTool} from "./writeArtifact.js";
import {createSpawnAgentTool} from "./spawnAgent.js";

const BUILDERS: Record<
    PlatformToolId,
    (ctx: PlatformRunContext) => StructuredToolInterface
> = {
    web_search: () => createWebSearchTool(),
    fetch_url: (ctx) => createFetchUrlTool(ctx),
    read_text: (ctx) => createReadTextTool(ctx),
    write_artifact: (ctx) => createWriteArtifactTool(ctx),
    spawn_agent: (ctx) => createSpawnAgentTool(ctx),
};

/** 按 Skill 白名单实例化 LangChain 薄工具列表 */
export function resolvePlatformTools(
    ctx: PlatformRunContext,
    toolIds: readonly PlatformToolId[]
): StructuredToolInterface[] {
    return toolIds.map((id) => BUILDERS[id](ctx));
}
