import type {PlanStep} from "../types/plan.js";
import type {WorkerHandoff} from "../types/handoff.js";
import type {StudioRunEmit} from "../types/state.js";
import {collectKbMaterials, persistSearchMaterials, resolveKbIds} from "./searchWorkerKb.js";

export async function runSearchAgent(params: {
    step: PlanStep;
    handoff: WorkerHandoff;
    userId: number;
    projectKbId: number | null;
    projectId: number;
    emit: StudioRunEmit;
    signal?: AbortSignal;
}): Promise<{
    reactTrace: Array<{tool: string; observation: string}>;
    savedIds: string[];
    summary: string;
}> {
    const {step, handoff, userId, projectKbId, projectId, emit, signal} = params;
    const reactTrace: Array<{tool: string; observation: string}> = [];
    const query = handoff.searchProfile.query.trim() || handoff.userQuery;
    const kbIds = resolveKbIds(handoff, projectKbId);

    emit("react_step", {stepId: step.id, tool: "kb_search", phase: "start", kbIds});
    if (!kbIds.length) {
        reactTrace.push({tool: "kb_search", observation: JSON.stringify({kbIds: [], saved: 0})});
        emit("react_step", {stepId: step.id, tool: "kb_search", phase: "done", count: 0});
        return {reactTrace, savedIds: [], summary: "未配置知识库，跳过检索"};
    }

    const materialInputs = await collectKbMaterials({
        kbIds,
        query,
        userId,
        handoff,
        projectId,
        signal,
    });
    reactTrace.push({
        tool: "kb_search",
        observation: JSON.stringify({kbIds, chunks: materialInputs.length}),
    });
    emit("react_step", {stepId: step.id, tool: "kb_search", phase: "done", count: materialInputs.length});

    await persistSearchMaterials({stepId: step.id, materialInputs, emit, reactTrace});
    const savedIds = materialInputs.map((m) => m.id);
    return {
        reactTrace,
        savedIds,
        summary: `检索完成，收集 ${materialInputs.length} 条资料片段`,
    };
}
