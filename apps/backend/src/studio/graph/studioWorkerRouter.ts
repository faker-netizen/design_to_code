import type {PlanStep} from "../types/plan.js";
import type {StepOutput, WorkerHandoff} from "../types/handoff.js";
import type {MaterialMeta, StudioArtifactDraft, StudioRunEmit} from "../types/state.js";
import {runSearchWorker} from "../workers/searchWorker.js";
import {runSummarizeWorker} from "../workers/summarizeWorker.js";
import {runChatWorker} from "../workers/chatWorker.js";
import {runVideoScriptWorker} from "../workers/videoScriptWorker.js";

export type WorkerRunResult = {
    output: StepOutput;
    reactTrace: Array<{tool: string; observation: string}>;
    materialIndex?: MaterialMeta[];
    artifacts?: StudioArtifactDraft[];
};

type WorkerParams = {
    state: {
        runId: number;
        projectId: number;
        userId: number;
        projectKbId: number | null;
    };
    step: PlanStep;
    handoff: WorkerHandoff;
    emit: StudioRunEmit;
    signal?: AbortSignal;
};

function artifactResult(result: {
    output: StepOutput;
    reactTrace: Array<{tool: string; observation: string}>;
    artifact: StudioArtifactDraft;
}): WorkerRunResult {
    return {
        output: result.output,
        reactTrace: result.reactTrace,
        artifacts: [result.artifact],
    };
}

async function dispatchWorker(params: WorkerParams): Promise<WorkerRunResult> {
    const {state, step, handoff, emit, signal} = params;
    switch (step.worker) {
        case "search": {
            const result = await runSearchWorker({...state, step, handoff, emit, signal});
            return {output: result.output, reactTrace: result.reactTrace};
        }
        case "summarize":
            return artifactResult(await runSummarizeWorker({step, handoff, emit, signal}));
        case "chat":
            return artifactResult(await runChatWorker({step, handoff, emit, signal}));
        case "video_script":
            return artifactResult(await runVideoScriptWorker({step, handoff, emit, signal}));
        case "critic":
            return {
                output: {
                    summary: "Critic worker 暂未实现，已跳过",
                    materialIds: handoff.materialIds,
                    artifactRefs: [],
                },
                reactTrace: [{tool: "critic_stub", observation: "skipped"}],
            };
        default:
            throw new Error(`未知 worker: ${String(step.worker)}`);
    }
}

export async function runWorkerByKind(params: WorkerParams): Promise<WorkerRunResult> {
    return dispatchWorker(params);
}
