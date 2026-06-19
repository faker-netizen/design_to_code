import studioMaterialService from "../services/studioMaterialService.js";
import {selectContextStrategy, shouldUseMapReduce} from "../context/selectContextStrategy.js";
import type {WorkerHandoff, StepOutput} from "../types/handoff.js";
import type {PlanStep} from "../types/plan.js";
import type {StudioArtifactDraft, StudioRunEmit} from "../types/state.js";
import {runMapReduceSummarize} from "./summarizeMapReduce.js";
import {runDirectSummarize} from "./summarizeDirect.js";

export type SummarizeWorkerResult = {
    output: StepOutput;
    artifact: StudioArtifactDraft;
    reactTrace: Array<{tool: string; observation: string}>;
};

export async function runSummarizeWorker(params: {
    step: PlanStep;
    handoff: WorkerHandoff;
    emit: StudioRunEmit;
    signal?: AbortSignal;
}): Promise<SummarizeWorkerResult> {
    const {step, handoff, emit, signal} = params;
    if (signal?.aborted) throw new Error("Run 已中止");

    const materialIds = handoff.materialIds.length
        ? handoff.materialIds
        : (await studioMaterialService.listMetaForRun(handoff.runId)).map((m) => m.id);

    emit("react_step", {stepId: step.id, tool: "list_materials", phase: "start", count: materialIds.length});
    const materials = await studioMaterialService.loadByIds(materialIds);
    const totalChars = materials.reduce((n, m) => n + m.content.length, 0);
    const reactTrace: Array<{tool: string; observation: string}> = [
        {tool: "list_materials", observation: JSON.stringify({count: materials.length, totalChars})},
    ];
    emit("react_step", {stepId: step.id, tool: "list_materials", phase: "done", count: materials.length});

    const strategy = selectContextStrategy({
        searchProfile: handoff.searchProfile,
        materialCount: materials.length,
        totalChars,
    });
    emit("react_step", {stepId: step.id, tool: "context_strategy", phase: "done", strategy});

    const useMapReduce = shouldUseMapReduce(strategy, materials.length);
    emit("react_step", {stepId: step.id, tool: "llm_structured", phase: "start", mode: useMapReduce ? "map_reduce" : strategy});

    const summaryResult = useMapReduce
        ? await runMapReduceSummarize({userQuery: handoff.userQuery, materials, priorSummary: handoff.priorSummary})
        : await runDirectSummarize({userQuery: handoff.userQuery, materials, priorSummary: handoff.priorSummary});

    emit("react_step", {stepId: step.id, tool: "llm_structured", phase: "done", mode: useMapReduce ? "map_reduce" : strategy});

    const artifact: StudioArtifactDraft = {
        kind: "summary",
        contentJson: summaryResult.contentJson,
        markdown: summaryResult.markdown,
    };

    return {
        output: {
            summary: `已生成摘要（${useMapReduce ? "map_reduce" : strategy}），共 ${materials.length} 条资料。`,
            materialIds,
            artifactRefs: [],
        },
        artifact,
        reactTrace,
    };
}
