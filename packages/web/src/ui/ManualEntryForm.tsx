import { useMemo, useState } from "react";

import type { Session, Task } from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

import { db } from "../db/db.js";
import { enqueueMutation } from "../sync/outbox.js";

export type ManualEntryFormProps = {
  deviceId: string;
  tasks: Task[];
  onCreated?: () => void;
};

function localNoonIso(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map((x) => Number(x));
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return dt.toISOString();
}

export function ManualEntryForm({
  deviceId,
  tasks,
  onCreated,
}: ManualEntryFormProps) {
  const todayIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [date, setDate] = useState(todayIso);
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState("");

  async function onSubmit() {
    if (taskId === "") return;
    if (!Number.isFinite(minutes) || minutes <= 0) return;

    const startAt = localNoonIso(date);
    const endAt = new Date(
      new Date(startAt).getTime() + minutes * 60_000
    ).toISOString();
    const now = nowIso();

    const session: Session = {
      id: crypto.randomUUID(),
      taskId,
      startAt,
      endAt,
      durationSeconds: Math.floor(minutes * 60),
      kind: "normal",
      source: "manual",
      note: note.trim() === "" ? null : note.trim(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.sessions.put(session);
    await enqueueMutation({
      deviceId,
      op: "upsert",
      entityType: "session",
      entityId: session.id,
      payload: session,
      clientTs: nowIso(),
    });

    setNote("");
    onCreated?.();
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Manual entry</h3>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">Select task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 8 }}
        />

        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          min={1}
          style={{ padding: 8, width: 120 }}
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          style={{ padding: 8, flex: 1, minWidth: 200 }}
        />

        <button onClick={onSubmit} style={{ padding: "8px 12px" }}>
          Add
        </button>
      </div>
    </div>
  );
}
