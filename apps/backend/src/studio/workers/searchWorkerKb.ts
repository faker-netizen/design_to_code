import {randomUUID} from "node:crypto";
import ragService, {type RagChunkItem} from "../../services/ragService.js";
import {RAG_TOP_K} from "../../services/serviceConstants.js";
import {truncateKbChunk, truncateObservation} from "../context/truncateObservation.js";
import studioMaterialService, {type MaterialInput} from "../services/studioMaterialService.js";
import type {WorkerHandoff} from "../types/handoff.js";
import type {StudioRunEmit} from "../types/state.js";

export function resolveKbIds(handoff: WorkerHandoff, projectKbId: number | null): number[] {
    const fromProfile = handoff.searchProfile.kbIds;
    if (fromProfile.length) return fromProfile;
    if (projectKbId) return [projectKbId];
    return [];
}

export async function collectKbMaterials(params: {
    kbIds: number[];
    query: string;
    userId: number;
    handoff: WorkerHandoff;
    projectId: number;
    signal?: AbortSignal;
}): Promise<MaterialInput[]> {
    const {kbIds, query, userId, handoff, projectId, signal} = params;
    const materialInputs: MaterialInput[] = [];
    const seenEmbeddingIds = new Set<number>();

    for (const kbId of kbIds) {
        if (signal?.aborted) throw new Error("Run 已中止");
        const chunks = await ragService.retrieveRelevantChunks(query, {
            userId,
            knowledgeBaseId: kbId,
            k: RAG_TOP_K,
        });
        appendChunkMaterials({
            chunks,
            kbId,
            runId: handoff.runId,
            projectId,
            out: materialInputs,
            seenEmbeddingIds,
        });
    }
    return materialInputs;
}

function appendChunkMaterials(params: {
    chunks: RagChunkItem[];
    kbId: number;
    runId: number;
    projectId: number;
    out: MaterialInput[];
    seenEmbeddingIds: Set<number>;
}): void {
    const {chunks, kbId, runId, projectId, out, seenEmbeddingIds} = params;
    for (const [index, chunk] of chunks.entries()) {
        const embeddingId = chunk.metadata.embeddingId;
        if (seenEmbeddingIds.has(embeddingId)) continue;
        seenEmbeddingIds.add(embeddingId);
        out.push({
            id: randomUUID(),
            runId,
            projectId,
            sourceType: "kb",
            title: `KB#${kbId} · 片段 ${index + 1}`,
            snippet: truncateKbChunk(chunk.content),
            content: chunk.content,
            metadata: {
                kbId,
                documentId: chunk.metadata.documentId,
                embeddingId,
                score: chunk.score,
            },
        });
    }
}

export async function persistSearchMaterials(params: {
    stepId: string;
    materialInputs: MaterialInput[];
    emit: StudioRunEmit;
    reactTrace: Array<{tool: string; observation: string}>;
}): Promise<void> {
    const {stepId, materialInputs, emit, reactTrace} = params;
    if (!materialInputs.length) return;

    emit("react_step", {stepId, tool: "save_materials", phase: "start", count: materialInputs.length});
    await studioMaterialService.saveMaterials(materialInputs);
    reactTrace.push({
        tool: "save_materials",
        observation: truncateObservation("save_materials", JSON.stringify({saved: materialInputs.length})),
    });
    emit("materials", {
        stepId,
        materials: materialInputs.map((m) => ({
            id: m.id,
            title: m.title,
            sourceType: m.sourceType,
            charCount: m.content.length,
        })),
    });
    emit("react_step", {stepId, tool: "save_materials", phase: "done", count: materialInputs.length});
}
