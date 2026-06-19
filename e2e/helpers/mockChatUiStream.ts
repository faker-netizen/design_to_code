const MOCK_REPLY = "E2E mock assistant reply";

/** Vercel AI SDK UI Message Stream mock body */
export function buildMockChatUiStreamBody(
    userMessageId = 1,
    assistantMessageId = 2,
    answer = MOCK_REPLY
): string {
    const chunks = [
        {type: "data-meta", data: {userMessageId}},
        {type: "text-start", id: "assistant-reply"},
        {type: "text-delta", id: "assistant-reply", delta: answer},
        {type: "text-end", id: "assistant-reply"},
        {
            type: "data-done",
            data: {userMessageId, assistantMessageId, answer, sources: null},
        },
    ];
    return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
}

export {MOCK_REPLY};
