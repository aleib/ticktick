import Dexie, { type Table } from "dexie";

import type {
  RunningTimerState,
  Session,
  Settings,
  Task,
} from "@ticktick/shared";

export type OutboxMutationRow = {
  id: string; // UUID
  deviceId: string;
  op: "upsert" | "delete";
  entityType: "task" | "session" | "settings";
  entityId: string | null;
  payload: unknown;
  clientTs: string; // ISO datetime

  status: "pending" | "applied" | "rejected";
  error: string | null;
};

export type SyncStateRow = {
  id: "singleton";
  deviceId: string;
  lastServerTs: string | null; // ISO datetime
  updatedAt: string; // ISO datetime
};

/**
 * IndexedDB is the source of truth for the web app.
 *
 * Intent: all user actions persist here first (tasks/sessions/settings),
 * plus an outbox mutation log for eventual sync.
 */
export class TickTickDb extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<Session, string>;
  settings!: Table<Settings, true>;

  runningTimer!: Table<RunningTimerState, "singleton">;
  outbox!: Table<OutboxMutationRow, string>;
  syncState!: Table<SyncStateRow, "singleton">;

  constructor() {
    super("ticktick");

    this.version(1).stores({
      tasks: "id, updatedAt, deletedAt, isArchived",
      sessions: "id, taskId, startAt, updatedAt, deletedAt",
      settings: "singletonId",
      runningTimer: "id",
      outbox: "id, status, clientTs, entityType, entityId",
      syncState: "id",
    });
  }
}

export const db = new TickTickDb();
