import {AIMessage, BaseMessage, isAIMessage, isToolMessage} from "@langchain/core/messages";
import type {PlatformAgentStep} from "../types.js";
import {TOOL_RESULT_PREVIEW} from "../context/runContext.js";

/** 从 AIMessage 提取纯文本 content */
export function messageText(msg: BaseMessage): string {
    if (!isAIMessage(msg)) return "";
    const c = msg.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
        return c
            .map((b) => {
                if (typeof b === "string") return b;
                if (b && typeof b === "object" && "text" in b) return String((b as {text?: string}).text ?? "");
                return "";
            })
            .join("");
    }
    return "";
}

/** 把 LangChain tool_calls 转为可序列化记录 */
function toolCallsToRecords(ai: AIMessage): PlatformAgentStep["tool_calls"] {
    const raw = ai.tool_calls;
    if (!raw?.length) return undefined;
    return raw.map((tc) => ({
        id: tc.id ?? "",
        name: tc.name,
        arguments: JSON.stringify(tc.args ?? {}),
    }));
}

/** 从完整 messages 还原每轮 AI 调用与 tool 结果 */
export function buildStepsFromMessages(messages: BaseMessage[]): PlatformAgentStep[] {
    const steps: PlatformAgentStep[] = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!isAIMessage(m)) continue;

        if (m.tool_calls?.length) {
            const expected = new Set(m.tool_calls.map((tc) => tc.id).filter(Boolean));
            const toolResults: Array<{tool_call_id: string; content: string}> = [];
            for (let j = i + 1; j < messages.length; j++) {
                const t = messages[j];
                if (isToolMessage(t)) {
                    const id = t.tool_call_id ?? "";
                    if (expected.has(id)) {
                        const content =
                            typeof t.content === "string" ? t.content : JSON.stringify(t.content);
                        toolResults.push({tool_call_id: id, content});
                    }
                    if (toolResults.length >= expected.size) break;
                } else if (isAIMessage(t)) break;
            }
            steps.push({
                stepIndex: steps.length,
                assistantText: messageText(m) || null,
                tool_calls: toolCallsToRecords(m),
                toolResults,
            });
        } else {
            steps.push({stepIndex: steps.length, assistantText: messageText(m) || null});
        }
    }
    return steps;
}

/** 取最后一条无 tool_calls 的 AI 文本作为用户可见回复 */
export function lastAiText(messages: BaseMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (isAIMessage(m) && !m.tool_calls?.length) return messageText(m);
    }
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (isAIMessage(m)) return messageText(m);
    }
    return "";
}

/** 截断 tool 结果用于 SSE trace 展示 */
export function summarizeToolResult(content: string): string {
    if (content.length <= TOOL_RESULT_PREVIEW) return content;
    return `${content.slice(0, TOOL_RESULT_PREVIEW)}…`;
}
