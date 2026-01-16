import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";

import * as schema from "./schema.d1.js";

export type D1Client = ReturnType<typeof drizzle<typeof schema>>;

export function createD1Client(db: D1Database): D1Client {
  return drizzle(db, { schema });
}
