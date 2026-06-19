import pool from "../../config/database.js";
import type {MaterialMeta} from "../types/state.js";

export type MaterialInput = {
    id: string;
    runId: number;
    projectId: number;
    sourceType: "kb" | "web" | "url" | "upload";
    title: string;
    url?: string;
    snippet?: string;
    content: string;
    metadata?: Record<string, unknown>;
};

class StudioMaterialService {
    async saveMaterials(items: MaterialInput[]): Promise<void> {
        if (!items.length) return;
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const item of items) {
                await conn.query(
                    `INSERT INTO studio_materials
                     (id, run_id, project_id, source_type, title, url, snippet, content, content_char_count, metadata_json)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        item.id,
                        item.runId,
                        item.projectId,
                        item.sourceType,
                        item.title,
                        item.url ?? null,
                        item.snippet ?? null,
                        item.content,
                        item.content.length,
                        item.metadata ? JSON.stringify(item.metadata) : null,
                    ]
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

    async listMetaForRun(runId: number): Promise<MaterialMeta[]> {
        const [rows] = await pool.query(
            `SELECT id, title, source_type, content_char_count
             FROM studio_materials WHERE run_id = ? ORDER BY created_at ASC`,
            [runId]
        );
        return (rows as Array<{id: string; title: string; source_type: MaterialMeta["sourceType"]; content_char_count: number}>).map(
            (r) => ({
                id: r.id,
                title: r.title,
                sourceType: r.source_type,
                charCount: r.content_char_count,
            })
        );
    }

    async loadByIds(ids: string[]): Promise<Array<{id: string; title: string; content: string; snippet: string | null}>> {
        if (!ids.length) return [];
        const placeholders = ids.map(() => "?").join(", ");
        const [rows] = await pool.query(
            `SELECT id, title, content, snippet FROM studio_materials WHERE id IN (${placeholders})`,
            ids
        );
        return rows as Array<{id: string; title: string; content: string; snippet: string | null}>;
    }

    async totalCharsForRun(runId: number): Promise<number> {
        const [rows] = await pool.query(
            "SELECT COALESCE(SUM(content_char_count), 0) AS total FROM studio_materials WHERE run_id = ?",
            [runId]
        );
        const list = rows as Array<{total: number}>;
        return Number(list[0]?.total ?? 0);
    }

    async loadSegment(
        id: string,
        offset: number,
        limit: number
    ): Promise<{id: string; title: string; segment: string; offset: number; totalChars: number} | null> {
        const [rows] = await pool.query(
            "SELECT id, title, content, content_char_count FROM studio_materials WHERE id = ? LIMIT 1",
            [id]
        );
        const row = (rows as Array<{id: string; title: string; content: string; content_char_count: number}>)[0];
        if (!row) return null;
        const safeOffset = Math.max(0, offset);
        const safeLimit = Math.max(1, Math.min(limit, 4000));
        return {
            id: row.id,
            title: row.title,
            segment: row.content.slice(safeOffset, safeOffset + safeLimit),
            offset: safeOffset,
            totalChars: row.content_char_count,
        };
    }
}

export default new StudioMaterialService();
