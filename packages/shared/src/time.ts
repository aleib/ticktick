/**
 * Shared date/time helpers.
 *
 * Intent: reporting relies on stable week/day boundaries. We keep these utilities in shared so
 * web (IndexedDB aggregations) and API (SQL aggregations) can agree on semantics.
 *
 * Note: For MVP we treat the device timezone as canonical (`tz` passed by the client). In v2
 * multi-device mode, timezone may be pinned in Settings to avoid surprising reports.
 */

import type { IsoDateString } from "./model";

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIsoDate(date: Date): IsoDateString {
  // YYYY-MM-DD in the date's local interpretation
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Computes Monday-start week start for a given local date.
 *
 * We intentionally keep this minimal for MVP. If/when we support custom week starts,
 * we’ll add a `weekStartsOn` parameter.
 */
export function weekStartMonday(localDate: Date): Date {
  const d = new Date(localDate);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay(); // 0=Sun .. 6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1..7
  const diffToMonday = isoDay - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export function clampNonNegativeSeconds(seconds: number): number {
  return Math.max(0, Math.floor(seconds));
}

export function durationSecondsBetween(
  startAtIso: string,
  endAtIso: string
): number {
  const startMs = new Date(startAtIso).getTime();
  const endMs = new Date(endAtIso).getTime();
  return clampNonNegativeSeconds((endMs - startMs) / 1000);
}
