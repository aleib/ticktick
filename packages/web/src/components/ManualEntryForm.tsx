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
import { DurationPicker } from "./DurationPicker.js";
import { DatePicker } from "./ui/date-picker.js";
import { Calendar as CalendarIcon, Clock, NotebookPen } from "lucide-react";

export type ManualEntryFormProps = {
  deviceId: string;
  tasks: Task[];
  initialSession?: Session | null;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
  onCreated?: () => void;
  onUpdated?: () => void;
  onCancel?: () => void;
};

function getNoonIso(d: Date): string {
  const dt = new Date(d);
  dt.setHours(12, 0, 0, 0);
  return dt.toISOString();
}

export function ManualEntryForm({
  deviceId,
  tasks,
  initialSession,
  selectedTaskId,
  onSelectTask,
  onCreated,
  onUpdated,
  onCancel,
}: ManualEntryFormProps) {
  // Sync with prop if provided, otherwise local state
  const [localTaskId, setLocalTaskId] = useState(
    initialSession?.taskId ?? tasks[0]?.id ?? ""
  );

  const taskId =
    selectedTaskId !== undefined ? selectedTaskId ?? "" : localTaskId;

  const handleTaskChange = (newId: string) => {
    if (onSelectTask) {
      onSelectTask(newId);
    } else {
      setLocalTaskId(newId);
    }
  };

  const defaultDate = useMemo(() => {
    if (initialSession) {
      return new Date(initialSession.startAt);
    }
    return new Date();
  }, [initialSession]);

  const [date, setDate] = useState<Date | undefined>(defaultDate);

  // Default to 30 mins or calculate from session
  const [minutes, setMinutes] = useState(
    initialSession
      ? Math.floor((initialSession.durationSeconds ?? 1800) / 60)
      : 30
  );
  const [note, setNote] = useState(initialSession?.note ?? "");

  async function onSubmit() {
    if (taskId === "") return;
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    if (!date) return;

    const startAt = getNoonIso(date);
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
    <Card className="border-0 shadow-none md:border md:shadow-sm">
      <CardHeader className="px-0 md:px-6">
        <CardTitle>{initialSession ? "Edit Entry" : "Manual Entry"}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 md:px-6">
        <div className="flex flex-col gap-6">

          {/* Task & Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Task
              </label>
              <Select value={taskId} onValueChange={handleTaskChange}>
                <SelectTrigger className="h-10">
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
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                Date
              </label>
              <DatePicker date={date} onSelect={setDate} className="h-10" />
            </div>
          </div>

          {/* Duration Section */}
          <div className="space-y-4 rounded-lg border p-4 bg-secondary/10">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Duration
            </label>
            <DurationPicker value={minutes} onChange={setMinutes} />
          </div>

          {/* Note Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-muted-foreground" />
              Note
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details about this session..."
              className="h-10"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onSubmit} className="flex-1 h-11 text-base shadow-lg hover:shadow-xl transition-all">
              {initialSession ? "Update Entry" : "Add Entry"}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 md:flex-none h-11"
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
