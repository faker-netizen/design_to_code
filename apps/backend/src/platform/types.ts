export type PlatformToolId =
    | "web_search"
    | "fetch_url"
    | "read_text"
    | "spawn_agent"
    | "write_artifact";

export type PlatformSkillId = "open-research" | "general-assistant";

export type PlatformSkillDef = {
    id: PlatformSkillId | string;
    name: string;
    description: string;
    systemPrompt: string;
    allowedTools: readonly PlatformToolId[];
    defaultMaxSteps: number;
    kind: "builtin";
};

export type PlatformRunStatus = "running" | "completed" | "failed" | "aborted";

export type PlatformAgentStep = {
    stepIndex: number;
    assistantText: string | null;
    tool_calls?: Array<{id: string; name: string; arguments: string}>;
    toolResults?: Array<{tool_call_id: string; content: string}>;
};

export type PlatformAgentResult = {
    reply: string;
    steps: PlatformAgentStep[];
    stoppedReason: "completed" | "max_steps" | "error" | "aborted";
    error?: string;
};

export type PlatformStepEmitter = (event: string, data: Record<string, unknown>) => void;
