import {message} from "antd";
import type {PlatformRunHandlers} from "@/pages/agent/platformApi.ts";
import type {AgentMessage, AgentTraceItem} from "@/pages/agent/agentTypes.ts";

function newTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type HandlerDeps = {
    asstId: string;
    setActiveRunId: (id: number | null) => void;
    setStatus: (s: string | null) => void;
    setTrace: React.Dispatch<React.SetStateAction<AgentTraceItem[]>>;
    setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>;
};

export function buildRunHandlers(deps: HandlerDeps): PlatformRunHandlers {
    return {
        onRunStarted: ({runId, skillName}) => {
            deps.setActiveRunId(runId);
            deps.setStatus(`${skillName} 执行中…`);
        },
        onToolCall: ({stepIndex, name, arguments: args, toolCallId}) => {
            deps.setTrace((prev) => [
                ...prev,
                {id: toolCallId || newTraceId(), stepIndex, kind: "tool_call", title: name, detail: args},
            ]);
        },
        onToolResult: ({stepIndex, toolCallId, summary}) => {
            deps.setTrace((prev) => [
                ...prev,
                {
                    id: `${toolCallId}-result`,
                    stepIndex,
                    kind: "tool_result",
                    title: "结果",
                    detail: summary,
                },
            ]);
        },
        onStatus: (msg) => deps.setStatus(msg),
        onDone: ({reply, runId}) => {
            deps.setActiveRunId(runId);
            deps.setMessages((prev) =>
                prev.map((m) => (m.id === deps.asstId ? {...m, content: reply} : m))
            );
            deps.setStatus(null);
        },
        onError: (errMsg) => {
            message.warning(errMsg);
            deps.setStatus(null);
        },
    };
}
