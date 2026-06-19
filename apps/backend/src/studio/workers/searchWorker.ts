import type {WorkerHandoff, StepOutput} from "../types/handoff.js";
import type {PlanStep} from "../types/plan.js";
import type {StudioRunEmit} from "../types/state.js";
import studioMaterialService from "../services/studioMaterialService.js";
import {runSearchAgent} from "./searchWorkerAgent.js";

export type SearchWorkerResult = {
    output: StepOutput;
    reactTrace: Array<{tool: string; observation: string}>;
};

export async function runSearchWorker(params: {
    step: PlanStep;
    handoff: WorkerHandoff;
    userId: number;
    projectKbId: number | null;
    projectId: number;
    emit: StudioRunEmit;
    signal?: AbortSignal;
}): Promise<SearchWorkerResult> {
    const {handoff, signal} = params;
    if (signal?.aborted) throw new Error("Run 已中止");

    const {reactTrace, savedIds, summary} = await runSearchAgent(params);
    const allMeta = await studioMaterialService.listMetaForRun(handoff.runId);
    const materialIds = allMeta.map((m) => m.id);

    return {
        output: {summary, materialIds: savedIds.length ? [...new Set([...handoff.materialIds, ...savedIds])] : materialIds, artifactRefs: []},
        reactTrace,
    };
}
