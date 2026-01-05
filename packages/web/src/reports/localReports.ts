import type { Session, Task } from "@ticktick/shared";
import { weekStartMonday } from "@ticktick/shared";

export type DailyTotals = {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  totalsByTaskId: Record<string, number>;
};

export type WeeklyTotals = {
  weekStart: string; // YYYY-MM-DD (Monday)
  totalsByDate: Record<string, number>;
  totalsByTaskId: Record<string, number>;
};

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map((x) => Number(x));
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  return dt;
}

export function computeDailyTotals(sessions: Session[], dateIso: string): DailyTotals {
  const dayStart = startOfLocalDay(dateIso).getTime();
  const dayEnd = startOfLocalDay(dateIso);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dayEndMs = dayEnd.getTime();

  const totalsByTaskId: Record<string, number> = {};
  let totalSeconds = 0;

  for (const s of sessions) {
    if (s.deletedAt != null) continue;
    if (s.endAt == null) continue;
    const startMs = new Date(s.startAt).getTime();
    if (startMs < dayStart || startMs >= dayEndMs) continue;
    const dur = s.durationSeconds ?? 0;
    totalsByTaskId[s.taskId] = (totalsByTaskId[s.taskId] ?? 0) + dur;
    totalSeconds += dur;
  }

  return { date: dateIso, totalSeconds, totalsByTaskId };
}

export function computeWeeklyTotals(sessions: Session[], today: Date): WeeklyTotals {
  const ws = weekStartMonday(today);
  const weekStartIso = toIsoDateLocal(ws);
  const totalsByDate: Record<string, number> = {};
  const totalsByTaskId: Record<string, number> = {};

  const startMs = ws.getTime();
  const end = new Date(ws);
  end.setDate(end.getDate() + 7);
  const endMs = end.getTime();

  for (const s of sessions) {
    if (s.deletedAt != null) continue;
    if (s.endAt == null) continue;
    const t = new Date(s.startAt);
    const ms = t.getTime();
    if (ms < startMs || ms >= endMs) continue;
    const dateIso = toIsoDateLocal(t);
    const dur = s.durationSeconds ?? 0;
    totalsByDate[dateIso] = (totalsByDate[dateIso] ?? 0) + dur;
    totalsByTaskId[s.taskId] = (totalsByTaskId[s.taskId] ?? 0) + dur;
  }

  return { weekStart: weekStartIso, totalsByDate, totalsByTaskId };
}

export function formatHhMm(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function taskTitle(taskMap: Map<string, Task>, taskId: string): string {
  return taskMap.get(taskId)?.title ?? taskId;
}


