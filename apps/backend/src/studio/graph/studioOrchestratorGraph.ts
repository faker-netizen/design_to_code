import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import {topoSortPlanSteps, type Plan, type PlanStep} from "../types/plan.js";
import type {SearchProfile} from "../types/searchProfile.js";
import type {StepOutput, WorkerHandoff} from "../types/handoff.js";
import type {MaterialMeta, StudioArtifactDraft, StudioOrchestratorConfig} from "../types/state.js";
import {DEFAULT_TEMPLATE_ID} from "../planner/planTemplates.js";
import {resolvePlan} from "../planner/plannerAgent.js";
import studioRunService from "../services/studioRunService.js";
import studioMaterialService from "../services/studioMaterialService.js";
import {studioLog} from "../log.js";
import {dispatchStudioStep} from "./studioStepDispatcher.js";
import {finalizeStudioRun} from "./studioRunFinalize.js";
import {getStudioCheckpointer, studioThreadId} from "./studioCheckpointer.js";

const replace = <T,>(_left: T, right: T): T => right;

const mergeStepOutputs = (
    left: Record<string, StepOutput>,
    right: Record<string, StepOutput>
): Record<string, StepOutput> => ({...left, ...right});

const mergeCompleted = (left: string[], right: string[]): string[] => [...new Set([...left, ...right])];

const mergeMaterials = (left: MaterialMeta[], right: MaterialMeta[]): MaterialMeta[] => {
    const map = new Map(left.map((m) => [m.id, m]));
    for (const m of right) map.set(m.id, m);
    return [...map.values()];
};

const StudioAnnotation = Annotation.Root({
    runId: Annotation<number>(),
    projectId: Annotation<number>(),
    userId: Annotation<number>(),
    userQuery: Annotation<string>(),
    searchProfile: Annotation<SearchProfile>(),
    templateId: Annotation<string>(),
    projectKbId: Annotation<number | null>({reducer: replace, default: () => null}),
    plan: Annotation<Plan | null>({reducer: replace, default: () => null}),
    completedStepIds: Annotation<string[]>({reducer: mergeCompleted, default: () => []}),
    stepOutputs: Annotation<Record<string, StepOutput>>({reducer: mergeStepOutputs, default: () => ({})}),
    materialIndex: Annotation<MaterialMeta[]>({reducer: mergeMaterials, default: () => []}),
    artifacts: Annotation<StudioArtifactDraft[]>({
        reducer: (left, right) => [...left, ...right],
        default: () => [],
    }),
    error: Annotation<string | null>({reducer: replace, default: () => null}),
});

type GraphState = typeof StudioAnnotation.State;

type RuntimeConfig = StudioOrchestratorConfig & {projectKbId: number | null};

function getRuntime(config: {configurable?: Record<string, unknown>}): RuntimeConfig {
    const cfg = config.configurable ?? {};
    if (!cfg.emit || typeof cfg.emit !== "function") {
        throw new Error("Studio orchestrator 缺少 emit");
    }
    return cfg as RuntimeConfig;
}

function buildPriorSummary(stepOutputs: Record<string, StepOutput>, dependsOn: string[]): string {
    return dependsOn
        .map((id) => stepOutputs[id]?.summary)
        .filter(Boolean)
        .join("\n");
}

function buildHandoff(state: GraphState, step: PlanStep): WorkerHandoff {
    const priorMaterialIds = step.dependsOn.flatMap((id) => state.stepOutputs[id]?.materialIds ?? []);
    const priorArtifactRefs = step.dependsOn.flatMap((id) => state.stepOutputs[id]?.artifactRefs ?? []);
    return {
        runId: state.runId,
        stepId: step.id,
        goal: step.goal,
        userQuery: state.userQuery,
        searchProfile: state.searchProfile,
        priorSummary: buildPriorSummary(state.stepOutputs, step.dependsOn),
        materialIds: [...new Set(priorMaterialIds)],
        artifactRefs: [...new Set(priorArtifactRefs)],
    };
}

function pickNextStep(state: GraphState): PlanStep | null {
    if (!state.plan) return null;
    const sorted = topoSortPlanSteps(state.plan.steps);
    return (
        sorted.find(
            (s) =>
                !state.completedStepIds.includes(s.id) &&
                s.dependsOn.every((d) => state.completedStepIds.includes(d))
        ) ?? null
    );
}

