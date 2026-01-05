import type { Session, Settings, Task } from "@ticktick/shared";

/**
 * Merge policy (MVP): last-write-wins by `updatedAt`.
 *
 * Intent: keep conflict logic obvious and portable. In single-user v1, conflicts are rare,
 * but this prevents silent loss if the app ever runs in multiple tabs/devices.
 */
function newerIso(a: string, b: string): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}

export function shouldApplyRemoteTask(local: Task | undefined, remote: Task): boolean {
  if (local == null) return true;
  if (newerIso(remote.updatedAt, local.updatedAt)) return true;
  return false;
}

export function shouldApplyRemoteSession(local: Session | undefined, remote: Session): boolean {
  if (local == null) return true;
  if (newerIso(remote.updatedAt, local.updatedAt)) return true;
  return false;
}

export function shouldApplyRemoteSettings(local: Settings | null | undefined, remote: Settings): boolean {
  if (local == null) return true;
  if (newerIso(remote.updatedAt, local.updatedAt)) return true;
  return false;
}


