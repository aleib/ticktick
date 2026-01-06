import { z } from "zod";

import type {
  EntityType,
  Mutation,
  MutationOp,
  RecurrenceRule,
  RunningTimerState,
  Session,
  SessionKind,
  SessionSource,
  Settings,
  Task,
} from "./model";

const uuidSchema = z.string().uuid();

const isoDatetimeSchema = z.string().datetime({ offset: true });
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected YYYY-MM-DD");

// `z.unknown()` accepts `undefined`, which makes object properties effectively optional.
// We use this to ensure required presence while keeping payload shape flexible for MVP.
const requiredUnknownSchema = z
  .unknown()
  .refine((v) => v !== undefined, "Required");

type MutationInput = Omit<Mutation, "payload"> & { payload?: unknown };

export const recurrenceRuleSchema: z.ZodType<RecurrenceRule> = z.union([
  z.object({
    freq: z.literal("WEEKLY"),
    byWeekdays: z
      .array(
        z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
          z.literal(7),
        ])
      )
      .optional(),
    interval: z.number().int().positive().optional(),
  }),
  z.object({
    freq: z.literal("DAILY"),
    interval: z.number().int().positive().optional(),
  }),
]);

export const taskSchema: z.ZodType<Task> = z.object({
  id: uuidSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().nullable(),
  recurrenceRule: recurrenceRuleSchema.nullable(),
  targetDailyMinutes: z.number().int().nonnegative().nullable(),
  targetWeeklyMinutes: z.number().int().nonnegative().nullable(),
  isArchived: z.boolean(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  deletedAt: isoDatetimeSchema.nullable(),
});

export const sessionKindSchema: z.ZodType<SessionKind> = z.union([
  z.literal("normal"),
  z.literal("pomodoro"),
]);

export const sessionSourceSchema: z.ZodType<SessionSource> = z.union([
  z.literal("timer"),
  z.literal("manual"),
]);

export const sessionSchema: z.ZodType<Session> = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
  startAt: isoDatetimeSchema,
  endAt: isoDatetimeSchema.nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  kind: sessionKindSchema,
  source: sessionSourceSchema,
  note: z.string().nullable(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
  deletedAt: isoDatetimeSchema.nullable(),
});

export const settingsSchema: z.ZodType<Settings> = z.object({
  singletonId: z.literal("singleton"),
  timezone: z.string(),
  weekStartsOn: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  idlePauseSeconds: z.number().int().positive(),
  pomodoroWorkMinutes: z.number().int().positive(),
  pomodoroShortBreakMinutes: z.number().int().positive(),
  pomodoroLongBreakMinutes: z.number().int().positive(),
  pomodoroLongBreakEvery: z.number().int().positive(),
  notificationsEnabled: z.boolean(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema,
});

export const mutationOpSchema: z.ZodType<MutationOp> = z.union([
  z.literal("upsert"),
  z.literal("delete"),
]);

export const entityTypeSchema: z.ZodType<EntityType> = z.union([
  z.literal("task"),
  z.literal("session"),
  z.literal("settings"),
]);

export const mutationSchema: z.ZodType<Mutation, z.ZodTypeDef, MutationInput> =
  z.object({
    id: uuidSchema,
    deviceId: z.string().min(1),
    op: mutationOpSchema,
    entityType: entityTypeSchema,
    entityId: uuidSchema.nullable(),
    payload: requiredUnknownSchema,
    clientTs: isoDatetimeSchema,
  });

export const runningTimerStateSchema: z.ZodType<RunningTimerState> = z.object({
  id: z.literal("singleton"),
  sessionId: uuidSchema,
  taskId: uuidSchema,
  kind: sessionKindSchema,
  startedAtUtc: isoDatetimeSchema,
  accumulatedSeconds: z.number().int().nonnegative(),
  isRunning: z.boolean(),
  lastTickPerfNow: z.number().nullable(),
  pomodoro: z
    .object({
      phase: z.union([
        z.literal("work"),
        z.literal("shortBreak"),
        z.literal("longBreak"),
      ]),
      remainingSeconds: z.number().int().nonnegative(),
      cycleCount: z.number().int().nonnegative(),
    })
    .nullable(),
  updatedAt: isoDatetimeSchema,
});

// --- API payloads (shared) ---

export const timerStartBodySchema = z.object({
  sessionId: uuidSchema,
  taskId: uuidSchema,
  kind: sessionKindSchema,
  startAt: isoDatetimeSchema,
});

export const timerStopBodySchema = z.object({
  sessionId: uuidSchema,
  endAt: isoDatetimeSchema,
});

export const syncPushBodySchema = z.object({
  mutations: z.array(mutationSchema).max(5_000),
});

export const syncPullBodySchema = z.object({
  sinceServerTs: isoDatetimeSchema.nullish(),
});

export const dailyReportQuerySchema = z.object({
  date: isoDateSchema,
  tz: z.string().min(1),
});

export const weeklyReportQuerySchema = z.object({
  weekStart: isoDateSchema,
  tz: z.string().min(1),
});
