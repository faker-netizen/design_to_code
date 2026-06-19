import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import VectorIndex from "../config/vectorIndex.js";
import {Document} from "@langchain/core/documents";
import pool from "../config/database.js";
import {invokeRagRetrievalGraph} from "../ragAgent/ragRetrievalGraph.js";
import {buildRagUserContent, streamPlainChatDeltas, streamRagChatDeltas} from "../ai/index.js";
import {
    INGEST_CHUNK_OVERLAP,
    INGEST_CHUNK_SIZE,
    SCORE_DECIMAL_PLACES,
} from "./serviceConstants.js";
import {
    buildEmbeddingScopeFilter,
    buildRagSystemPrompt,
    defaultMinScore,
    defaultRetrievalK,
    embeddingCandidateLimit,
    scoreEmbeddingCandidates,
    validateEmbeddingBatch,
    type RagChatHistory,
} from "./ragServiceHelpers.js";

export type RagChunkItem = {
    content: string;
    score: number;
    metadata: {documentId: number; embeddingId: number};
};

export type RagStreamPart =
    | {type: "context"; chunks: RagChunkItem[]}
    | {type: "token"; text: string};

export type {RagChatHistory} from "./ragServiceHelpers.js";

type EmbeddingRow = {
    id: number;
    document_id: number;
    chunk_text: string;
    embedding: number[];
};

class RAGService {
    async ingestDocument(params: {
        text: string;
        documentId: number;
        title: string;
        source?: string;
    }): Promise<void> {
        try {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: INGEST_CHUNK_SIZE,
                chunkOverlap: INGEST_CHUNK_OVERLAP,
            });

            const docs = await splitter.splitDocuments([
                new Document({
                    pageContent: params.text,
                    metadata: {
                        documentId: params.documentId,
                        title: params.title,
                        source: params.source ?? `document_${params.documentId}`,
                    },
                }),
            ]);

            const texts = docs.map((d) => d.pageContent).filter(Boolean);
            if (!texts.length) return;

