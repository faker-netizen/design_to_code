import express from "express";
import {parseRouteParamId, requireUserId} from "../utils/routeHelpers.js";
import studioProjectService from "../studio/services/studioProjectService.js";
import studioRunService from "../studio/services/studioRunService.js";
import {parseSearchProfile} from "../studio/types/searchProfile.js";

const router = express.Router();

/** GET /api/studio/projects */
router.get("/projects", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projects = await studioProjectService.listForUser(userId);
        res.json({success: true, projects});
    } catch (error) {
        console.error("[studio] list projects failed:", error);
        res.status(500).json({error: "获取项目列表失败"});
    }
});

/** POST /api/studio/projects */
router.post("/projects", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const name = req.body?.name;
        if (!name || typeof name !== "string") {
            return res.status(400).json({error: "name 不能为空"});
        }
        const id = await studioProjectService.create(userId, {
            name,
            description: typeof req.body?.description === "string" ? req.body.description : undefined,
            kbId: typeof req.body?.kbId === "number" ? req.body.kbId : undefined,
            templateId: typeof req.body?.templateId === "string" ? req.body.templateId : undefined,
        });
        res.status(201).json({success: true, id});
    } catch (error) {
        console.error("[studio] create project failed:", error);
        res.status(500).json({error: "创建项目失败"});
    }
});

/** GET /api/studio/projects/:id */
router.get("/projects/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projectId = parseRouteParamId(req.params.id);
        if (projectId == null) return res.status(400).json({error: "无效的项目 id"});
        const project = await studioProjectService.getOwned(userId, projectId);
        if (!project) return res.status(404).json({error: "项目不存在"});
        res.json({success: true, project});
    } catch (error) {
        console.error("[studio] get project failed:", error);
        res.status(500).json({error: "获取项目失败"});
    }
});

/** PUT /api/studio/projects/:id */
router.put("/projects/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projectId = parseRouteParamId(req.params.id);
        if (projectId == null) return res.status(400).json({error: "无效的项目 id"});
        const ok = await studioProjectService.update(userId, projectId, {
            name: typeof req.body?.name === "string" ? req.body.name : undefined,
            description: typeof req.body?.description === "string" ? req.body.description : undefined,
            defaultTemplateId:
                typeof req.body?.defaultTemplateId === "string" ? req.body.defaultTemplateId : undefined,
            kbId: req.body?.kbId === null ? null : typeof req.body?.kbId === "number" ? req.body.kbId : undefined,
        });
        if (!ok) return res.status(404).json({error: "项目不存在"});
        res.json({success: true});
    } catch (error) {
        console.error("[studio] update project failed:", error);
        res.status(500).json({error: "更新项目失败"});
    }
});

/** DELETE /api/studio/projects/:id */
router.delete("/projects/:id", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projectId = parseRouteParamId(req.params.id);
        if (projectId == null) return res.status(400).json({error: "无效的项目 id"});
        const ok = await studioProjectService.delete(userId, projectId);
        if (!ok) return res.status(404).json({error: "项目不存在"});
        res.json({success: true});
    } catch (error) {
        console.error("[studio] delete project failed:", error);
        res.status(500).json({error: "删除项目失败"});
    }
});

/** PUT /api/studio/projects/:id/search-profile */
router.put("/projects/:id/search-profile", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projectId = parseRouteParamId(req.params.id);
        if (projectId == null) return res.status(400).json({error: "无效的项目 id"});
        const profile = parseSearchProfile(req.body);
        const ok = await studioProjectService.updateSearchProfile(userId, projectId, profile);
        if (!ok) return res.status(404).json({error: "项目不存在"});
        res.json({success: true, searchProfile: profile});
    } catch (error) {
        console.error("[studio] update search profile failed:", error);
        const message = error instanceof Error ? error.message : "更新搜索配置失败";
        res.status(400).json({error: message});
    }
});

/** GET /api/studio/projects/:id/runs */
router.get("/projects/:id/runs", async (req, res) => {
    try {
        const userId = requireUserId(req, res);
        if (userId == null) return;
        const projectId = parseRouteParamId(req.params.id);
        if (projectId == null) return res.status(400).json({error: "无效的项目 id"});
        const project = await studioProjectService.getOwned(userId, projectId);
        if (!project) return res.status(404).json({error: "项目不存在"});
        const runs = await studioRunService.listForProject(userId, projectId);
        res.json({success: true, runs});
    } catch (error) {
        console.error("[studio] list runs failed:", error);
        res.status(500).json({error: "获取运行列表失败"});
    }
});

export default router;
