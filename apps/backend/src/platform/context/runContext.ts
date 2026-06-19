import type {PlatformStepEmitter, PlatformToolId} from "../types.js";

export const MAX_SPAWN_DEPTH = 2;
export const MATERIAL_MAX_CHARS = 48_000;
export const READ_TEXT_MAX_CHARS = 12_000;
export const TOOL_RESULT_PREVIEW = 400;

export type PlatformRunContext = {
    userId: number;
    runId: number;
    depth: number;
    signal?: AbortSignal;
    emit?: PlatformStepEmitter;
    allowedTools: readonly PlatformToolId[];
};

/** spawn_agent 时构造子 Agent 上下文（depth+1、收窄工具） */
export function childSpawnContext(parent: PlatformRunContext, tools: readonly PlatformToolId[]): PlatformRunContext {
    return {
        userId: parent.userId,
        runId: parent.runId,
        depth: parent.depth + 1,
        signal: parent.signal,
        emit: parent.emit,
        allowedTools: tools,
    };
}
