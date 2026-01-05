import { and, eq, isNull, lte, gte } from "drizzle-orm";

import type { Session, Settings, Task } from "@ticktick/shared";

import type { DbClient } from "../db/client.js";
import { sessions, settings, tasks } from "../db/schema.js";
import type { SessionRepo, SettingsRepo, TaskRepo } from "./types.js";

/**
 * Postgres repo implementations.
 *
 * Intent: keep CRUD extremely boring and portable. Soft-deletes support safer offline sync.
 */

export function createPostgresRepos(db: DbClient): {
  taskRepo: TaskRepo;
  sessionRepo: SessionRepo;
  settingsRepo: SettingsRepo;
} {
  return {
    taskRepo: {
      async listTasks() {
        const rows = await db.select().from(tasks).where(isNull(tasks.deletedAt));
        return rows.map(toTask);
      },
      async upsertTask(task) {
        await db
          .insert(tasks)
          .values(fromTask(task))
          .onConflictDoUpdate({
            target: tasks.id,
            set: fromTask(task)
          });
        return task;
      },
      async softDeleteTask(id, deletedAtIso) {
        await db
          .update(tasks)
          .set({ deletedAt: deletedAtIso, updatedAt: deletedAtIso })
          .where(eq(tasks.id, id));
      }
    },
    sessionRepo: {
      async listSessions(range) {
        const whereParts = [isNull(sessions.deletedAt)];
        if (range?.fromIso != null) whereParts.push(gte(sessions.startAt, range.fromIso));
        if (range?.toIso != null) whereParts.push(lte(sessions.startAt, range.toIso));

        const rows = await db.select().from(sessions).where(and(...whereParts));
        return rows.map(toSession);
      },
      async upsertSession(session) {
        await db
          .insert(sessions)
          .values(fromSession(session))
          .onConflictDoUpdate({
            target: sessions.id,
            set: fromSession(session)
          });
        return session;
      },
      async softDeleteSession(id, deletedAtIso) {
        await db
          .update(sessions)
          .set({ deletedAt: deletedAtIso, updatedAt: deletedAtIso })
          .where(eq(sessions.id, id));
      }
    },
    settingsRepo: {
      async getSettings() {
        const rows = await db.select().from(settings).limit(1);
        return rows[0] != null ? toSettings(rows[0]) : null;
      },
      async upsertSettings(next) {
        await db
          .insert(settings)
          .values(fromSettings(next))
          .onConflictDoUpdate({
            target: settings.singletonId,
            set: fromSettings(next)
          });
        return next;
      }
    }
  };
}

function toTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category ?? null,
    recurrenceRule: (row.recurrenceRule as any) ?? null,
    targetDailyMinutes: row.targetDailyMinutes ?? null,
    targetWeeklyMinutes: row.targetWeeklyMinutes ?? null,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null
  };
}

function fromTask(task: Task): typeof tasks.$inferInsert {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    category: task.category ?? null,
    recurrenceRule: task.recurrenceRule as any,
    targetDailyMinutes: task.targetDailyMinutes ?? null,
    targetWeeklyMinutes: task.targetWeeklyMinutes ?? null,
    isArchived: task.isArchived,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt ?? null
  };
}

function toSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    taskId: row.taskId,
    startAt: row.startAt,
    endAt: row.endAt ?? null,
    durationSeconds: row.durationSeconds ?? null,
    kind: row.kind as any,
    source: row.source as any,
    note: row.note ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null
  };
}

function fromSession(session: Session): typeof sessions.$inferInsert {
  return {
    id: session.id,
    taskId: session.taskId,
    startAt: session.startAt,
    endAt: session.endAt ?? null,
    durationSeconds: session.durationSeconds ?? null,
    kind: session.kind,
    source: session.source,
    note: session.note ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    deletedAt: session.deletedAt ?? null
  };
}

function toSettings(row: typeof settings.$inferSelect): Settings {
  return {
    singletonId: "singleton",
    timezone: row.timezone,
    weekStartsOn: row.weekStartsOn as any,
    idlePauseSeconds: row.idlePauseSeconds,
    pomodoroWorkMinutes: row.pomodoroWorkMinutes,
    pomodoroShortBreakMinutes: row.pomodoroShortBreakMinutes,
    pomodoroLongBreakMinutes: row.pomodoroLongBreakMinutes,
    pomodoroLongBreakEvery: row.pomodoroLongBreakEvery,
    notificationsEnabled: row.notificationsEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function fromSettings(s: Settings): typeof settings.$inferInsert {
  return {
    singletonId: true,
    timezone: s.timezone,
    weekStartsOn: s.weekStartsOn,
    idlePauseSeconds: s.idlePauseSeconds,
    pomodoroWorkMinutes: s.pomodoroWorkMinutes,
    pomodoroShortBreakMinutes: s.pomodoroShortBreakMinutes,
    pomodoroLongBreakMinutes: s.pomodoroLongBreakMinutes,
    pomodoroLongBreakEvery: s.pomodoroLongBreakEvery,
    notificationsEnabled: s.notificationsEnabled,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}


