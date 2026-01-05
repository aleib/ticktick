import { useMemo, useState } from "react";

import type { Session, Task } from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

import { db } from "../db/db.js";
import { enqueueMutation } from "../sync/outbox.js";
import { Button } from "./ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.js";
import { Input } from "./ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.js";

export type ManualEntryFormProps = {
  deviceId: string;
  tasks: Task[];
  initialSession?: Session | null;
  onCreated?: () => void;
  onUpdated?: () => void;
  onCancel?: () => void;
};

function localNoonIso(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map((x) => Number(x));
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return dt.toISOString();
}

/**
 * Extracts "YYYY-MM-DD" from a session's startAt ISO string,
 * assuming the session was recorded in local time or we just want the date part.
 *
 * For a robust implementation dealing with time zones, you might want a specialized helper.
 * Here we simply take the first 10 chars if available.
 */
function getIsoDatePart(isoString: string): string {
  return isoString.split("T")[0] ?? isoString;
}

export function ManualEntryForm({
  deviceId,
  tasks,
  initialSession,
  onCreated,
  onUpdated,
  onCancel,
}: ManualEntryFormProps) {
  const defaultDate = useMemo(() => {
    if (initialSession) {
      return getIsoDatePart(initialSession.startAt);
    }
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [initialSession]);

  const [taskId, setTaskId] = useState(initialSession?.taskId ?? tasks[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  // Default to 30 mins or calculate from session
  const [minutes, setMinutes] = useState(
    initialSession ? Math.floor((initialSession.durationSeconds ?? 1800) / 60) : 30
  );
  const [note, setNote] = useState(initialSession?.note ?? "");

  // If tasks list changes or we switch to edit mode for a task not in list (archived?), handle gracefully:
  // (Optional: ensuring taskId is valid logic can go here)

  async function onSubmit() {
    if (taskId === "") return;
    if (!Number.isFinite(minutes) || minutes <= 0) return;

    const startAt = localNoonIso(date);
    const endAt = new Date(
      new Date(startAt).getTime() + minutes * 60_000
    ).toISOString();
    const now = nowIso();

    const isEdit = !!initialSession;
    const session: Session = {
      id: initialSession?.id ?? crypto.randomUUID(),
      taskId,
      startAt,
      endAt,
      durationSeconds: Math.floor(minutes * 60),
      kind: initialSession?.kind ?? "normal", // preserve kind if editing
      source: "manual",
      note: note.trim() === "" ? null : note.trim(),
      createdAt: initialSession?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };
    console.log("session:", session);

    await db.sessions.put(session);
    await enqueueMutation({
      deviceId,
      op: "upsert",
      entityType: "session",
      entityId: session.id,
      payload: session,
      clientTs: nowIso(),
    });

    if (isEdit) {
      onUpdated?.();
    } else {
      setNote(""); // Reset note for next entry only if creating
      onCreated?.();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialSession ? "Edit Entry" : "Manual Entry"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task</label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes</label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSubmit} className="flex-1 md:flex-none">
              {initialSession ? "Update Entry" : "Add Entry"}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
