CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  recurrence_rule JSONB,
  target_daily_minutes INT,
  target_weekly_minutes INT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  duration_seconds INT,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings (
  singleton_id BOOLEAN PRIMARY KEY DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'local',
  week_starts_on INT NOT NULL DEFAULT 1,
  idle_pause_seconds INT NOT NULL DEFAULT 60,
  pomodoro_work_minutes INT NOT NULL DEFAULT 25,
  pomodoro_short_break_minutes INT NOT NULL DEFAULT 5,
  pomodoro_long_break_minutes INT NOT NULL DEFAULT 15,
  pomodoro_long_break_every INT NOT NULL DEFAULT 4,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mutations (
  id UUID PRIMARY KEY,
  device_id TEXT NOT NULL,
  op TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL,
  client_ts TIMESTAMPTZ NOT NULL,
  server_ts TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS sessions_task_id_idx ON sessions(task_id);
CREATE INDEX IF NOT EXISTS sessions_start_at_idx ON sessions(start_at);
CREATE INDEX IF NOT EXISTS mutations_device_id_ts_idx ON mutations(device_id, client_ts);


