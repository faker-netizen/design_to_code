import type express from "express";
import {DEFAULT_TEMPLATE_ID} from "../studio/planner/planTemplates.js";
import {invokeStudioRun} from "../studio/graph/studioOrchestratorGraph.js";
import studioProjectService from "../studio/services/studioProjectService.js";
import studioRunService from "../studio/services/studioRunService.js";
import type {SearchProfile} from "../studio/types/searchProfile.js";
import {parseRouteParamId, requireUserId} from "../utils/routeHelpers.js";
import type {SseWriter} from "../utils/sse.js";

export type ValidatedStudioRun = {
    projectId: number;
    runId: number;
    userQuery: string;
    templateId: string;
    projectKbId: number | null;
    searchProfile: SearchProfile;
};

export async function validateStudioRunRequest(
    req: express.Request,
    res: express.Response,
    userId: number
): Promise<ValidatedStudioRun | null> {
    const projectId = parseRouteParamId(req.params.id);
    if (projectId == null) {
        res.status(400).json({error: "无效的 project id"});
        return null;
    }

    const project = await studioProjectService.getOwned(userId, projectId);
    if (!project) {
        res.status(404).json({error: "Project 不存在"});
        return null;
    }

    const body = req.body as {userQuery?: string; templateId?: string};
    const userQuery = typeof body.userQuery === "string" ? body.userQuery.trim() : "";
    if (!userQuery) {
        res.status(400).json({error: "userQuery 不能为空"});
        return null;
    }

    const templateId =
        typeof body.templateId === "string" && body.templateId.trim()
            ? body.templateId.trim()
            : (project.default_template_id ?? DEFAULT_TEMPLATE_ID);

    const runId = await studioRunService.createRun(projectId, userId, userQuery);
    return {
        projectId,
        runId,
        userQuery,
        templateId,
        projectKbId: project.kb_id,
        searchProfile: project.search_profile_json,
    };
}

export async function executeStudioRunSse(params: {
    emit: SseWriter;
    signal: AbortSignal;
    validated: ValidatedStudioRun;
    userId: number;
}): Promise<void> {
    const {emit, signal, validated, userId} = params;
    emit("run_start", {runId: validated.runId, projectId: validated.projectId});

    try {
        await invokeStudioRun({
            runId: validated.runId,
            projectId: validated.projectId,
            userId,
            userQuery: validated.userQuery,
            searchProfile: validated.searchProfile,
            templateId: validated.templateId,
            projectKbId: validated.projectKbId,
            config: {emit, signal},
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Run 执行失败";
        await studioRunService.markFailed(validated.runId, message);
        emit("run_done", {runId: validated.runId, status: "failed", error: message});
    }
}

export async function handleAbortRun(req: express.Request, res: express.Response): Promise<void> {
    const userId = requireUserId(req, res);
    if (userId == null) return;

    const runId = parseRouteParamId(req.params.id);
    if (runId == null) {
        res.status(400).json({error: "无效的 run id"});
        return;
    }

    const run = await studioRunService.getOwned(userId, runId);
    if (!run) {
        res.status(404).json({error: "Run 不存在"});
        return;
    }

    await studioRunService.markAborted(runId);
    res.json({success: true});
}
