import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {fetchSsePost} from "@/service/sseClient.ts";
import {getAccessToken} from "@/service/token.ts";
import type {PlatformSkillItem} from "@/pages/agent/agentTypes.ts";
import http from "@/service/request.ts";

export async function listPlatformSkills(): Promise<PlatformSkillItem[]> {
    const res = await http.get<{success: boolean; skills: PlatformSkillItem[]}>("/api/platform/skills");
    return res.skills ?? [];
}

export type PlatformRunHandlers = {
    onRunStarted?: (data: {runId: number; skillId: string; skillName: string}) => void;
    onToolCall?: (data: {stepIndex: number; name: string; arguments: string; toolCallId: string}) => void;
    onToolResult?: (data: {stepIndex: number; toolCallId: string; summary: string}) => void;
    onStatus?: (message: string) => void;
    onDone?: (data: {reply: string; runId: number}) => void;
    onError?: (message: string) => void;
};

export async function startPlatformRun(
    params: {skillId: string; message: string},
    handlers: PlatformRunHandlers,
    signal?: AbortSignal
): Promise<void> {
    await fetchSsePost(
        `${apiBase()}/api/platform/runs`,
        params,
        (event, data) => {
            if (event === "run_started") {
                handlers.onRunStarted?.(data as {runId: number; skillId: string; skillName: string});
                return;
            }
            if (event === "tool_call") {
                handlers.onToolCall?.(
                    data as {stepIndex: number; name: string; arguments: string; toolCallId: string}
                );
                return;
            }
            if (event === "tool_result") {
                handlers.onToolResult?.(
                    data as {stepIndex: number; toolCallId: string; summary: string}
                );
                return;
            }
            if (event === "status") {
                const msg = typeof data.message === "string" ? data.message : "";
                if (msg) handlers.onStatus?.(msg);
                return;
            }
            if (event === "done") {
                handlers.onDone?.(data as {reply: string; runId: number});
                return;
            }
            if (event === "error") {
                const msg = typeof data.message === "string" ? data.message : "执行失败";
                handlers.onError?.(msg);
            }
        },
        {
            getToken: getAccessToken,
            refreshToken: refreshAccessToken,
            signal,
            idleTimeoutMs: 120_000,
        }
    );
}
