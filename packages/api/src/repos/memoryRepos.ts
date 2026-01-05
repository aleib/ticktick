import type { Session, Settings, Task } from "@ticktick/shared";

import type { SessionRepo, SettingsRepo, TaskRepo } from "./types.js";

/**
 * Memory repos are a dev-only fallback when `DATABASE_URL` isn't configured.
 *
 * Intent: keep API usable for UI development without blocking on DB setup.
 * Production should always use a real DB repository implementation.
 */
export function createMemoryRepos(): {
  taskRepo: TaskRepo;
  sessionRepo: SessionRepo;
  settingsRepo: SettingsRepo;
} {
  const tasks = new Map<string, Task>();
  const sessions = new Map<string, Session>();
  let settings: Settings | null = null;

  return {
    taskRepo: {
      async listTasks() {
        return [...tasks.values()].filter((t) => t.deletedAt == null);
      },
      async upsertTask(task) {
        tasks.set(task.id, task);
        return task;
      },
      async softDeleteTask(id, deletedAtIso) {
        const t = tasks.get(id);
        if (t == null) return;
        tasks.set(id, { ...t, deletedAt: deletedAtIso, updatedAt: deletedAtIso });
      }
    },
    sessionRepo: {
      async listSessions(range) {
        const all = [...sessions.values()].filter((s) => s.deletedAt == null);
        const fromMs = range?.fromIso != null ? new Date(range.fromIso).getTime() : null;
        const toMs = range?.toIso != null ? new Date(range.toIso).getTime() : null;
        return all.filter((s) => {
          const startMs = new Date(s.startAt).getTime();
          if (fromMs != null && startMs < fromMs) return false;
          if (toMs != null && startMs > toMs) return false;
          return true;
        });
      },
      async upsertSession(session) {
        sessions.set(session.id, session);
        return session;
      },
      async softDeleteSession(id, deletedAtIso) {
        const s = sessions.get(id);
        if (s == null) return;
        sessions.set(id, { ...s, deletedAt: deletedAtIso, updatedAt: deletedAtIso });
      }
    },
    settingsRepo: {
      async getSettings() {
        return settings;
      },
      async upsertSettings(next) {
        settings = next;
        return next;
      }
    }
  };
}


