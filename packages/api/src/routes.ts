import type { FastifyInstance } from "fastify";

import { createDbClient } from "./db/client.js";
import { createApiHandlers } from "./handlers.js";
import { createMemoryRepos } from "./repos/memoryRepos.js";
import { createPostgresRepos } from "./repos/postgresRepos.js";

/**
 * v1 routes are intentionally lightweight and JSON-only.
 *
 * Intent: keep endpoint contracts stable so we can reuse them for future RN clients
 * and (later) move implementation to Cloudflare Workers with minimal surface changes.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const db = createDbClient();
  const { taskRepo, sessionRepo, settingsRepo } =
    db != null ? createPostgresRepos(db) : createMemoryRepos();
  const handlers = createApiHandlers({ taskRepo, sessionRepo, settingsRepo });

  app.get("/api/health", async () => handlers.health());

  // --- Tasks ---
  app.get("/api/tasks", async () => {
    return handlers.listTasks();
  });

  app.put("/api/tasks/:id", async (req) => {
    return handlers.upsertTask((req as any).body);
  });

  app.delete("/api/tasks/:id", async (req) => {
    const id = (req as any).params?.id as string | undefined;
    return handlers.deleteTask(id);
  });

  // --- Sessions ---
  app.get("/api/sessions", async (req) => {
    const query = (req as any).query as { from?: string; to?: string } | undefined;
    return handlers.listSessions(query);
  });

  app.put("/api/sessions/:id", async (req) => {
    return handlers.upsertSession((req as any).body);
  });

  app.delete("/api/sessions/:id", async (req) => {
    const id = (req as any).params?.id as string | undefined;
    return handlers.deleteSession(id);
  });

  // --- Settings ---
  app.get("/api/settings", async () => {
    return handlers.getSettings();
  });

  app.put("/api/settings", async (req) => {
    return handlers.upsertSettings((req as any).body);
  });

  // --- Timer convenience ---
  app.post("/api/timer/start", async (req) => {
    return handlers.timerStart((req as any).body);
  });

  app.post("/api/timer/stop", async (req) => {
    return handlers.timerStop((req as any).body);
  });

  // --- Sync ---
  app.post("/api/sync/push", async (req) => {
    return handlers.syncPush((req as any).body);
  });

  app.post("/api/sync/pull", async (req) => {
    return handlers.syncPull((req as any).body);
  });

  // --- Reports ---
  app.get("/api/reports/daily", async (req) => {
    return handlers.dailyReport((req as any).query);
  });

  app.get("/api/reports/weekly", async (req) => {
    return handlers.weeklyReport((req as any).query);
  });
}
