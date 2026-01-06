import test from "node:test";
import assert from "node:assert/strict";

import type { RunningTimerState } from "@ticktick/shared";

import { stopTimer, tickTimer } from "./timerEngine.js";

test("stopTimer caps duration by wall-clock endAtIso", () => {
  const state: RunningTimerState = {
    id: "singleton",
    sessionId: crypto.randomUUID(),
    taskId: crypto.randomUUID(),
    kind: "normal",
    startedAtUtc: "2026-01-05T10:00:00.000Z",
    accumulatedSeconds: 10_000, // bogus tick drift
    isRunning: true,
    lastTickMs: 0,
    pomodoro: null,
    updatedAt: "2026-01-05T10:00:00.000Z"
  };

  const session = stopTimer(state, { endAtIso: "2026-01-05T10:10:00.000Z" });
  assert.equal(session.durationSeconds, 600);
});

test("tickTimer catches up accumulated time after page reload", () => {
  // Simulate state persisted 10 seconds ago
  const pastMs = Date.now() - 10_000;
  const state: RunningTimerState = {
    id: "singleton",
    sessionId: crypto.randomUUID(),
    taskId: crypto.randomUUID(),
    kind: "normal",
    startedAtUtc: "2026-01-05T10:00:00.000Z",
    accumulatedSeconds: 5, // Already had 5 seconds before
    isRunning: true,
    lastTickMs: pastMs,
    pomodoro: null,
    updatedAt: "2026-01-05T10:00:00.000Z"
  };

  const nowMs = Date.now();
  const next = tickTimer(state, nowMs);

  // Should have accumulated ~10 more seconds (5 + 10 = 15)
  assert(next.accumulatedSeconds >= 14 && next.accumulatedSeconds <= 16,
    `Expected ~15s but got ${next.accumulatedSeconds}s`);
  assert.equal(next.lastTickMs, nowMs);
  assert.equal(next.isRunning, true);
});

test("tickTimer handles first tick after resume (lastTickMs null)", () => {
  const state: RunningTimerState = {
    id: "singleton",
    sessionId: crypto.randomUUID(),
    taskId: crypto.randomUUID(),
    kind: "normal",
    startedAtUtc: "2026-01-05T10:00:00.000Z",
    accumulatedSeconds: 30,
    isRunning: true,
    lastTickMs: null, // Just resumed
    pomodoro: null,
    updatedAt: "2026-01-05T10:00:00.000Z"
  };

  const nowMs = Date.now();
  const next = tickTimer(state, nowMs);

  // Should set lastTickMs without changing accumulatedSeconds
  assert.equal(next.accumulatedSeconds, 30);
  assert.equal(next.lastTickMs, nowMs);
});
