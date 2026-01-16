import {
  dailyReportQuerySchema,
  sessionSchema,
  settingsSchema,
  syncPullBodySchema,
  syncPushBodySchema,
  taskSchema,
  timerStartBodySchema,
  timerStopBodySchema,
  weeklyReportQuerySchema
} from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

import type { SessionRepo, SettingsRepo, TaskRepo } from "./repos/types.js";

export type ApiHandlerContext = {
  taskRepo: TaskRepo;
  sessionRepo: SessionRepo;
  settingsRepo: SettingsRepo;
};

export type QueryParams = Record<string, string | undefined>;

/**
 * Shared API handlers for any runtime (Fastify, Workers).
 */
export function createApiHandlers({ taskRepo, sessionRepo, settingsRepo }: ApiHandlerContext) {
  return {
    async health() {
      return { ok: true };
    },
    async listTasks() {
      return { tasks: await taskRepo.listTasks() };
    },
    async upsertTask(body: unknown) {
      const task = taskSchema.parse(body);
      return { task: await taskRepo.upsertTask(task) };
    },
    async deleteTask(id?: string) {
      const deletedAtIso = nowIso();
      if (id != null) {
        await taskRepo.softDeleteTask(id, deletedAtIso);
      }
      return { ok: true };
    },
    async listSessions(query?: QueryParams) {
      return {
        sessions: await sessionRepo.listSessions({
          fromIso: query?.from,
          toIso: query?.to
        })
      };
    },
    async upsertSession(body: unknown) {
      const session = sessionSchema.parse(body);
      return { session: await sessionRepo.upsertSession(session) };
    },
    async deleteSession(id?: string) {
      const deletedAtIso = nowIso();
      if (id != null) {
        await sessionRepo.softDeleteSession(id, deletedAtIso);
      }
      return { ok: true };
    },
    async getSettings() {
      return { settings: await settingsRepo.getSettings() };
    },
    async upsertSettings(body: unknown) {
      const settings = settingsSchema.parse(body);
      return { settings: await settingsRepo.upsertSettings(settings) };
    },
    async timerStart(body: unknown) {
      const parsed = timerStartBodySchema.parse(body);
      return { ok: true, sessionId: parsed.sessionId };
    },
    async timerStop(body: unknown) {
      const parsed = timerStopBodySchema.parse(body);
      return { ok: true, sessionId: parsed.sessionId };
    },
    async syncPush(body: unknown) {
      const parsed = syncPushBodySchema.parse(body);
      return {
        applied: parsed.mutations.map((m) => m.id),
        rejected: [],
        serverTs: nowIso()
      };
    },
    async syncPull(body: unknown) {
      syncPullBodySchema.parse(body);
      return {
        tasks: await taskRepo.listTasks(),
        sessions: await sessionRepo.listSessions(),
        settings: await settingsRepo.getSettings(),
        serverTs: nowIso()
      };
    },
    async dailyReport(query?: QueryParams) {
      dailyReportQuerySchema.parse(query ?? {});
      return {
        date: query?.date ?? null,
        totalsByTask: [],
        totalSeconds: 0
      };
    },
    async weeklyReport(query?: QueryParams) {
      weeklyReportQuerySchema.parse(query ?? {});
      return {
        weekStart: query?.weekStart ?? null,
        totalsByDay: [],
        totalsByTask: []
      };
    }
  };
}
