import test from "node:test";
import assert from "node:assert/strict";

import type { RunningTimerState } from "@ticktick/shared";

import { stopTimer } from "./timerEngine.js";

test("stopTimer caps duration by wall-clock endAtIso", () => {
  const state: RunningTimerState = {
    id: "singleton",
    sessionId: crypto.randomUUID(),
    taskId: crypto.randomUUID(),
    kind: "normal",
    startedAtUtc: "2026-01-05T10:00:00.000Z",
    accumulatedSeconds: 10_000, // bogus tick drift
    isRunning: true,
    lastTickPerfNow: 0,
    pomodoro: null,
    updatedAt: "2026-01-05T10:00:00.000Z"
  };

  const session = stopTimer(state, { endAtIso: "2026-01-05T10:10:00.000Z" });
  assert.equal(session.durationSeconds, 600);
});


