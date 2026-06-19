import {z} from "zod";

export const PlanWorkerSchema = z.enum(["search", "summarize", "video_script", "chat", "critic"]);

export const PlanStepSchema = z.object({
    id: z.string().min(1),
    worker: PlanWorkerSchema,
    goal: z.string(),
    dependsOn: z.array(z.string()),
    inputs: z.record(z.string()).optional(),
    parallelGroup: z.string().optional(),
    maxReActSteps: z.number().int().positive().optional(),
    onError: z.enum(["abort", "continue"]).optional(),
});

export const PlanSchema = z.object({
    version: z.literal(1),
    outputKind: z.enum(["chat", "summary", "video_script", "report"]),
    steps: z.array(PlanStepSchema).min(1),
    plannerNotes: z.string().optional(),
});

export type PlanWorker = z.infer<typeof PlanWorkerSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export function parsePlan(raw: unknown): Plan {
    return PlanSchema.parse(raw);
}

/** 拓扑排序；循环依赖时抛错 */
export function topoSortPlanSteps(steps: PlanStep[]): PlanStep[] {
    const byId = new Map(steps.map((s) => [s.id, s]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: PlanStep[] = [];

    function visit(id: string): void {
        if (visited.has(id)) return;
        if (visiting.has(id)) {
            throw new Error(`Plan 存在循环依赖: ${id}`);
        }
        const step = byId.get(id);
        if (!step) throw new Error(`Plan 步骤缺失: ${id}`);
        visiting.add(id);
        for (const dep of step.dependsOn) visit(dep);
        visiting.delete(id);
        visited.add(id);
        result.push(step);
    }

    for (const step of steps) visit(step.id);
    return result;
}
