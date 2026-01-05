import {
  mutationSchema,
  sessionSchema,
  settingsSchema,
  syncPullBodySchema,
  syncPushBodySchema,
  taskSchema
} from "@ticktick/shared";

import { db } from "../db/db.js";
import { markMutationRejected, markMutationsApplied } from "./outbox.js";
import { shouldApplyRemoteSession, shouldApplyRemoteSettings, shouldApplyRemoteTask } from "./merge.js";

export type SyncNowInput = {
  deviceId: string;
  apiBaseUrl: string;
  batchSize?: number;
};

type PushResponse = {
  applied: string[];
  rejected: Array<{ id: string; reason: string }>;
  serverTs: string;
};

type PullResponse = {
  tasks: unknown[];
  sessions: unknown[];
  settings: unknown | null;
  serverTs: string;
};

/**
 * Push-then-pull sync.
 *
 * Intent: keep it explicit and easy to debug: send outbox mutations, then pull canonical
 * entities since last watermark. This makes eventual Cloudflare migration straightforward.
 */
export async function syncNow({ deviceId, apiBaseUrl, batchSize = 250 }: SyncNowInput): Promise<void> {
  const syncState = await db.syncState.get("singleton");
  const sinceServerTs = syncState?.lastServerTs ?? null;

  // --- Push ---
  const pending = await db.outbox.where("status").equals("pending").sortBy("clientTs");
  const batch = pending.slice(0, batchSize);
  if (batch.length > 0) {
    const body = syncPushBodySchema.parse({
      mutations: batch.map((m) => mutationSchema.parse({ ...m, payload: m.payload }))
    });

    const res = await fetch(`${apiBaseUrl}/api/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": deviceId
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Sync push failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as PushResponse;
    await markMutationsApplied(json.applied ?? []);
    await Promise.all((json.rejected ?? []).map((r) => markMutationRejected(r.id, r.reason)));
  }

  // --- Pull ---
  const pullBody = syncPullBodySchema.parse({
    sinceServerTs: sinceServerTs ?? undefined
  });

  const pullRes = await fetch(`${apiBaseUrl}/api/sync/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId
    },
    body: JSON.stringify(pullBody)
  });

  if (!pullRes.ok) {
    throw new Error(`Sync pull failed: ${pullRes.status} ${pullRes.statusText}`);
  }

  const pullJson = (await pullRes.json()) as PullResponse;

  await db.transaction("rw", db.tasks, db.sessions, db.settings, db.syncState, async () => {
    for (const t of pullJson.tasks ?? []) {
      const remote = taskSchema.parse(t);
      const local = await db.tasks.get(remote.id);
      if (shouldApplyRemoteTask(local, remote)) {
        await db.tasks.put(remote);
      }
    }

    for (const s of pullJson.sessions ?? []) {
      const remote = sessionSchema.parse(s);
      const local = await db.sessions.get(remote.id);
      if (shouldApplyRemoteSession(local, remote)) {
        await db.sessions.put(remote);
      }
    }

    if (pullJson.settings != null) {
      const remote = settingsSchema.parse(pullJson.settings);
      const local = await db.settings.get("singleton");
      if (shouldApplyRemoteSettings(local, remote)) {
        await db.settings.put(remote);
      }
    }

    await db.syncState.put({
      id: "singleton",
      deviceId,
      lastServerTs: pullJson.serverTs ?? null,
      updatedAt: new Date().toISOString()
    });
  });
}


