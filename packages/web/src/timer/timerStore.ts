import type { RunningTimerState, Session, SessionKind } from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

import { db } from "../db/db.js";
import { enqueueMutation } from "../sync/outbox.js";
import { pauseTimer, resumeTimer, startTimer, stopTimer, tickTimer } from "./timerEngine.js";

export type TimerStoreDeps = {
  deviceId: string;
};

/**
 * Persistence wrapper around the timer engine.
 *
 * Intent: central place that enforces single-timer invariant and records sessions.
 */
export class TimerStore {
  private deps: TimerStoreDeps;
  private interval: number | null = null;
  private lastPersistMs: number = 0;

  constructor(deps: TimerStoreDeps) {
    this.deps = deps;
  }

  async getState(): Promise<RunningTimerState | undefined> {
    const state = await db.runningTimer.get("singleton");
    if (!state) return undefined;

    // Migration: handle legacy field name from older versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = state as any;
    if (raw.lastTickPerfNow !== undefined && state.lastTickMs === undefined) {
      state.lastTickMs = raw.lastTickPerfNow;
      delete raw.lastTickPerfNow;
      await db.runningTimer.put(state);
    }
    return state;
  }

  /**
   * Call on app initialization to resume any running timer.
   * Catches up accumulated time from when the page was closed.
   */
  async recover(): Promise<void> {
    const state = await this.getState();
    if (!state?.isRunning) return;

    // Catch up accumulated time since last tick
    if (state.lastTickMs != null) {
      const now = Date.now();
      const next = tickTimer(state, now);
      if (next !== state) {
        await db.runningTimer.put(next);
      }
    }
    this.ensureTicking();
  }

  async start(taskId: string, kind: SessionKind): Promise<RunningTimerState> {
    const existing = await this.getState();
    if (existing != null && existing.isRunning) {
      // KISS: force-stop current run before starting a new one.
      await this.pause();
    }

    const settings = await db.settings.get("singleton");
    const workSeconds = (settings?.pomodoroWorkMinutes ?? 25) * 60;

    const state = startTimer({
      taskId,
      kind,
      startAtIso: nowIso(),
      pomodoro: kind === "pomodoro" ? { phase: "work", remainingSeconds: workSeconds, cycleCount: 0 } : null
    });
    await db.runningTimer.put(state);
    this.ensureTicking();
    return state;
  }

  async pause(): Promise<void> {
    const state = await this.getState();
    if (state == null) return;
    const next = pauseTimer(state);
    await db.runningTimer.put(next);
    this.stopTicking();
  }

  async resume(): Promise<void> {
    const state = await this.getState();
    if (state == null) return;
    const next = resumeTimer(state);
    await db.runningTimer.put(next);
    this.ensureTicking();
  }

  async stop(): Promise<Session | null> {
    return await this.stopAt(nowIso());
  }

  async stopAt(endAtIso: string): Promise<Session | null> {
    const state = await this.getState();
    if (state == null) return null;

    const session = stopTimer(state, { endAtIso });

    // Discard short sessions (< 15 seconds)
    // durationSeconds should exist if stopped correctly, but safeguard against null
    if ((session.durationSeconds ?? 0) < 15) {
      console.log(`[TimerStore] Session too short (${session.durationSeconds}s), deleting running state only.`);
      await db.runningTimer.delete("singleton");
      this.stopTicking();
      return null;
    }

    await db.transaction("rw", db.sessions, db.runningTimer, db.outbox, async () => {
      await db.sessions.put(session);
      await enqueueMutation({
        deviceId: this.deps.deviceId,
        op: "upsert",
        entityType: "session",
        entityId: session.id,
        payload: session,
        clientTs: nowIso()
      });

      await db.runningTimer.delete("singleton");
    });

    this.stopTicking();
    return session;
  }

  /**
   * Called on app lifecycle events to ensure we never keep an implicit running state across reloads.
   * We persist the state but mark it paused so the user explicitly resumes next time.
   */
  async pauseForLifecycle(): Promise<void> {
    const state = await this.getState();
    if (state == null) return;
    const next = pauseTimer(state);
    await db.runningTimer.put(next);
    this.stopTicking();
  }

  /**
   * Used for idle detection: finalize the active slice as a session, but leave a paused
   * timer ready to resume (gap excluded by starting a fresh session on resume).
   */
  async splitAndPauseAt(endAtIso: string): Promise<void> {
    const state = await this.getState();
    if (state == null) return;

    const session = stopTimer(state, { endAtIso });
    const pausedNext = pauseTimer(
      startTimer({
        taskId: state.taskId,
        kind: state.kind,
        startAtIso: endAtIso
      })
    );

    await db.transaction("rw", db.sessions, db.runningTimer, db.outbox, async () => {
      await db.sessions.put(session);
      await enqueueMutation({
        deviceId: this.deps.deviceId,
        op: "upsert",
        entityType: "session",
        entityId: session.id,
        payload: session,
        clientTs: nowIso()
      });

      await db.runningTimer.put(pausedNext);
    });

    this.stopTicking();
  }

  private ensureTicking(): void {
    if (this.interval != null) return;
    this.lastPersistMs = Date.now();
    this.interval = window.setInterval(() => {
      void this.tickOnce();
    }, 1000);
  }

  private stopTicking(): void {
    if (this.interval == null) return;
    window.clearInterval(this.interval);
    this.interval = null;
  }

  private async tickOnce(): Promise<void> {
    const state = await this.getState();
    if (state == null || !state.isRunning) return;

    const next = tickTimer(state, Date.now());
    if (next === state) return;

    const pomodoroEnded =
      state.kind === "pomodoro" &&
      state.pomodoro != null &&
      next.pomodoro != null &&
      state.pomodoro.remainingSeconds > 0 &&
      next.pomodoro.remainingSeconds === 0 &&
      next.isRunning === false;

    if (pomodoroEnded) {
      await this.stopAt(nowIso());
      void notifyPomodoroDone();
      return;
    }

    // Persist frequently enough to recover from crashes without excessive write churn.
    // (Spec target: every ~5s.)
    const nowMs = Date.now();
    if (nowMs - this.lastPersistMs >= 5_000) {
      await db.runningTimer.put(next);
      this.lastPersistMs = nowMs;
    }
  }
}

async function notifyPomodoroDone(): Promise<void> {
  // Intent: always provide an in-page signal; use Notifications if available and permitted.
  try {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        new Notification("Pomodoro complete", { body: "Timebox finished." });
        return;
      }
    }
  } catch {
    // Ignore and fall back to alert.
  }

  alert("Pomodoro complete");
}


