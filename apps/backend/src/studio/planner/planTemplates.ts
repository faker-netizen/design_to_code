import type {Plan} from "../types/plan.js";
import type {SearchProfile} from "../types/searchProfile.js";

export type PlanTemplate = {
    id: string;
    name: string;
    description: string;
    plan: Plan;
    defaultSearchProfile?: Partial<SearchProfile>;
};

export const TPL_RESEARCH_SUMMARY_PLAN: Plan = {
    version: 1,
    outputKind: "summary",
    steps: [
        {
            id: "search",
            worker: "search",
            goal: "按 SearchProfile 检索知识库并收集资料",
            dependsOn: [],
        },
        {
            id: "summarize",
            worker: "summarize",
            goal: "基于已收集资料生成结构化摘要",
            dependsOn: ["search"],
        },
    ],
    plannerNotes: "P0 固定模板：search → summarize",
};

export const TPL_QA_PLAN: Plan = {
    version: 1,
    outputKind: "chat",
    steps: [
        {id: "search", worker: "search", goal: "检索相关资料", dependsOn: []},
        {id: "chat", worker: "chat", goal: "基于资料回答用户问题", dependsOn: ["search"]},
    ],
};

export const TPL_SHORT_VIDEO_PLAN: Plan = {
    version: 1,
    outputKind: "video_script",
    steps: [
        {id: "search", worker: "search", goal: "检索相关资料", dependsOn: []},
        {id: "summarize", worker: "summarize", goal: "提炼要点", dependsOn: ["search"]},
        {id: "video_script", worker: "video_script", goal: "生成短视频脚本", dependsOn: ["summarize"]},
    ],
};

export function getBuiltinPlanTemplates(): PlanTemplate[] {
    return [
        {
            id: "tpl-research-summary",
            name: "调研摘要",
            description: "检索知识库 → 生成 Markdown 摘要",
            plan: TPL_RESEARCH_SUMMARY_PLAN,
        },
        {
            id: "tpl-qa",
            name: "问答",
            description: "检索知识库 → 对话回答",
            plan: TPL_QA_PLAN,
        },
        {
            id: "tpl-short-video",
            name: "短视频脚本",
            description: "检索 → 摘要 → 脚本分镜",
            plan: TPL_SHORT_VIDEO_PLAN,
        },
    ];
}

export function resolvePlanFromTemplate(templateId: string): Plan {
    const tpl = getBuiltinPlanTemplates().find((t) => t.id === templateId);
    if (!tpl) {
        throw new Error(`未知模板: ${templateId}`);
    }
    return structuredClone(tpl.plan);
}

export const DEFAULT_TEMPLATE_ID = "tpl-research-summary";
