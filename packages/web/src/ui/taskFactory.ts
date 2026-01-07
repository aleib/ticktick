import type { Task } from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

/**
 * Centralizes defaults for new tasks so UI doesn’t accidentally diverge.
 */
export function createNewTask(title: string): Task {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    title,
    description: null,
    category: null,
    color: null,
    recurrenceRule: null,
    targetDailyMinutes: null,
    targetWeeklyMinutes: null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}


