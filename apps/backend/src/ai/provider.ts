import {createOpenAI} from "@ai-sdk/openai";
import {qwenConfig} from "../config/qwen.js";

const qwen = createOpenAI({
    baseURL: qwenConfig.baseURL,
    apiKey: qwenConfig.apiKey,
});

export function getChatModel() {
    return qwen.chat(qwenConfig.chatModel);
}

export function assertChatModelConfigured(): void {
    if (!qwenConfig.apiKey.trim()) {
        throw new Error("QWEN_API_KEY 未配置");
    }
}

export function chatTemperature(): number {
    return Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2;
}
