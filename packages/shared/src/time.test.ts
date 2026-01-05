import test from "node:test";
import assert from "node:assert/strict";

import { durationSecondsBetween, weekStartMonday } from "./time";

test("durationSecondsBetween clamps to non-negative", () => {
  const start = "2025-01-01T00:00:10.000Z";
  const end = "2025-01-01T00:00:00.000Z";
  assert.equal(durationSecondsBetween(start, end), 0);
});

test("weekStartMonday returns a Monday", () => {
  // Jan 5 2026 is a Monday.
  const d = new Date(2026, 0, 5, 12, 0, 0, 0);
  const ws = weekStartMonday(d);
  assert.equal(ws.getDay(), 1);
});


