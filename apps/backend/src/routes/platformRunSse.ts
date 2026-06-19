import type {Response} from "express";
import type {PlatformSkillDef} from "../platform/types.js";
import type {PlatformRunContext} from "../platform/context/runContext.js";
import {createSseWriter, setupSseResponse, startSseHeartbeat} from "../utils/sse.js";
import type {PlatformStepEmitter} from "../platform/types.js";

export type PlatformSseSession = {
    runId: number;
    emit: PlatformStepEmitter;
    ctx: PlatformRunContext;
    stopHeartbeat: () => void;
};

/** 初始化 SSE 响应头、心跳、run_started，构造 PlatformRunContext */
export function openPlatformSse(
    res: Response,
    input: {userId: number; runId: number; skill: PlatformSkillDef; signal: AbortSignal}
): PlatformSseSession {
    setupSseResponse(res);
    const emit = createSseWriter(res);
    const stopHeartbeat = startSseHeartbeat(res, 15_000);
    emit("run_started", {runId: input.runId, skillId: input.skill.id, skillName: input.skill.name});
    emit("status", {message: "Agent 执行中…"});
    const ctx: PlatformRunContext = {
        userId: input.userId,
        runId: input.runId,
        depth: 0,
        signal: input.signal,
        emit,
        allowedTools: input.skill.allowedTools,
    };
    return {runId: input.runId, emit, ctx, stopHeartbeat};
}

/** 停止心跳并结束 SSE 响应流 */
export function closePlatformSse(res: Response, session: PlatformSseSession): void {
    session.stopHeartbeat();
    if (!res.writableEnded) res.end();
}
