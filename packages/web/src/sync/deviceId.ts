/**
 * Device identity is used for sync attribution and (later) conflict diagnostics.
 *
 * Intent: stable per installation. For MVP, localStorage is sufficient.
 */

const STORAGE_KEY = "ticktick.deviceId";

export function ensureDeviceId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing != null && existing.trim() !== "") return existing;

  const next = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}


