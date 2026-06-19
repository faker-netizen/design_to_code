import type {ResultSetHeader} from "mysql2";
import pool from "../../config/database.js";
import {
    DEFAULT_SEARCH_PROFILE,
    mergeSearchProfile,
    parseSearchProfile,
    type SearchProfile,
} from "../types/searchProfile.js";
import {DEFAULT_TEMPLATE_ID} from "../planner/planTemplates.js";

export type StudioProjectRow = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    search_profile_json: SearchProfile;
    default_template_id: string | null;
    kb_id: number | null;
    created_at: Date;
    updated_at: Date;
};

type DbProjectRow = Omit<StudioProjectRow, "search_profile_json"> & {
    search_profile_json: string | SearchProfile;
};

function rowToProject(row: DbProjectRow): StudioProjectRow {
    const profile =
        typeof row.search_profile_json === "string"
            ? parseSearchProfile(JSON.parse(row.search_profile_json))
            : parseSearchProfile(row.search_profile_json);
    return {...row, search_profile_json: profile};
}

class StudioProjectService {
    async listForUser(userId: number): Promise<StudioProjectRow[]> {
        const [rows] = await pool.query(
            "SELECT * FROM studio_projects WHERE user_id = ? ORDER BY updated_at DESC",
            [userId]
        );
        return (rows as DbProjectRow[]).map(rowToProject);
    }

    async create(
        userId: number,
        input: {name: string; description?: string; kbId?: number; templateId?: string}
    ): Promise<number> {
        const name = input.name.trim();
        if (!name) throw new Error("项目名称不能为空");
        const profile: SearchProfile = {
            ...DEFAULT_SEARCH_PROFILE,
            kbIds: input.kbId ? [input.kbId] : [],
        };
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO studio_projects
             (user_id, name, description, search_profile_json, default_template_id, kb_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                name,
                input.description?.trim() || null,
                JSON.stringify(profile),
                input.templateId ?? DEFAULT_TEMPLATE_ID,
                input.kbId ?? null,
            ]
        );
        return result.insertId;
    }

    async getOwned(userId: number, projectId: number): Promise<StudioProjectRow | null> {
        const [rows] = await pool.query(
            "SELECT * FROM studio_projects WHERE id = ? AND user_id = ? LIMIT 1",
            [projectId, userId]
        );
        const list = rows as DbProjectRow[];
        return list[0] ? rowToProject(list[0]) : null;
    }

    async update(
        userId: number,
        projectId: number,
        patch: {name?: string; description?: string; defaultTemplateId?: string; kbId?: number | null}
    ): Promise<boolean> {
        const existing = await this.getOwned(userId, projectId);
        if (!existing) return false;

        const name = patch.name?.trim() ?? existing.name;
        const description =
            patch.description !== undefined ? patch.description.trim() || null : existing.description;
        const defaultTemplateId = patch.defaultTemplateId ?? existing.default_template_id;
        const kbId = patch.kbId !== undefined ? patch.kbId : existing.kb_id;

        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE studio_projects
             SET name = ?, description = ?, default_template_id = ?, kb_id = ?
             WHERE id = ? AND user_id = ?`,
            [name, description, defaultTemplateId, kbId, projectId, userId]
        );
        return result.affectedRows > 0;
    }

    async updateSearchProfile(
        userId: number,
        projectId: number,
        profile: SearchProfile
    ): Promise<boolean> {
        const parsed = parseSearchProfile(profile);
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE studio_projects SET search_profile_json = ? WHERE id = ? AND user_id = ?`,
            [JSON.stringify(parsed), projectId, userId]
        );
        return result.affectedRows > 0;
    }

    async mergeSearchProfile(
        userId: number,
        projectId: number,
        patch: Partial<SearchProfile>
    ): Promise<SearchProfile | null> {
        const existing = await this.getOwned(userId, projectId);
        if (!existing) return null;
        const merged = mergeSearchProfile(existing.search_profile_json, patch);
        await this.updateSearchProfile(userId, projectId, merged);
        return merged;
    }

    async delete(userId: number, projectId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            "DELETE FROM studio_projects WHERE id = ? AND user_id = ?",
            [projectId, userId]
        );
        return result.affectedRows > 0;
    }
}

export default new StudioProjectService();
