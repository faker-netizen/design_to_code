import {streamText} from "ai";
import {assertChatModelConfigured, chatTemperature, getChatModel} from "./provider.js";
import type {ChatTurn} from "./messages.js";
import {toModelMessages} from "./messages.js";

export async function* streamPlainChatDeltas(params: {
    system: string;
    userMessage: string;
    history: ChatTurn[];
    signal?: AbortSignal;
    truncateAssistant?: boolean;
}): AsyncGenerator<string> {
    assertChatModelConfigured();
    const result = streamText({
        model: getChatModel(),
        system: params.system,
        messages: toModelMessages(params.history, params.userMessage, {
            truncateAssistant: params.truncateAssistant,
        }),
        temperature: chatTemperature(),
        abortSignal: params.signal,
    });

    for await (const delta of result.textStream) {
        if (delta) yield delta;
    }
}

export async function* streamRagChatDeltas(params: {
    system: string;
    userContent: string;
    history: ChatTurn[];
    signal?: AbortSignal;
}): AsyncGenerator<string> {
    assertChatModelConfigured();
    const historyMsgs = toModelMessages(params.history, params.userContent, {truncateAssistant: true});
    const result = streamText({
        model: getChatModel(),
        system: params.system,
        messages: historyMsgs,
        temperature: chatTemperature(),
        abortSignal: params.signal,
    });

    for await (const delta of result.textStream) {
        if (delta) yield delta;
    }
}
