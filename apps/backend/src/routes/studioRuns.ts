import express from "express";
import {
    bindRequestAbort,
    createSseWriter,
    setupSseResponse,
    startSseHeartbeat,
} from "../utils/sse.js";
import {SSE_HEARTBEAT_INTERVAL_MS} from "../services/serviceConstants.js";
import {requireUserId} from "../utils/routeHelpers.js";
import {
    executeStudioRunSse,
    handleAbortRun,
    validateStudioRunRequest,
} from "./studioRunHandler.js";

const router = express.Router();

/** POST /api/studio/projects/:id/runs — SSE */
router.post("/projects/:id/runs", async (req, res) => {
    const userId = requireUserId(req, res);
    if (userId == null) return;

    const validated = await validateStudioRunRequest(req, res, userId);
    if (!validated) return;

    setupSseResponse(res);
    const emit = createSseWriter(res);
    const {signal, cleanup: abortCleanup} = bindRequestAbort(req);
    const stopHeartbeat = startSseHeartbeat(res, SSE_HEARTBEAT_INTERVAL_MS);

    try {
        await executeStudioRunSse({emit, signal, validated, userId});
    } finally {
        stopHeartbeat();
        abortCleanup();
        if (!res.writableEnded) res.end();
    }
});

/** POST /api/studio/runs/:id/abort */
router.post("/runs/:id/abort", (req, res) => {
    void handleAbortRun(req, res);
});

export default router;
