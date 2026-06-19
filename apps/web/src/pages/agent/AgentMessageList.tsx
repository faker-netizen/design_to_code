import {Spin} from "antd";
import type {AgentMessage} from "@/pages/agent/agentTypes.ts";

type Props = {
    messages: AgentMessage[];
    running: boolean;
};

export default function AgentMessageList({messages, running}: Props) {
    if (messages.length === 0) {
        return (
            <div className="agent-conversation__empty">
                <h2>通用 Agent</h2>
                <p>选择 Skill，描述你的任务。开放调研可搜索、抓取并 spawn 子 Agent。</p>
            </div>
        );
    }

    return (
        <ul className="agent-message-list">
            {messages.map((m) => (
                <li
                    key={m.id}
                    className={
                        m.role === "user"
                            ? "agent-message agent-message--user"
                            : "agent-message agent-message--assistant"
                    }
                >
                    <div className="agent-message__role">{m.role === "user" ? "你" : "Agent"}</div>
                    <div className="agent-message__body">
                        {m.role === "assistant" && running && !m.content ? (
                            <Spin size="small" />
                        ) : (
                            <pre className="agent-message__text">{m.content || "…"}</pre>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
