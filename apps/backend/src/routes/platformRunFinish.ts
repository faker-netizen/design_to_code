import type {PlatformAgentResult} from "../platform/types.js";
import runService from "../platform/services/runService.js";
import type {PlatformStepEmitter} from "../platform/types.js";

/** 按 stoppedReason 更新 Run 状态并推送 done / error SSE */
export async function finishPlatformRun(
    runId: number,
    result: PlatformAgentResult,
    emit: PlatformStepEmitter
): Promise<void> {
    if (result.stoppedReason === "aborted") {
        await runService.finishRun(runId, "aborted", result.reply || null);
        emit("error", {message: "已取消"});
        return;
    }
    if (result.stoppedReason === "error") {
        await runService.finishRun(runId, "failed", null, result.error ?? "执行失败");
        emit("error", {message: result.error ?? "执行失败"});
        return;
    }
    if (result.stoppedReason === "max_steps") {
        await runService.finishRun(runId, "failed", result.reply || null, "超过最大步数");
        emit("error", {message: "超过最大步数"});
        return;
    }
    await runService.finishRun(runId, "completed", result.reply);
    emit("done", {reply: result.reply, runId});
}

/** 未捕获异常时标记 Run 失败并推送 error SSE */
export function failPlatformRunResponse(runId: number, msg: string, emit: PlatformStepEmitter): void {
    void runService.finishRun(runId, "failed", null, msg);
    emit("error", {message: msg});
}
