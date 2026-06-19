import type {ResultSetHeader} from "mysql2";
import pool from "../../config/database.js";
import type {StudioArtifactDraft} from "../types/state.js";

export type StudioArtifactRow = {
    id: number;
    run_id: number;
    kind: StudioArtifactDraft["kind"];
    content_json: Record<string, unknown>;
    markdown: string | null;
    created_at: Date;
    updated_at: Date;
};

type DbArtifactRow = Omit<StudioArtifactRow, "content_json"> & {content_json: string | Record<string, unknown>};

function rowToArtifact(row: DbArtifactRow): StudioArtifactRow {
    const content =
        typeof row.content_json === "string"
            ? (JSON.parse(row.content_json) as Record<string, unknown>)
            : row.content_json;
    return {...row, content_json: content};
}

class StudioArtifactService {
    async saveArtifact(runId: number, draft: StudioArtifactDraft): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO studio_artifacts (run_id, kind, content_json, markdown)
             VALUES (?, ?, ?, ?)`,
            [runId, draft.kind, JSON.stringify(draft.contentJson), draft.markdown ?? null]
        );
        return result.insertId;
    }

    async listForRun(runId: number): Promise<StudioArtifactRow[]> {
        const [rows] = await pool.query(
            "SELECT * FROM studio_artifacts WHERE run_id = ? ORDER BY created_at ASC",
            [runId]
        );
        return (rows as DbArtifactRow[]).map(rowToArtifact);
    }

    async getOwned(userId: number, artifactId: number): Promise<StudioArtifactRow | null> {
        const [rows] = await pool.query(
            `SELECT a.* FROM studio_artifacts a
             INNER JOIN studio_runs r ON r.id = a.run_id
             WHERE a.id = ? AND r.user_id = ? LIMIT 1`,
            [artifactId, userId]
        );
        const list = rows as DbArtifactRow[];
        return list[0] ? rowToArtifact(list[0]) : null;
    }

    async updateMarkdown(userId: number, artifactId: number, markdown: string): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE studio_artifacts a
             INNER JOIN studio_runs r ON r.id = a.run_id
             SET a.markdown = ?
             WHERE a.id = ? AND r.user_id = ?`,
            [markdown, artifactId, userId]
        );
        return result.affectedRows > 0;
    }
}

export default new StudioArtifactService();
