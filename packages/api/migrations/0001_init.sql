CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  recurrence_rule TEXT,
  target_daily_minutes INTEGER,
  target_weekly_minutes INTEGER,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  duration_seconds INTEGER,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS settings (
  singleton_id INTEGER PRIMARY KEY DEFAULT 1,
  timezone TEXT NOT NULL DEFAULT "local",
  week_starts_on INTEGER NOT NULL DEFAULT 1,
  idle_pause_seconds INTEGER NOT NULL DEFAULT 60,
  pomodoro_work_minutes INTEGER NOT NULL DEFAULT 25,
  pomodoro_short_break_minutes INTEGER NOT NULL DEFAULT 5,
  pomodoro_long_break_minutes INTEGER NOT NULL DEFAULT 15,
  pomodoro_long_break_every INTEGER NOT NULL DEFAULT 4,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mutations (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  op TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload TEXT NOT NULL,
  client_ts TEXT NOT NULL,
  server_ts TEXT,
  status TEXT NOT NULL DEFAULT "pending"
);
