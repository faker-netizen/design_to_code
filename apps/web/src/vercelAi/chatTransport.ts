import {DefaultChatTransport, readUIMessageStream, type UIMessageChunk} from "ai";
import type {ChatUIMessage} from "@/vercelAi/chatTypes.ts";

/** 解码 AI SDK UI Message Stream HTTP 响应 */
export class D2cChatTransport extends DefaultChatTransport<ChatUIMessage> {
    decodeResponseStream(stream: ReadableStream<Uint8Array>): ReadableStream<UIMessageChunk> {
        return this.processResponseStream(stream);
    }
}

export const d2cChatTransport = new D2cChatTransport({api: ""});

export async function readChatUiMessageStream(
    stream: ReadableStream<Uint8Array>,
    onMessage: (message: ChatUIMessage) => void
): Promise<void> {
    const chunkStream = d2cChatTransport.decodeResponseStream(stream);
    for await (const message of readUIMessageStream<ChatUIMessage>({stream: chunkStream})) {
        onMessage(message);
    }
}
