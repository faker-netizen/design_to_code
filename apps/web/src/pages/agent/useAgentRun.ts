import {useCallback, useRef, useState} from "react";
import {message} from "antd";
import {startPlatformRun} from "@/pages/agent/platformApi.ts";
import {buildRunHandlers} from "@/pages/agent/buildRunHandlers.ts";
import type {AgentMessage, AgentTraceItem} from "@/pages/agent/agentTypes.ts";

function newId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgentRun(skillId: string | null) {
    const abortRef = useRef<AbortController | null>(null);
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [trace, setTrace] = useState<AgentTraceItem[]>([]);
    const [input, setInput] = useState("");
    const [running, setRunning] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [activeRunId, setActiveRunId] = useState<number | null>(null);

    const onSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !skillId || running) return;

        const asstId = newId();
        setInput("");
        setMessages((prev) => [
            ...prev,
            {id: newId(), role: "user", content: text, createdAt: new Date().toISOString()},
            {id: asstId, role: "assistant", content: "", createdAt: new Date().toISOString()},
        ]);
        setTrace([]);
        setRunning(true);
        setStatus("准备中…");

        const ac = new AbortController();
        abortRef.current = ac;
        const handlers = buildRunHandlers({asstId, setActiveRunId, setStatus, setTrace, setMessages});

        try {
            await startPlatformRun({skillId, message: text}, handlers, ac.signal);
        } catch (e) {
            if (ac.signal.aborted) message.info("已停止");
            else message.error(e instanceof Error ? e.message : "执行失败");
            setStatus(null);
        } finally {
            abortRef.current = null;
            setRunning(false);
        }
    }, [input, skillId, running]);

    const onStop = useCallback(() => abortRef.current?.abort(), []);

    return {messages, trace, input, setInput, running, status, activeRunId, onSend, onStop};
}
