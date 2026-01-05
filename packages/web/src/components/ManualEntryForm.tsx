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

    setNote("");
    onCreated?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Entry</CardTitle>
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

          <Button onClick={onSubmit} className="w-full md:w-auto">
            Add Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
