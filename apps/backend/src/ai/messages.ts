import type {ModelMessage} from "ai";
import {truncateChatContent} from "../utils/chatHistory.js";
import {RAG_CONTEXT_MAX_CHARS} from "../services/serviceConstants.js";

export type ChatTurn = {role: "user" | "assistant"; content: string};

export function toModelMessages(
    history: ChatTurn[],
    userMessage: string,
    options?: {truncateAssistant?: boolean}
): ModelMessage[] {
    const msgs: ModelMessage[] = [];
    for (const h of history) {
        if (h.role === "user") {
            msgs.push({role: "user", content: h.content});
        } else {
            const content = options?.truncateAssistant
                ? truncateChatContent(h.content, RAG_CONTEXT_MAX_CHARS)
                : h.content;
            msgs.push({role: "assistant", content});
        }
    }
    msgs.push({role: "user", content: userMessage});
    return msgs;
}

export function buildRagUserContent(query: string, context: string): string {
    return `【参考上下文】\n${context}\n\n【当前问题】\n${query}`;
}
