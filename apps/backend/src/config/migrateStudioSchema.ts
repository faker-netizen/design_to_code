import type {PoolConnection} from "mysql2/promise";
import type {RowDataPacket} from "mysql2";
import {getBuiltinPlanTemplates} from "../studio/planner/planTemplates.js";
import {
    STUDIO_ARTIFACTS_DDL,
    STUDIO_MATERIALS_DDL,
    STUDIO_PROJECTS_DDL,
    STUDIO_RUNS_DDL,
    STUDIO_RUN_STEPS_DDL,
    STUDIO_TEMPLATES_DDL,
} from "./studioTableDefs.js";

async function tableExists(connection: PoolConnection, table: string): Promise<boolean> {
    const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [table]
    );
    return rows.length > 0;
}

async function ensureTable(connection: PoolConnection, table: string, ddl: string): Promise<void> {
    if (await tableExists(connection, table)) return;
    await connection.query(ddl);
}

async function seedStudioTemplates(connection: PoolConnection): Promise<void> {
    for (const tpl of getBuiltinPlanTemplates()) {
        const [rows] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM studio_workflow_templates WHERE id = ? LIMIT 1",
            [tpl.id]
        );
        if (rows.length) continue;
        await connection.query(
            `INSERT INTO studio_workflow_templates
             (id, name, description, plan_json, default_search_profile_json)
             VALUES (?, ?, ?, ?, ?)`,
            [
                tpl.id,
                tpl.name,
                tpl.description,
                JSON.stringify(tpl.plan),
                tpl.defaultSearchProfile ? JSON.stringify(tpl.defaultSearchProfile) : null,
            ]
        );
    }
}

export async function migrateStudioSchema(connection: PoolConnection): Promise<void> {
    await ensureTable(connection, "studio_projects", STUDIO_PROJECTS_DDL);
    await ensureTable(connection, "studio_workflow_templates", STUDIO_TEMPLATES_DDL);
    await ensureTable(connection, "studio_runs", STUDIO_RUNS_DDL);
    await ensureTable(connection, "studio_run_steps", STUDIO_RUN_STEPS_DDL);
    await ensureTable(connection, "studio_materials", STUDIO_MATERIALS_DDL);
    await ensureTable(connection, "studio_artifacts", STUDIO_ARTIFACTS_DDL);
    await seedStudioTemplates(connection);
}
