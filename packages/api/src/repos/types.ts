import type { Session, Settings, Task } from "@ticktick/shared";

export type TaskRepo = {
  listTasks(): Promise<Task[]>;
  upsertTask(task: Task): Promise<Task>;
  softDeleteTask(id: string, deletedAtIso: string): Promise<void>;
};

export type SessionRepo = {
  listSessions(range?: { fromIso?: string; toIso?: string }): Promise<Session[]>;
  upsertSession(session: Session): Promise<Session>;
  softDeleteSession(id: string, deletedAtIso: string): Promise<void>;
};

export type SettingsRepo = {
  getSettings(): Promise<Settings | null>;
  upsertSettings(settings: Settings): Promise<Settings>;
};


