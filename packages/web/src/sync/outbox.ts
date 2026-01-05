import type { Mutation } from "@ticktick/shared";

import { db, type OutboxMutationRow } from "../db/db.js";

/**
 * Outbox is the local mutation log to support offline-first sync.
 *
 * Intent: queue writes in the order they happened, so sync can replay deterministically.
 */
export async function enqueueMutation(input: Omit<Mutation, "id"> & { id?: string }): Promise<string> {
  const id = input.id ?? crypto.randomUUID();

  const row: OutboxMutationRow = {
    id,
    deviceId: input.deviceId,
    op: input.op,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    clientTs: input.clientTs,
    status: "pending",
    error: null
  };

  await db.outbox.put(row);
  return id;
}

export async function listPendingMutations(limit: number): Promise<OutboxMutationRow[]> {
  return await db.outbox.where("status").equals("pending").sortBy("clientTs").then((rows) => rows.slice(0, limit));
}

export async function markMutationsApplied(ids: string[]): Promise<void> {
  await db.transaction("rw", db.outbox, async () => {
    await Promise.all(
      ids.map(async (id) => {
        const row = await db.outbox.get(id);
        if (row == null) return;
        await db.outbox.put({ ...row, status: "applied", error: null });
      })
    );
  });
}

export async function markMutationRejected(id: string, reason: string): Promise<void> {
  const row = await db.outbox.get(id);
  if (row == null) return;
  await db.outbox.put({ ...row, status: "rejected", error: reason });
}


