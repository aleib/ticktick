import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Drizzle schema mirrors the portable SQL schema from the product spec.
 *
 * Intent: keep table shapes close to what D1 can support later; avoid heavy PG-only features.
 */

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  recurrenceRule: jsonb("recurrence_rule"),
  targetDailyMinutes: integer("target_daily_minutes"),
  targetWeeklyMinutes: integer("target_weekly_minutes"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" })
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  startAt: timestamp("start_at", { withTimezone: true, mode: "string" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "string" }),
  durationSeconds: integer("duration_seconds"),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" })
});

export const settings = pgTable("settings", {
  singletonId: boolean("singleton_id").primaryKey().default(true),
  timezone: text("timezone").notNull().default("local"),
  weekStartsOn: integer("week_starts_on").notNull().default(1),
  idlePauseSeconds: integer("idle_pause_seconds").notNull().default(60),
  pomodoroWorkMinutes: integer("pomodoro_work_minutes").notNull().default(25),
  pomodoroShortBreakMinutes: integer("pomodoro_short_break_minutes").notNull().default(5),
  pomodoroLongBreakMinutes: integer("pomodoro_long_break_minutes").notNull().default(15),
  pomodoroLongBreakEvery: integer("pomodoro_long_break_every").notNull().default(4),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow()
});

export const mutations = pgTable("mutations", {
  id: uuid("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  op: text("op").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  payload: jsonb("payload").notNull(),
  clientTs: timestamp("client_ts", { withTimezone: true, mode: "string" }).notNull(),
  serverTs: timestamp("server_ts", { withTimezone: true, mode: "string" }),
  status: text("status").notNull().default("pending")
});


