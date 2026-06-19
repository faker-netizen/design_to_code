import {createAgent} from "langchain";
import {ChatOpenAI} from "@langchain/openai";
import {BaseMessage} from "@langchain/core/messages";
import {qwenConfig} from "../../config/qwen.js";
import {getPlatformSkillById} from "../skills/registry.js";
import {resolvePlatformTools} from "../tools/index.js";
import runService from "../services/runService.js";
import type {PlatformRunContext} from "../context/runContext.js";
import type {PlatformAgentResult, PlatformToolId} from "../types.js";
import {buildStepsFromMessages, lastAiText, summarizeToolResult} from "./messageHelpers.js";

const MAX_STEPS_CAP = 16;

/** 创建 Qwen ChatOpenAI 模型实例 */
function createModel() {
    return new ChatOpenAI({
        apiKey: qwenConfig.apiKey,
        configuration: {baseURL: qwenConfig.baseURL},
        model: qwenConfig.chatModel,
        temperature: Number.isFinite(qwenConfig.temperature) ? qwenConfig.temperature : 0.2,
    });
}

/** 将 invoke 异常映射为 aborted / max_steps / error 结果 */
function mapAgentFailure(e: unknown): Pick<PlatformAgentResult, "reply" | "steps" | "stoppedReason" | "error"> {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("AbortError")) {
        return {reply: "", steps: [], stoppedReason: "aborted"};
    }
    const hitLimit = /recursion/i.test(msg) || /GRAPH_RECURSION_LIMIT/i.test(msg) || /maximum/i.test(msg);
    return {
        reply: "",
        steps: [],
        stoppedReason: hitLimit ? "max_steps" : "error",
        error: hitLimit ? undefined : msg,
    };
}

/** invoke 完成后，把 tool_call/result 推 SSE 并写 platform_run_steps */
async function emitStepsFromMessages(
    ctx: PlatformRunContext,
    messages: BaseMessage[],
    startIndex: number
): Promise<void> {
    const steps = buildStepsFromMessages(messages);
    for (const step of steps.slice(startIndex)) {
        if (step.tool_calls?.length) {
            for (const tc of step.tool_calls) {
                ctx.emit?.("tool_call", {
                    stepIndex: step.stepIndex,
                    name: tc.name,
                    arguments: tc.arguments,
                    toolCallId: tc.id,
                });
                await runService.appendStep(ctx.runId, step.stepIndex, "tool_call", {
                    name: tc.name,
                    arguments: tc.arguments,
                    toolCallId: tc.id,
                });
            }
        }
        if (step.toolResults?.length) {
            for (const tr of step.toolResults) {
                const summary = summarizeToolResult(tr.content);
                ctx.emit?.("tool_result", {
                    stepIndex: step.stepIndex,
                    toolCallId: tr.tool_call_id,
                    summary,
                });
                await runService.appendStep(ctx.runId, step.stepIndex, "tool_result", {
                    toolCallId: tr.tool_call_id,
                    summary,
                });
            }
        }
    }
}

export type RunPlatformAgentParams = {
    userMessage: string;
    skillId: string;
    ctx: PlatformRunContext;
    toolsOverride?: PlatformToolId[];
    maxSteps?: number;
};

/** 加载 Skill + 薄工具，LangChain ReAct 循环，返回最终 reply */
export async function runPlatformAgent(params: RunPlatformAgentParams): Promise<PlatformAgentResult> {
    if (!qwenConfig.apiKey) {
        return {reply: "", steps: [], stoppedReason: "error", error: "QWEN_API_KEY 未配置"};
    }
    const skill = getPlatformSkillById(params.skillId);
    if (!skill) {
        return {reply: "", steps: [], stoppedReason: "error", error: `未知 Skill: ${params.skillId}`};
    }

    const toolIds = (params.toolsOverride ?? skill.allowedTools).filter((t) =>
        params.ctx.allowedTools.includes(t)
    ) as PlatformToolId[];

    const maxSteps = Math.min(MAX_STEPS_CAP, params.maxSteps ?? skill.defaultMaxSteps);
    const recursionLimit = Math.min(64, Math.max(6, maxSteps * 4 + 2));
    const tools = resolvePlatformTools(params.ctx, toolIds);
    const agent = createAgent({
        model: createModel(),
        tools,
        systemPrompt: skill.systemPrompt,
    });

    const priorStepCount = 0;

    try {
        const result = (await agent.invoke(
            {messages: [{role: "user", content: params.userMessage}]},
            {recursionLimit, signal: params.ctx.signal}
        )) as {messages?: BaseMessage[]};
        const messages = result.messages ?? [];
        await emitStepsFromMessages(params.ctx, messages, priorStepCount);
        return {
            reply: lastAiText(messages),
            steps: buildStepsFromMessages(messages),
            stoppedReason: "completed",
        };
    } catch (e) {
        return mapAgentFailure(e);
    }
}
