import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a DB client from env var `DATABASE_URL`.
 *
 * Intent: keep initialization isolated so we can swap drivers later (e.g., D1 adapter).
 */
export function createDbClient(): DbClient | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl == null || databaseUrl.trim() === "") return null;

  const pool = new pg.Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}


