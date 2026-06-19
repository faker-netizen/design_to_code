import {MemorySaver} from "@langchain/langgraph";

let checkpointer: MemorySaver | null = null;

export function getStudioCheckpointer(): MemorySaver {
    if (!checkpointer) checkpointer = new MemorySaver();
    return checkpointer;
}

export function studioThreadId(runId: number): string {
    return `studio-run-${runId}`;
}
