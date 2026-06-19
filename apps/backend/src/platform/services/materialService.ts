import type {ResultSetHeader, RowDataPacket} from "mysql2";
import pool from "../../config/database.js";
import {MATERIAL_MAX_CHARS, READ_TEXT_MAX_CHARS} from "../context/runContext.js";

type MaterialRow = RowDataPacket & {
    id: number;
    run_id: number;
    source_url: string | null;
    title: string | null;
    content_text: string;
};

/** 超长正文截断并附加提示 */
function truncateText(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max)}\n\n[内容已截断]`;
}

/** fetch_url 后写入 platform_materials，返回 materialId */
async function saveMaterial(
    runId: number,
    input: {sourceUrl?: string; title?: string; content: string}
): Promise<number> {
    const content = truncateText(input.content, MATERIAL_MAX_CHARS);
    const [row] = await pool.query<ResultSetHeader>(
        `INSERT INTO platform_materials (run_id, source_url, title, content_text)
         VALUES (?, ?, ?, ?)`,
        [runId, input.sourceUrl ?? null, input.title ?? null, content]
    );
    return row.insertId;
}

/** 按 runId 隔离查询单条材料 */
async function getMaterial(runId: number, materialId: number): Promise<MaterialRow | null> {
    const [rows] = await pool.query<MaterialRow[]>(
        `SELECT * FROM platform_materials
         WHERE id = ? AND run_id = ? LIMIT 1`,
        [materialId, runId]
    );
    return rows[0] ?? null;
}

/** read_text 工具：读材料正文（带 READ_TEXT_MAX_CHARS 截断） */
async function readMaterialText(runId: number, materialId: number): Promise<string | null> {
    const row = await getMaterial(runId, materialId);
    if (!row) return null;
    return truncateText(row.content_text, READ_TEXT_MAX_CHARS);
}

const materialService = {saveMaterial, getMaterial, readMaterialText};

export default materialService;
