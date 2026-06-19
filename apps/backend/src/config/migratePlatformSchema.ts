import type {PoolConnection} from "mysql2/promise";
import {PLATFORM_TABLE_DDL} from "./platformTableDefs.js";

export async function migratePlatformSchema(connection: PoolConnection): Promise<void> {
    for (const ddl of PLATFORM_TABLE_DDL) {
        await connection.query(ddl);
    }
}
