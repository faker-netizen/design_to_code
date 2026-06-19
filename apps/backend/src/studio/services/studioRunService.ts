import type {ResultSetHeader, RowDataPacket} from "mysql2";
import pool from "../../config/database.js";
import type {Plan} from "../types/plan.js";

export type StudioRunStatus = "pending" | "running" | "completed" | "failed" | "aborted";

export type StudioRunRow = {
    id: number;
    project_id: number;
    user_id: number;
    user_query: string;
    plan_json: Plan | null;
    status: StudioRunStatus;
    error_message: string | null;
    started_at: Date | null;
    finished_at: Date | null;
    created_at: Date;
};

type DbRunRow = Omit<StudioRunRow, "plan_json"> & {plan_json: string | Plan | null};

function rowToRun(row: DbRunRow): StudioRunRow {
    let plan: Plan | null = null;
    if (row.plan_json) {
        plan = typeof row.plan_json === "string" ? (JSON.parse(row.plan_json) as Plan) : row.plan_json;
    }
    return {...row, plan_json: plan};
}

class StudioRunService {
    async createRun(projectId: number, userId: number, userQuery: string): Promise<number> {
        const trimmed = userQuery.trim();
        if (!trimmed) throw new Error("userQuery 不能为空");
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO studio_runs (project_id, user_id, user_query, status)
             VALUES (?, ?, ?, 'pending')`,
            [projectId, userId, trimmed]
        );
        return result.insertId;
    }

    async markRunning(runId: number, plan: Plan): Promise<void> {
        await pool.query(
            `UPDATE studio_runs
             SET status = 'running', plan_json = ?, started_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [JSON.stringify(plan), runId]
        );
    }

    async markCompleted(runId: number): Promise<void> {
        await pool.query(
            `UPDATE studio_runs SET status = 'completed', finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [runId]
        );
    }

    async markFailed(runId: number, message: string): Promise<void> {
        await pool.query(
            `UPDATE studio_runs
             SET status = 'failed', error_message = ?, finished_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [message.slice(0, 2000), runId]
        );
    }

    async markAborted(runId: number): Promise<void> {
        await pool.query(
            `UPDATE studio_runs SET status = 'aborted', finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [runId]
        );
    }

    async getOwned(userId: number, runId: number): Promise<StudioRunRow | null> {
        const [rows] = await pool.query(
            "SELECT * FROM studio_runs WHERE id = ? AND user_id = ? LIMIT 1",
            [runId, userId]
        );
        const list = rows as DbRunRow[];
        return list[0] ? rowToRun(list[0]) : null;
    }

    async listForProject(userId: number, projectId: number): Promise<StudioRunRow[]> {
        const [rows] = await pool.query(
            `SELECT r.* FROM studio_runs r
             INNER JOIN studio_projects p ON p.id = r.project_id
             WHERE r.project_id = ? AND p.user_id = ?
             ORDER BY r.created_at DESC`,
            [projectId, userId]
        );
        return (rows as DbRunRow[]).map(rowToRun);
    }

    async upsertStep(
        runId: number,
        stepId: string,
        worker: string,
        patch: {
            status: "pending" | "running" | "completed" | "failed" | "skipped";
            handoffJson?: Record<string, unknown>;
            reactTraceJson?: unknown[];
            stepSummary?: string;
            durationMs?: number;
        }
    ): Promise<void> {
        await pool.query(
            `INSERT INTO studio_run_steps
             (run_id, step_id, worker, status, handoff_json, react_trace_json, step_summary, duration_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status),
               handoff_json = VALUES(handoff_json),
               react_trace_json = VALUES(react_trace_json),
               step_summary = VALUES(step_summary),
               duration_ms = VALUES(duration_ms),
               updated_at = CURRENT_TIMESTAMP`,
            [
                runId,
                stepId,
                worker,
                patch.status,
                patch.handoffJson ? JSON.stringify(patch.handoffJson) : null,
                patch.reactTraceJson ? JSON.stringify(patch.reactTraceJson) : null,
                patch.stepSummary ?? null,
                patch.durationMs ?? null,
            ]
        );
    }

    async listSteps(runId: number): Promise<RowDataPacket[]> {
        const [rows] = await pool.query(
            "SELECT * FROM studio_run_steps WHERE run_id = ? ORDER BY id ASC",
            [runId]
        );
        return rows as RowDataPacket[];
    }
}

export default new StudioRunService();