async function injectPlanNode(
    state: GraphState,
    config: {configurable?: Record<string, unknown>}
): Promise<Partial<GraphState>> {
    const runtime = getRuntime(config);
    const templateId = state.templateId || DEFAULT_TEMPLATE_ID;
    const materialMeta = await studioMaterialService.listMetaForRun(state.runId);
    const plan = await resolvePlan({
        templateId,
        userQuery: state.userQuery,
        searchProfile: state.searchProfile,
        materialTitles: materialMeta.map((m) => m.title),
        completedStepNames: state.completedStepIds,
        forceTemplate: runtime.forceTemplate,
    });
    studioLog("plan_ready", {runId: state.runId, templateId, stepCount: plan.steps.length});
    runtime.emit("plan_ready", {runId: state.runId, templateId, plan});
    await studioRunService.markRunning(state.runId, plan);
    return {plan};
}

async function executeNextStepNode(
    state: GraphState,
    config: {configurable?: Record<string, unknown>}
): Promise<Partial<GraphState>> {
    const runtime = getRuntime(config);
    const step = pickNextStep(state);
    if (!step) return {};

    const result = await dispatchStudioStep({
        state: {
            runId: state.runId,
            projectId: state.projectId,
            userId: state.userId,
            projectKbId: state.projectKbId,
        },
        step,
        handoff: buildHandoff(state, step),
        emit: runtime.emit,
        signal: runtime.signal,
    });

    if (result.error) {
        return {error: result.error};
    }

    return {
        completedStepIds: result.completedStepIds,
        stepOutputs: result.stepOutputs,
        materialIndex: result.materialIndex ?? [],
        artifacts: result.artifacts ?? [],
    };
}

async function synthesizeNode(
    state: GraphState,
    config: {configurable?: Record<string, unknown>}
): Promise<Partial<GraphState>> {
    const runtime = getRuntime(config);
    await finalizeStudioRun({
        runId: state.runId,
        artifacts: state.artifacts,
        error: state.error,
        config: runtime,
    });
    return {};
}

function routeAfterStep(state: GraphState): "continue" | "synthesize" {
    if (state.error) return "synthesize";
    return pickNextStep(state) ? "continue" : "synthesize";
}

function routeAfterPlan(state: GraphState): "execute" | "synthesize" {
    return state.plan?.steps.length ? "execute" : "synthesize";
}

let compiled: ReturnType<typeof buildGraph> | null = null;

function buildGraph() {
    return new StateGraph(StudioAnnotation)
        .addNode("inject_plan", injectPlanNode)
        .addNode("execute_step", executeNextStepNode)
        .addNode("synthesize", synthesizeNode)
        .addEdge(START, "inject_plan")
        .addConditionalEdges("inject_plan", routeAfterPlan, {execute: "execute_step", synthesize: "synthesize"})
        .addConditionalEdges("execute_step", routeAfterStep, {continue: "execute_step", synthesize: "synthesize"})
        .addEdge("synthesize", END)
        .compile({checkpointer: getStudioCheckpointer()});
}

export function getStudioOrchestratorGraph() {
    if (!compiled) compiled = buildGraph();
    return compiled;
}

export type StudioRunInput = {
    runId: number;
    projectId: number;
    userId: number;
    userQuery: string;
    searchProfile: SearchProfile;
    templateId: string;
    projectKbId: number | null;
    config: StudioOrchestratorConfig;
};

export async function invokeStudioRun(input: StudioRunInput): Promise<GraphState> {
    const graph = getStudioOrchestratorGraph();
    const initial: GraphState = {
        runId: input.runId,
        projectId: input.projectId,
        userId: input.userId,
        userQuery: input.userQuery,
        searchProfile: input.searchProfile,
        templateId: input.templateId,
        projectKbId: input.projectKbId,
        plan: null,
        completedStepIds: [],
        stepOutputs: {},
        materialIndex: [],
        artifacts: [],
        error: null,
    };

    return (await graph.invoke(initial, {
        recursionLimit: 32,
        signal: input.config.signal,
        configurable: {...input.config, projectKbId: input.projectKbId, thread_id: studioThreadId(input.runId)},
    })) as GraphState;
}
