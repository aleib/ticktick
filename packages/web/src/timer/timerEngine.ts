import type { RunningTimerState, Session, SessionKind, TaskId } from "@ticktick/shared";
import { durationSecondsBetween, nowIso } from "@ticktick/shared";

/**
 * Timer engine is a small state machine with a single invariant:
 * **there can only be one active timer session at a time**.
 *
 * Intent: keep the logic testable and persistence-agnostic. The UI can call these pure
 * operations and persist the resulting `RunningTimerState` and/or `Session`.
 */

export type StartTimerInput = {
  taskId: TaskId;
  kind: SessionKind;
  startAtIso: string; // ISO datetime
  pomodoro?: RunningTimerState["pomodoro"];
};

export type StopTimerInput = {
  endAtIso: string; // ISO datetime
};

export function startTimer(input: StartTimerInput): RunningTimerState {
  const now = nowIso();
  return {
    id: "singleton",
    sessionId: crypto.randomUUID(),
    taskId: input.taskId,
    kind: input.kind,
    startedAtUtc: input.startAtIso,
    accumulatedSeconds: 0,
    isRunning: true,
    lastTickMs: Date.now(),
    pomodoro: input.kind === "pomodoro" ? (input.pomodoro ?? { phase: "work", remainingSeconds: 25 * 60, cycleCount: 0 }) : null,
    updatedAt: now
  };
}

export function tickTimer(state: RunningTimerState, nowMs: number): RunningTimerState {
  if (!state.isRunning) return state;
  const last = state.lastTickMs;
  if (last == null) return { ...state, lastTickMs: nowMs, updatedAt: nowIso() };

  const deltaSeconds = Math.max(0, Math.floor((nowMs - last) / 1000));
  if (deltaSeconds === 0) return state;

  const nextPomodoro =
    state.kind === "pomodoro" && state.pomodoro != null
      ? { ...state.pomodoro, remainingSeconds: Math.max(0, state.pomodoro.remainingSeconds - deltaSeconds) }
      : state.pomodoro;

  const pomodoroEnded = state.kind === "pomodoro" && nextPomodoro != null && nextPomodoro.remainingSeconds === 0;

  return {
    ...state,
    accumulatedSeconds: state.accumulatedSeconds + deltaSeconds,
    pomodoro: nextPomodoro,
    isRunning: pomodoroEnded ? false : state.isRunning,
    lastTickMs: pomodoroEnded ? null : nowMs,
    updatedAt: nowIso()
  };
}

export function pauseTimer(state: RunningTimerState): RunningTimerState {
  if (!state.isRunning) return state;
  return { ...state, isRunning: false, lastTickMs: null, updatedAt: nowIso() };
}

export function resumeTimer(state: RunningTimerState): RunningTimerState {
  if (state.isRunning) return state;
  return { ...state, isRunning: true, lastTickMs: Date.now(), updatedAt: nowIso() };
}

export function stopTimer(state: RunningTimerState, input: StopTimerInput): Session {
  // We compute duration using accumulated seconds to avoid skew when the tab is backgrounded.
  // However, for explicit stop-at semantics (idle detection), we must not exceed the wall-clock interval.
  const byWallClock = durationSecondsBetween(state.startedAtUtc, input.endAtIso);
  const byTicks = state.accumulatedSeconds;
  const durationSeconds = byTicks > 0 ? Math.min(byTicks, byWallClock) : byWallClock;

  const now = nowIso();
  const session: Session = {
    id: state.sessionId,
    taskId: state.taskId,
    startAt: state.startedAtUtc,
    endAt: input.endAtIso,
    durationSeconds,
    kind: state.kind,
    source: "timer",
    note: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };

  return session;
}


