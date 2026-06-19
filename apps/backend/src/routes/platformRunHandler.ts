import type {Response} from "express";
import {assertPlatformSkillId, getPlatformSkillById, listPlatformSkills} from "../platform/skills/registry.js";
import {runPlatformAgent} from "../platform/agent/executor.js";
import runService from "../platform/services/runService.js";
import {closePlatformSse, openPlatformSse} from "./platformRunSse.js";
import {failPlatformRunResponse, finishPlatformRun} from "./platformRunFinish.js";

/** 序列化内置 Skill 列表为 JSON 响应 */
export function listSkillsHandler(_req: unknown, res: Response): void {
    const skills = listPlatformSkills().map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        allowedTools: s.allowedTools,
    }));
    res.json({success: true, skills});
}

type StartRunBody = {
    skillId?: string;
    message?: string;
    maxSteps?: number;
};

/** 校验 POST body：skillId、message、可选 maxSteps */
function parseStartRunBody(body: StartRunBody): {message: string; skillId: string; maxSteps?: number} | {error: string} {
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const skillIdRaw = typeof body.skillId === "string" ? body.skillId.trim() : "";
    if (!message) return {error: "message 不能为空"};
    if (!skillIdRaw) return {error: "skillId 不能为空"};
    try {
        assertPlatformSkillId(skillIdRaw);
    } catch {
        return {error: `未知 Skill: ${skillIdRaw}`};
    }
    const maxSteps =
        typeof body.maxSteps === "number" && Number.isFinite(body.maxSteps)
            ? Math.floor(body.maxSteps)
            : undefined;
    return {message, skillId: skillIdRaw, maxSteps};
}

/** POST /runs 主流程：建 Run → 开 SSE → 调 Executor → 收尾 */
export async function startPlatformRunHandler(
    userId: number,
    body: StartRunBody,
    res: Response,
    signal: AbortSignal
): Promise<void> {
    const parsed = parseStartRunBody(body);
    if ("error" in parsed) {
        res.status(400).json({error: parsed.error});
        return;
    }
    console.log(parsed)
    const skill = getPlatformSkillById(parsed.skillId);
    if (!skill) {
        res.status(400).json({error: "Skill 不存在"});
        return;
    }
    const runId = await runService.createRun(userId, parsed.skillId, parsed.message);
    const session = openPlatformSse(res, {userId, runId, skill, signal});
    try {
        const result = await runPlatformAgent({
            userMessage: parsed.message,
            skillId: parsed.skillId,
            maxSteps: parsed.maxSteps,
            ctx: session.ctx,
        });
        await finishPlatformRun(runId, result, session.emit);
    } catch (e) {
        const msg = e instanceof Error ? e.message : "执行失败";
        failPlatformRunResponse(runId, msg, session.emit);
    } finally {
        closePlatformSse(res, session);
    }
}
