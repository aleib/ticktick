/**
 * TickTick shared domain model.
 *
 * Intent: keep the core entities portable across web (IndexedDB) and API (Postgres/D1),
 * so we can validate and evolve contracts in one place.
 */

export type Uuid = string;

export type IsoDateString = string; // YYYY-MM-DD (date-only, no time)

export type TaskId = Uuid;
export type SessionId = Uuid;

export type Task = {
  id: TaskId;
  title: string;
  description: string | null;
  category: string | null;

  /**
   * Recurrence is optional and intentionally not full RFC RRULE for MVP.
   * It's a simple interoperable shape that can evolve without breaking storage.
   */
  recurrenceRule: RecurrenceRule | null;

  targetDailyMinutes: number | null;
  targetWeeklyMinutes: number | null;

  isArchived: boolean;

  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  deletedAt: string | null; // ISO datetime
};

export type SessionKind = "normal" | "pomodoro";
export type SessionSource = "timer" | "manual";

export type Session = {
  id: SessionId;
  taskId: TaskId;
  startAt: string; // ISO datetime (UTC instant)
  endAt: string | null; // ISO datetime (UTC instant)
  durationSeconds: number | null;
  kind: SessionKind;
  source: SessionSource;
  note: string | null;

  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  deletedAt: string | null; // ISO datetime
};

export type Settings = {
  singletonId: true;

  /**
   * Timezone strategy for reporting. For MVP we default to 'local' and compute
   * week/day boundaries in the current device timezone.
   */
  timezone: "local" | string;
  weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO weekday (1=Mon ... 7=Sun)
  idlePauseSeconds: number;

  pomodoroWorkMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroLongBreakEvery: number;

  notificationsEnabled: boolean;

  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

export type RecurrenceRule =
  | {
      freq: "WEEKLY";
      /**
       * ISO weekdays (1=Mon ... 7=Sun). If omitted, defaults to the task's creation weekday.
       */
      byWeekdays?: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
      interval?: number; // every N weeks
    }
  | {
      freq: "DAILY";
      interval?: number; // every N days
    };

export type MutationOp = "upsert" | "delete";
export type EntityType = "task" | "session" | "settings";

export type Mutation = {
  id: Uuid;
  deviceId: string;
  op: MutationOp;
  entityType: EntityType;
  entityId: Uuid | null;
  payload: unknown;
  clientTs: string; // ISO datetime
};

export type RunningTimerState = {
  /**
   * Singleton row id. We don't rely on it elsewhere; it only exists to make Dexie modeling easy.
   */
  id: "singleton";
  sessionId: SessionId;
  taskId: TaskId;
  kind: SessionKind;

  startedAtUtc: string; // ISO datetime
  accumulatedSeconds: number; // excludes current run slice
  isRunning: boolean;
  lastTickPerfNow: number | null;

  pomodoro:
    | {
        phase: "work" | "shortBreak" | "longBreak";
        remainingSeconds: number;
        cycleCount: number; // completed work phases
      }
    | null;

  updatedAt: string; // ISO datetime
};


