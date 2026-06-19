import studioRunService from "../services/studioRunService.js";
import {runWorkerByKind} from "./studioWorkerRouter.js";
import type {PlanStep} from "../types/plan.js";
import type {WorkerHandoff, StepOutput} from "../types/handoff.js";
import type {MaterialMeta, StudioArtifactDraft, StudioRunEmit} from "../types/state.js";

export type StepExecutionResult = {
    completedStepIds: string[];
    stepOutputs: Record<string, StepOutput>;
    materialIndex?: MaterialMeta[];
    artifacts?: StudioArtifactDraft[];
    error?: string;
};

export async function dispatchStudioStep(params: {
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
}): Promise<StepExecutionResult> {
    const {state, step, handoff, emit, signal} = params;
    const started = Date.now();
    emit("step_start", {runId: state.runId, stepId: step.id, worker: step.worker, goal: step.goal});

    await studioRunService.upsertStep(state.runId, step.id, step.worker, {
        status: "running",
        handoffJson: handoff as unknown as Record<string, unknown>,
    });

    try {
        const result = await runWorkerByKind({state, step, handoff, emit, signal});
        return succeedStep({state, step, handoff, emit, started, result});
    } catch (err) {
        return failStep({state, step, emit, started, err});
    }
}

async function succeedStep(params: {
    state: {runId: number};
    step: PlanStep;
    handoff: WorkerHandoff;
    emit: StudioRunEmit;
    started: number;
    result: Awaited<ReturnType<typeof runWorkerByKind>>;
}): Promise<StepExecutionResult> {
    const {state, step, handoff, emit, started, result} = params;
    const durationMs = Date.now() - started;
    await studioRunService.upsertStep(state.runId, step.id, step.worker, {
        status: "completed",
        handoffJson: handoff as unknown as Record<string, unknown>,
        reactTraceJson: result.reactTrace,
        stepSummary: result.output.summary,
        durationMs,
    });
    emit("step_done", {
        runId: state.runId,
        stepId: step.id,
        worker: step.worker,
        summary: result.output.summary,
        durationMs,
    });
    return {
        completedStepIds: [step.id],
        stepOutputs: {[step.id]: result.output},
        materialIndex: result.materialIndex,
        artifacts: result.artifacts,
    };
}

async function failStep(params: {
    state: {runId: number};
    step: PlanStep;
    emit: StudioRunEmit;
    started: number;
    err: unknown;
}): Promise<StepExecutionResult> {
    const {state, step, emit, started, err} = params;
    const message = err instanceof Error ? err.message : "步骤执行失败";
    await studioRunService.upsertStep(state.runId, step.id, step.worker, {
        status: "failed",
        stepSummary: message,
        durationMs: Date.now() - started,
    });
    emit("step_done", {runId: state.runId, stepId: step.id, worker: step.worker, error: message});
    return {completedStepIds: [], stepOutputs: {}, error: message};
}

