import express from "express";

import {requireUserId, parseRouteParamId} from "../utils/routeHelpers.js";

import {bindRequestAbort} from "../utils/sse.js";

import {listSkillsHandler, startPlatformRunHandler} from "./platformRunHandler.js";

import runService from "../platform/services/runService.js";



const router = express.Router();



/** GET /skills 入口：鉴权后返回内置 Skill 列表 */

function handleListSkills(req: express.Request, res: express.Response): void {

    const userId = requireUserId(req, res);

    if (userId == null) return;

    listSkillsHandler(req, res);

}



/** POST /runs 入口：鉴权、绑定客户端断开，启动 SSE Agent Run */

async function handleStartRun(req: express.Request, res: express.Response): Promise<void> {

    const userId = requireUserId(req, res);

    if (userId == null) return;

    const {signal, cleanup} = bindRequestAbort(req);

    try {

        await startPlatformRunHandler(userId, req.body ?? {}, res, signal);

    } catch (e) {

        console.error("platform run failed:", e);

        if (!res.headersSent) res.status(500).json({error: "Agent 执行失败"});

    } finally {

        cleanup();

    }

}



/** GET /runs/:id 入口：鉴权后查询单次 Run 状态与回复 */

async function handleGetRun(req: express.Request, res: express.Response): Promise<void> {

    const userId = requireUserId(req, res);

    if (userId == null) return;

    const runId = parseRouteParamId(req.params.runId);

    if (runId == null) {
        res.status(400).json({error: "无效的 run id"});
        return;
    }

    const run = await runService.getRun(userId, runId);

    if (!run) {
        res.status(404).json({error: "Run 不存在"});
        return;
    }

    res.json({

        success: true,

        run: {

            id: run.id,

            skillId: run.skill_id,

            userMessage: run.user_message,

            status: run.status,

            reply: run.reply,

            errorMessage: run.error_message,

            createdAt: run.created_at,

            finishedAt: run.finished_at,

        },

    });

}



router.get("/skills", handleListSkills);

router.post("/runs", handleStartRun);

router.get("/runs/:runId", handleGetRun);



export default router;

