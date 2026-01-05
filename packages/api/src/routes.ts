import type { FastifyInstance } from "fastify";

import {
  dailyReportQuerySchema,
  sessionSchema,
  settingsSchema,
  syncPullBodySchema,
  syncPushBodySchema,
  taskSchema,
  timerStartBodySchema,
  timerStopBodySchema,
  weeklyReportQuerySchema,
} from "@ticktick/shared";

import { nowIso } from "@ticktick/shared";

import { createDbClient } from "./db/client.js";
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

  app.get("/api/health", async () => ({ ok: true }));

  // --- Tasks ---
  app.get("/api/tasks", async () => {
    return { tasks: await taskRepo.listTasks() };
  });

  app.put("/api/tasks/:id", async (req) => {
    const task = taskSchema.parse((req as any).body);
    return { task: await taskRepo.upsertTask(task) };
  });

  app.delete("/api/tasks/:id", async (req) => {
    // Soft delete keeps offline sync resilient.
    const id = (req as any).params?.id as string | undefined;
    const deletedAtIso = nowIso();
    if (id != null) {
      await taskRepo.softDeleteTask(id, deletedAtIso);
    }
    return { ok: true };
  });

  // --- Sessions ---
  app.get("/api/sessions", async (req) => {
    const query = (req as any).query as
      | { from?: string; to?: string }
      | undefined;
    return {
      sessions: await sessionRepo.listSessions({
        fromIso: query?.from,
        toIso: query?.to,
      }),
    };
  });

  app.put("/api/sessions/:id", async (req) => {
    const session = sessionSchema.parse((req as any).body);
    return { session: await sessionRepo.upsertSession(session) };
  });

  app.delete("/api/sessions/:id", async (req) => {
    const id = (req as any).params?.id as string | undefined;
    const deletedAtIso = nowIso();
    if (id != null) {
      await sessionRepo.softDeleteSession(id, deletedAtIso);
    }
    return { ok: true };
  });

  // --- Settings ---
  app.get("/api/settings", async () => {
    return { settings: await settingsRepo.getSettings() };
  });

  app.put("/api/settings", async (req) => {
    const settings = settingsSchema.parse((req as any).body);
    return { settings: await settingsRepo.upsertSettings(settings) };
  });

  // --- Timer convenience ---
  app.post("/api/timer/start", async (req) => {
    const body = timerStartBodySchema.parse((req as any).body);
    // In v1, start is equivalent to upserting a timer-session with endAt=null.
    // Idempotency should be enforced by sessionId at the client boundary.
    return { ok: true, sessionId: body.sessionId };
  });

  app.post("/api/timer/stop", async (req) => {
    const body = timerStopBodySchema.parse((req as any).body);
    return { ok: true, sessionId: body.sessionId };
  });

  // --- Sync ---
  app.post("/api/sync/push", async (req) => {
    const body = syncPushBodySchema.parse((req as any).body);
    // TODO: apply mutations to DB; for MVP scaffolding we accept and echo.
    return {
      applied: body.mutations.map((m) => m.id),
      rejected: [],
      serverTs: nowIso(),
    };
  });

  app.post("/api/sync/pull", async (req) => {
    syncPullBodySchema.parse((req as any).body);
    return {
      tasks: await taskRepo.listTasks(),
      sessions: await sessionRepo.listSessions(),
      settings: await settingsRepo.getSettings(),
      serverTs: nowIso(),
    };
  });

  // --- Reports ---
  app.get("/api/reports/daily", async (req) => {
    dailyReportQuerySchema.parse((req as any).query);
    return {
      date: (req as any).query?.date ?? null,
      totalsByTask: [],
      totalSeconds: 0,
    };
  });

  app.get("/api/reports/weekly", async (req) => {
    weeklyReportQuerySchema.parse((req as any).query);
    return {
      weekStart: (req as any).query?.weekStart ?? null,
      totalsByDay: [],
      totalsByTask: [],
    };
  });
}
