import {DefaultChatTransport, readUIMessageStream, type UIMessage} from "ai";
import {apiBaseUrl} from "@/config";
import {apiFetch, getAccessToken, refreshAccessToken} from "@/api/client";

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
    created_at: string;
};

export type ChatSource = {id: number; title: string};

export async function listChatSessions(): Promise<ChatSession[]> {
    const res = await apiFetch<{success: boolean; sessions: ChatSession[]}>("/api/chat/sessions");
    return res.sessions ?? [];
}

export async function createChatSession(title?: string): Promise<number> {
    const res = await apiFetch<{success: boolean; sessionId: number}>(
        "/api/chat/sessions",
        {method: "POST", body: title?.trim() ? {title: title.trim()} : {}}
    );
    return res.sessionId;
}

export async function listChatMessages(sessionId: number): Promise<ChatMessage[]> {
    const res = await apiFetch<{success: boolean; messages: ChatMessage[]}>(
        `/api/chat/sessions/${sessionId}/messages`
    );
    return res.messages ?? [];
}

export type StreamChatHandlers = {
    onToken: (text: string) => void;
    onDone: (answer: string) => void;
    onError: (message: string) => void;
};

type MobileChatUIMessage = UIMessage<
    never,
    {
        error: {message: string};
        done: {answer: string};
    }
>;

class MobileChatTransport extends DefaultChatTransport<MobileChatUIMessage> {
    decodeResponseStream(stream: ReadableStream<Uint8Array>) {
        return this.processResponseStream(stream);
    }
}

const mobileChatTransport = new MobileChatTransport({api: ""});

export async function streamChatMessage(
    sessionId: number,
    content: string,
    handlers: StreamChatHandlers,
    signal?: AbortSignal
): Promise<void> {
    const url = `${apiBaseUrl()}/api/chat/sessions/${sessionId}/messages`;

    const run = async (retried: boolean): Promise<void> => {
        const token = getAccessToken();
        const headers: Record<string, string> = {"Content-Type": "application/json"};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({content}),
            signal,
        });

        if (res.status === 401 && !retried) {
            const ok = await refreshAccessToken();
            if (ok) return run(true);
            throw new Error("登录已过期，请重新登录");
        }

        if (!res.ok || !res.body) {
            const t = await res.text().catch(() => "");
            throw new Error(t || `请求失败(${res.status})`);
        }

        let lastText = "";
        let doneHandled = false;
        const chunkStream = mobileChatTransport.decodeResponseStream(res.body);

        for await (const message of readUIMessageStream<MobileChatUIMessage>({stream: chunkStream})) {
            for (const part of message.parts) {
                if (part.type === "data-error") {
                    handlers.onError(part.data.message);
                } else if (part.type === "data-done" && !doneHandled) {
                    doneHandled = true;
                    handlers.onDone(part.data.answer);
                } else if (part.type === "text") {
                    const delta = part.text.slice(lastText.length);
                    if (delta) handlers.onToken(delta);
                    lastText = part.text;
                }
            }
        }
    };

    await run(false);
}
