export type PlatformSkillItem = {
    id: string;
    name: string;
    description: string;
    allowedTools: string[];
};

export type AgentMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

export type AgentTraceItem = {
    id: string;
    stepIndex: number;
    kind: "tool_call" | "tool_result" | "status";
    title: string;
    detail?: string;
};
