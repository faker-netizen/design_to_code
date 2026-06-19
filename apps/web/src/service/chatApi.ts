import http from "@/service/request.ts";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import {readChatUiMessageStream} from "@/vercelAi/chatTransport.ts";
import type {ChatUIMessage} from "@/vercelAi/chatTypes.ts";

export type ChatSession = {
    id: number;
    user_id: number;
    knowledge_base_id: number | null;
    title: string;
    created_at: string;
    updated_at: string;
};

export type ChatMessage = {
    id: number;
    session_id: number;
    role: string;
    content: string;
    sources_json: unknown | null;
    skill_id?: string | null;
    created_at: string;
};

export type ChatSource = {id: number; title: string};

export async function listChatSessions(): Promise<ChatSession[]> {
    const res = await http.get<{success: boolean; sessions: ChatSession[]}>("/api/chat/sessions");
    return res.sessions ?? [];
}

export async function createChatSession(params: {
    knowledgeBaseId?: number;
    title?: string;
}): Promise<number> {
    const body: {knowledgeBaseId?: number; title?: string} = {};
    if (params.knowledgeBaseId != null) body.knowledgeBaseId = params.knowledgeBaseId;
    if (params.title?.trim()) body.title = params.title.trim();
    const res = await http.post<{success: boolean; sessionId: number}, typeof body>(
        "/api/chat/sessions",
        body
    );
    return res.sessionId;
}

export async function deleteChatSession(sessionId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/chat/sessions/${sessionId}`);
}

export async function updateChatSessionTitle(sessionId: number, title: string): Promise<void> {
    await http.patch<{success: boolean}, {title: string}>(`/api/chat/sessions/${sessionId}`, {title});
}

export async function listChatMessages(sessionId: number): Promise<ChatMessage[]> {
    const res = await http.get<{success: boolean; messages: ChatMessage[]}>(
        `/api/chat/sessions/${sessionId}/messages`
    );
    return res.messages ?? [];
}

export type SendMessageResult = {
    userMessageId: number;
    assistantMessageId: number;
    answer: string;
    sources: ChatSource[] | null;
};

export type StreamChatHandlers = {
    onMeta: (p: {userMessageId: number}) => void;
    onSkill?: (p: {skillId: string; skillName: string}) => void;
    onStatus?: (p: {phase: string; label: string}) => void;
    onSources: (p: {sources: ChatSource[] | null}) => void;
    onToken: (p: {text: string}) => void;
    onError: (p: {message: string}) => void;
    onAborted?: (p: {stopped?: boolean}) => void;
    onDone: (p: SendMessageResult) => void;
};

/** POST /api/chat/sessions/:id/messages — Vercel AI SDK UI Message Stream */
export async function streamChatMessage(
    sessionId: number,
    content: string,
    handlers: StreamChatHandlers,
    options?: {signal?: AbortSignal; skillId?: string | null}
): Promise<void> {
    const url = `${apiBase()}/api/chat/sessions/${sessionId}/messages`;
    const body: {content: string; skillId?: string | null} = {content};
    if (options?.skillId !== undefined) body.skillId = options.skillId;

    const run = async (retried: boolean): Promise<void> => {
        const token = getAccessToken();
        const headers: Record<string, string> = {"Content-Type": "application/json"};
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const res = await fetch(url, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify(body),
                signal: options?.signal,
            });

            if (res.status === 401 && !retried) {
                const ok = await refreshAccessToken();
                if (ok) return run(true);
                throw new Error("登录已过期，请重新登录");
            }

            if (!res.ok || !res.body) {
                const t = await res.text().catch(() => "");
                let errMsg = `请求失败(${res.status})`;
                if (t) {
                    try {
                        const j = JSON.parse(t) as {error?: string; message?: string};
                        errMsg = j.error || j.message || errMsg;
                    } catch {
                        errMsg = t;
                    }
                }
                throw new Error(errMsg);
            }

            let lastText = "";
            let metaHandled = false;
            let doneHandled = false;

            const onMessage = (message: ChatUIMessage) => {
                for (const part of message.parts) {
                    if (part.type === "data-meta" && !metaHandled) {
                        metaHandled = true;
                        handlers.onMeta(part.data);
                    } else if (part.type === "data-skill") {
                        handlers.onSkill?.(part.data);
                    } else if (part.type === "data-status") {
                        handlers.onStatus?.(part.data);
                    } else if (part.type === "data-sources") {
                        handlers.onSources(part.data);
                    } else if (part.type === "data-error") {
                        handlers.onError(part.data);
                    } else if (part.type === "data-aborted") {
                        handlers.onAborted?.(part.data);
                    } else if (part.type === "data-done" && !doneHandled) {
                        doneHandled = true;
                        handlers.onDone(part.data);
                    } else if (part.type === "text") {
                        const full = part.text;
                        const delta = full.slice(lastText.length);
                        if (delta) handlers.onToken({text: delta});
                        lastText = full;
                    }
                }
            };

            await readChatUiMessageStream(res.body, onMessage);
        } catch (e) {
            if (options?.signal?.aborted) throw e;
            if (e instanceof Error && e.name === "AbortError") throw e;
            throw e;
        }
    };

    await run(false);
}
