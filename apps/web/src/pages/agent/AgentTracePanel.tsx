import {Empty, Typography} from "antd";
import type {AgentTraceItem} from "@/pages/agent/agentTypes.ts";

const {Text} = Typography;

type Props = {
    items: AgentTraceItem[];
    status: string | null;
    runId: number | null;
};

function traceLabel(kind: AgentTraceItem["kind"]): string {
    if (kind === "tool_call") return "调用";
    if (kind === "tool_result") return "返回";
    return "状态";
}

export default function AgentTracePanel({items, status, runId}: Props) {
    return (
        <div className="agent-trace">
            <div className="agent-trace__header">
                <Text strong>Tool Trace</Text>
                {runId != null ? (
                    <Text type="secondary" className="agent-trace__run-id">
                        run #{runId}
                    </Text>
                ) : null}
            </div>
            {status ? (
                <div className="agent-trace__status">
                    <Text type="secondary">{status}</Text>
                </div>
            ) : null}
            {items.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无工具调用" />
            ) : (
                <ul className="agent-trace__list">
                    {items.map((item) => (
                        <li key={item.id} className={`agent-trace__item agent-trace__item--${item.kind}`}>
                            <div className="agent-trace__item-head">
                                <Text type="secondary" className="agent-trace__step">
                                    #{item.stepIndex}
                                </Text>
                                <Text strong>{traceLabel(item.kind)}</Text>
                                <Text>{item.title}</Text>
                            </div>
                            {item.detail ? (
                                <pre className="agent-trace__detail">{item.detail}</pre>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
