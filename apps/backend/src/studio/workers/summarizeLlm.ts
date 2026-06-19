import {ChatOpenAI} from "@langchain/openai";
import {qwenConfig} from "../../config/qwen.js";

type MaterialSlice = {title: string; content: string};

function createSummarizeModel(): ChatOpenAI {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

function materialBlock(materials: MaterialSlice[]): string {
    return materials.map((m) => `### ${m.title}\n${m.content}`).join("\n\n");
}

async function invokeMarkdown(prompt: string): Promise<string> {
    if (!qwenConfig.apiKey.trim()) {
        throw new Error("QWEN_API_KEY 未配置");
    }
    const llm = createSummarizeModel();
    const response = await llm.invoke(prompt);
    return typeof response.content === "string" ? response.content : String(response.content);
}

export async function summarizeMaterialsMarkdown(params: {
    userQuery: string;
    materials: MaterialSlice[];
    priorSummary: string;
    mode: "direct" | "reduce";
}): Promise<{contentJson: Record<string, unknown>; markdown: string}> {
    const context = materialBlock(params.materials);
    const prior = params.priorSummary.trim() || "无";
    const modeHint = params.mode === "reduce" ? "（分段合并摘要）" : "";
    const markdown = await invokeMarkdown(
        `用户问题：${params.userQuery}\n已有摘要：${prior}\n\n请基于以下资料输出 Markdown 结构化摘要${modeHint}：\n\n${context}`
    );
    return {contentJson: {mode: params.mode, materialCount: params.materials.length}, markdown};
}