            const vectors = await VectorIndex.embedTexts(texts);
            validateEmbeddingBatch(texts, vectors);
            await this.insertEmbeddingRows(params.documentId, texts, vectors);
        } catch (error) {
            console.error("[RAG] ingestDocument failed:", error);
            throw error;
        }
    }

    private async insertEmbeddingRows(
        documentId: number,
        texts: string[],
        vectors: number[][]
    ): Promise<void> {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (let i = 0; i < texts.length; i++) {
                await conn.query(
                    "INSERT INTO embeddings (document_id, chunk_text, embedding) VALUES (?, ?, ?)",
                    [documentId, texts[i], JSON.stringify(vectors[i])]
                );
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    async deleteEmbeddingsForDocument(documentId: number): Promise<void> {
        await pool.query("DELETE FROM embeddings WHERE document_id = ?", [documentId]);
    }

    async retrieveRelevantChunks(
        query: string,
        opts?: {
            documentId?: number;
            knowledgeBaseId?: number;
            userId?: number;
            k?: number;
            minScore?: number;
        }
    ): Promise<RagChunkItem[]> {
        try {
            const k = defaultRetrievalK(opts?.k);
            const minScore = defaultMinScore(opts?.minScore);

            if (opts?.userId == null) return [];

            const [queryVec] = await VectorIndex.embedTexts([query]);
            if (!queryVec || !queryVec.length) return [];

            const {parts, args} = buildEmbeddingScopeFilter(opts);
            const sql = `
                SELECT e.id, e.document_id, e.chunk_text, e.embedding
                FROM embeddings e
                INNER JOIN documents d ON d.id = e.document_id
                WHERE ${parts.join(" AND ")}
                ORDER BY e.id DESC LIMIT ${embeddingCandidateLimit()}
            `;

            const [rows] = await pool.query(sql, args);
            return scoreEmbeddingCandidates(rows as EmbeddingRow[], queryVec, minScore, k);
        } catch (error) {
            console.error("[RAG] retrieveRelevantChunks failed:", error);
            throw error;
        }
    }

    private shouldUsePlainChatFallback(state: {
        chunks: RagChunkItem[];
        evalResult?: {sufficient: boolean} | null;
    }): boolean {
        return !state.chunks.length || !state.evalResult?.sufficient;
    }

    async *answerWithRAGStream(
        query: string,
        opts?: {
            documentId?: number;
            knowledgeBaseId?: number;
            userId?: number;
            k?: number;
            minScore?: number;
            history?: RagChatHistory;
            signal?: AbortSignal;
            extraSystemPolicy?: string;
            forbidPlainFallback?: boolean;
        }
    ): AsyncGenerator<RagStreamPart> {
        if (opts?.userId == null) {
            yield {type: "context", chunks: []};
            yield {type: "token", text: "信息不足"};
            return;
        }
        const history = opts?.history ?? [];
        const state = await invokeRagRetrievalGraph({
            userQuery: query,
            conversationHistory: history,
            ragOpts: {
                userId: opts.userId,
                knowledgeBaseId: opts.knowledgeBaseId,
                documentId: opts.documentId,
                k: defaultRetrievalK(opts?.k),
                minScore: opts?.minScore,
                signal: opts?.signal,
            },
        });
        const chunks = state.chunks as RagChunkItem[];
        const usePlain = this.shouldUsePlainChatFallback({chunks, evalResult: state.evalResult});
        if (usePlain && opts?.forbidPlainFallback) {
            yield {type: "context", chunks: []};
            return;
        }
        yield {type: "context", chunks: usePlain ? [] : chunks};
        if (usePlain) {
            yield* this.yieldPlainTokens(query, history, opts?.signal, {ragFallback: true});
            return;
        }

        yield* this.yieldRagTokens(query, chunks, history, {
            signal: opts?.signal,
            extraSystemPolicy: opts?.extraSystemPolicy,
        });
    }

    private async *yieldPlainTokens(
        query: string,
        history: RagChatHistory,
        signal: AbortSignal | undefined,
        options: {ragFallback?: boolean}
    ): AsyncGenerator<RagStreamPart> {
        for await (const delta of this.streamChatPlain(query, history, signal, options)) {
            yield {type: "token", text: delta};
        }
    }

    private async *yieldRagTokens(
        query: string,
        chunks: RagChunkItem[],
        history: RagChatHistory,
        streamOpts: {signal?: AbortSignal; extraSystemPolicy?: string}
    ): AsyncGenerator<RagStreamPart> {
        const context = chunks
            .map((c, i) => `片段${i + 1}(score=${c.score.toFixed(SCORE_DECIMAL_PLACES)}):\n${c.content}`)
            .join("\n\n");
        const systemText = buildRagSystemPrompt(streamOpts.extraSystemPolicy);
        const userContent = buildRagUserContent(query, context);

        try {
            for await (const text of streamRagChatDeltas({
                system: systemText,
                userContent,
                history,
                signal: streamOpts.signal,
            })) {
                if (text) yield {type: "token", text};
            }
        } catch (error) {
            console.error("[RAG] answerWithRAGStream failed:", error);
            throw error;
        }
    }

    async *streamChatPlain(
        userMessage: string,
        history: Array<{role: "user" | "assistant"; content: string}>,
        signal?: AbortSignal,
        options?: {ragFallback?: boolean}
    ): AsyncGenerator<string> {
        const systemText = options?.ragFallback
            ? "你是友好、简洁的中文助手。当前知识库未检索到足够相关的文档片段，请结合【对话历史】与用户问题作答；" +
              "不要编造文档或引用来源，可说明未在知识库中找到直接依据，再基于常识与上下文尽量有帮助地回复。"
            : "你是友好、简洁的中文助手。回答要有帮助、可读。";
        try {
            for await (const delta of streamPlainChatDeltas({
                system: systemText,
                userMessage,
                history,
                signal,
                truncateAssistant: true,
            })) {
                yield delta;
            }
        } catch (error) {
            console.error("[RAG] streamChatPlain failed:", error);
            throw error;
        }
    }
}

export default new RAGService();
