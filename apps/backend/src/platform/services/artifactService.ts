import type {ResultSetHeader, RowDataPacket} from "mysql2";
import pool from "../../config/database.js";

type ArtifactRow = RowDataPacket & {
    id: number;
    run_id: number;
    title: string;
    content_markdown: string;
};

/** write_artifact 工具：写入 platform_artifacts，返回 artifactId */
async function saveArtifact(runId: number, title: string, markdown: string): Promise<number> {
    const [row] = await pool.query<ResultSetHeader>(
        `INSERT INTO platform_artifacts (run_id, title, content_markdown) VALUES (?, ?, ?)`,
        [runId, title.slice(0, 512), markdown]
    );
    return row.insertId;
}

/** 按 runId 隔离查询单条产物 */
async function getArtifact(runId: number, artifactId: number): Promise<ArtifactRow | null> {
    const [rows] = await pool.query<ArtifactRow[]>(
        `SELECT * FROM platform_artifacts WHERE id = ? AND run_id = ? LIMIT 1`,
        [artifactId, runId]
    );
    return rows[0] ?? null;
}

const artifactService = {saveArtifact, getArtifact};

export default artifactService;
