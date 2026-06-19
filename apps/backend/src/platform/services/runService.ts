import type {ResultSetHeader, RowDataPacket} from "mysql2";
import pool from "../../config/database.js";
import type {PlatformRunStatus} from "../types.js";

export type PlatformRunRow = RowDataPacket & {
    id: number;
    user_id: number;
    skill_id: string;
    user_message: string;
    status: PlatformRunStatus;
    reply: string | null;
    error_message: string | null;
    created_at: Date;
    finished_at: Date | null;
};

/** 插入 platform_runs，status=running，返回 runId */
async function createRun(userId: number, skillId: string, userMessage: string): Promise<number> {
    const [row] = await pool.query<ResultSetHeader>(
        `INSERT INTO platform_runs (user_id, skill_id, user_message, status)
         VALUES (?, ?, ?, 'running')`,
        [userId, skillId, userMessage]
    );
    return row.insertId;
}

/** 持久化单条 tool trace 到 platform_run_steps */
async function appendStep(
    runId: number,
    stepIndex: number,
    eventType: string,
    payload: Record<string, unknown>
): Promise<void> {
    await pool.query(
        `INSERT INTO platform_run_steps (run_id, step_index, event_type, payload_json)
         VALUES (?, ?, ?, ?)`,
        [runId, stepIndex, eventType, JSON.stringify(payload)]
    );
}

/** 更新 Run 终态：status、reply、error_message、finished_at */
async function finishRun(
    runId: number,
    status: PlatformRunStatus,
    reply: string | null,
    errorMessage?: string
): Promise<void> {
    await pool.query(
        `UPDATE platform_runs
         SET status = ?, reply = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, reply, errorMessage ?? null, runId]
    );
}

/** 按 userId + runId 查询 Run（租户隔离） */
async function getRun(userId: number, runId: number): Promise<PlatformRunRow | null> {
    const [rows] = await pool.query<PlatformRunRow[]>(
        `SELECT * FROM platform_runs WHERE id = ? AND user_id = ? LIMIT 1`,
        [runId, userId]
    );
    return rows[0] ?? null;
}

const runService = {createRun, appendStep, finishRun, getRun};

export default runService;
