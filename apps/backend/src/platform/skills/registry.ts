import type {PlatformSkillDef, PlatformSkillId} from "../types.js";

const OPEN_RESEARCH_PROMPT = [
    "你是开放调研助手。需要最新信息时必须调用 web_search；需要阅读原文时先 fetch_url 再 read_text。",
    "复杂子任务可用 spawn_agent 委派给子助手（传入清晰 task）。",
    "结论整理后可 write_artifact 保存 markdown 报告。",
    "不要编造工具结果；工具失败时如实说明。回答简洁、结构化。",
].join("\n");

const GENERAL_ASSISTANT_PROMPT = [
    "你是通用助手。若用户给出 materialId，用 read_text 阅读；需要保存结论时用 write_artifact。",
    "保持简洁准确，不编造未读取的内容。",
].join("\n");

const BUILTIN: PlatformSkillDef[] = [
    {
        id: "open-research",
        name: "开放调研",
        description: "搜索公网、抓取页面、阅读材料，可 spawn 子 Agent 分工",
        systemPrompt: OPEN_RESEARCH_PROMPT,
        allowedTools: ["web_search", "fetch_url", "read_text", "spawn_agent", "write_artifact"],
        defaultMaxSteps: 8,
        kind: "builtin",
    },
    {
        id: "general-assistant",
        name: "通用助手",
        description: "阅读已有材料并整理输出，不主动联网",
        systemPrompt: GENERAL_ASSISTANT_PROMPT,
        allowedTools: ["read_text", "write_artifact"],
        defaultMaxSteps: 6,
        kind: "builtin",
    },
];

const BY_ID = new Map<string, PlatformSkillDef>(BUILTIN.map((s) => [s.id, s]));

/** 返回所有内置 Platform Skill 定义 */
export function listPlatformSkills(): PlatformSkillDef[] {
    return [...BUILTIN];
}

/** 按 id 查找 Skill，不存在返回 null */
export function getPlatformSkillById(skillId: string): PlatformSkillDef | null {
    return BY_ID.get(skillId) ?? null;
}

/** 校验 skillId 合法，否则 throw */
export function assertPlatformSkillId(skillId: string): PlatformSkillId {
    const skill = getPlatformSkillById(skillId);
    if (!skill) throw new Error(`未知的平台 Skill: ${skillId}`);
    return skill.id as PlatformSkillId;
}
