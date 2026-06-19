import type {UIMessage} from "ai";
import type {ChatSource} from "@/service/chatApi.ts";

export type ChatStreamMeta = {userMessageId: number};
export type ChatStreamSkill = {skillId: string; skillName: string};
export type ChatStreamStatus = {phase: string; label: string};
export type ChatStreamSources = {sources: ChatSource[] | null};
export type ChatStreamError = {message: string; code?: string};
export type ChatStreamAborted = {stopped?: boolean};
export type ChatStreamDone = {
    userMessageId: number;
    assistantMessageId: number;
    answer: string;
    sources: ChatSource[] | null;
};

export type ChatUIMessage = UIMessage<
    never,
    {
        meta: ChatStreamMeta;
        skill: ChatStreamSkill;
        status: ChatStreamStatus;
        sources: ChatStreamSources;
        error: ChatStreamError;
        aborted: ChatStreamAborted;
        done: ChatStreamDone;
    }
>;
