import express from "express";
import {parseRouteParamId, requireUserId} from "../utils/routeHelpers.js";
import studioRunService from "../studio/services/studioRunService.js";
import studioArtifactService from "../studio/services/studioArtifactService.js";
import {getBuiltinPlanTemplates} from "../studio/planner/planTemplates.js";
import studioProjectRoutes from "./studioProjects.js";
import studioRunRoutes from "./studioRuns.js";

const router = express.Router();

router.use(studioProjectRoutes);
router.use(studioRunRoutes);

/** GET /api/studio/templates */
router.get("/templates", async (_req, res) => {
    try {
        const templates = getBuiltinPlanTemplates().map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            outputKind: t.plan.outputKind,
            stepCount: t.plan.steps.length,
        }));
        res.json({success: true, templates});
    } catch (error) {
        console.error("[studio] list templates failed:", error);
        res.status(500).json({error: "获取模板列表失败"});
    }
});

/** GET /api/studio/runs/:id */
router.get("/runs/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const runId = parseRouteParamId(req.params.id);
        if (runId == null) return res.status(400).json({error: "无效的 run id"});
        const run = await studioRunService.getOwned(userId, runId);
        if (!run) return res.status(404).json({error: "运行不存在"});
        const artifacts = await studioArtifactService.listForRun(runId);
        res.json({success: true, run, artifacts});
    } catch (error) {
        console.error("[studio] get run failed:", error);
        res.status(500).json({error: "获取运行详情失败"});
    }
});

/** GET /api/studio/runs/:id/trace */
router.get("/runs/:id/trace", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const runId = parseRouteParamId(req.params.id);
        if (runId == null) return res.status(400).json({error: "无效的 run id"});
        const run = await studioRunService.getOwned(userId, runId);
        if (!run) return res.status(404).json({error: "运行不存在"});
        const steps = await studioRunService.listSteps(runId);
        res.json({success: true, run, steps});
    } catch (error) {
        console.error("[studio] get trace failed:", error);
        res.status(500).json({error: "获取 Trace 失败"});
    }
});

/** GET /api/studio/artifacts/:id */
router.get("/artifacts/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const artifactId = parseRouteParamId(req.params.id);
        if (artifactId == null) return res.status(400).json({error: "无效的 artifact id"});
        const artifact = await studioArtifactService.getOwned(userId, artifactId);
        if (!artifact) return res.status(404).json({error: "产物不存在"});
        res.json({success: true, artifact});
    } catch (error) {
        console.error("[studio] get artifact failed:", error);
        res.status(500).json({error: "获取产物失败"});
    }
});

/** PATCH /api/studio/artifacts/:id { markdown } */
router.patch("/artifacts/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const artifactId = parseRouteParamId(req.params.id);
        if (artifactId == null) return res.status(400).json({error: "无效的 artifact id"});
        const markdown = req.body?.markdown;
        if (typeof markdown !== "string") {
            return res.status(400).json({error: "markdown 必须为字符串"});
        }
        const ok = await studioArtifactService.updateMarkdown(userId, artifactId, markdown);
        if (!ok) return res.status(404).json({error: "产物不存在"});
        res.json({success: true});
    } catch (error) {
        console.error("[studio] patch artifact failed:", error);
        res.status(500).json({error: "更新产物失败"});
    }
});

export default router;
