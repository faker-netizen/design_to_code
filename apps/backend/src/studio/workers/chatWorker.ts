import {summarizeMaterialsMarkdown} from "./summarizeLlm.js";
import type {WorkerHandoff, StepOutput} from "../types/handoff.js";
import type {PlanStep} from "../types/plan.js";
import type {StudioArtifactDraft, StudioRunEmit} from "../types/state.js";
import studioMaterialService from "../services/studioMaterialService.js";

export async function runChatWorker(params: {
    step: PlanStep;
    handoff: WorkerHandoff;
    emit: StudioRunEmit;
    signal?: AbortSignal;
}): Promise<{
    output: StepOutput;
    artifact: StudioArtifactDraft;
    reactTrace: Array<{tool: string; observation: string}>;
}> {
    const {step, handoff, emit, signal} = params;
    if (signal?.aborted) throw new Error("Run 已中止");

    const materialIds = handoff.materialIds.length
        ? handoff.materialIds
        : (await studioMaterialService.listMetaForRun(handoff.runId)).map((m) => m.id);
    const materials = await studioMaterialService.loadByIds(materialIds);
    emit("react_step", {stepId: step.id, tool: "llm_chat", phase: "start"});

    const answer = await summarizeMaterialsMarkdown({
        userQuery: handoff.userQuery,
        materials,
        priorSummary: handoff.priorSummary,
        mode: "direct",
    });
    emit("react_step", {stepId: step.id, tool: "llm_chat", phase: "done"});

    const artifact: StudioArtifactDraft = {
        kind: "chat_transcript",
        contentJson: {question: handoff.userQuery},
        markdown: answer.markdown,
    };
    return {
        output: {
            summary: "已生成对话回答",
            materialIds,
            artifactRefs: [],
        },
        artifact,
        reactTrace: [{tool: "llm_chat", observation: JSON.stringify({materialCount: materials.length})}],
    };
}
