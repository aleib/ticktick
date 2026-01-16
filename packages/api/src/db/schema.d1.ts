import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * D1 (SQLite) schema aligned with the portable API model.
 *
 * Intent: keep fields compatible with shared models and avoid SQLite-specific tricks.
 */
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  color: text("color"),
  recurrenceRule: text("recurrence_rule"),
  targetDailyMinutes: integer("target_daily_minutes"),
  targetWeeklyMinutes: integer("target_weekly_minutes"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at")
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  startAt: text("start_at").notNull(),
  endAt: text("end_at"),
  durationSeconds: integer("duration_seconds"),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at")
});

export const settings = sqliteTable("settings", {
  singletonId: integer("singleton_id", { mode: "boolean" }).primaryKey().default(true),
  timezone: text("timezone").notNull().default("local"),
  weekStartsOn: integer("week_starts_on").notNull().default(1),
  idlePauseSeconds: integer("idle_pause_seconds").notNull().default(60),
  pomodoroWorkMinutes: integer("pomodoro_work_minutes").notNull().default(25),
  pomodoroShortBreakMinutes: integer("pomodoro_short_break_minutes").notNull().default(5),
  pomodoroLongBreakMinutes: integer("pomodoro_long_break_minutes").notNull().default(15),
  pomodoroLongBreakEvery: integer("pomodoro_long_break_every").notNull().default(4),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const mutations = sqliteTable("mutations", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  op: text("op").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: text("payload").notNull(),
  clientTs: text("client_ts").notNull(),
  serverTs: text("server_ts"),
  status: text("status").notNull().default("pending")
});
