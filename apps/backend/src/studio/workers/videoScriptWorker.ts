import type {WorkerHandoff, StepOutput} from "../types/handoff.js";
import type {PlanStep} from "../types/plan.js";
import type {StudioArtifactDraft, StudioRunEmit} from "../types/state.js";
import studioMaterialService from "../services/studioMaterialService.js";
import {summarizeMaterialsMarkdown} from "./summarizeLlm.js";

export async function runVideoScriptWorker(params: {
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
    emit("react_step", {stepId: step.id, tool: "llm_script", phase: "start"});

    const script = await summarizeMaterialsMarkdown({
        userQuery: `${handoff.userQuery}\n\n请输出短视频分镜脚本（Markdown，含镜头/旁白/画面）`,
        materials,
        priorSummary: handoff.priorSummary,
        mode: "direct",
    });
    emit("react_step", {stepId: step.id, tool: "llm_script", phase: "done"});

    const artifact: StudioArtifactDraft = {
        kind: "video_script",
        contentJson: {format: "markdown"},
        markdown: script.markdown,
    };
    return {
        output: {
            summary: "已生成短视频脚本",
            materialIds,
            artifactRefs: [],
        },
        artifact,
        reactTrace: [{tool: "llm_script", observation: JSON.stringify({materialCount: materials.length})}],
    };
}
