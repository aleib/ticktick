import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Edit2, Trash2 } from "lucide-react";

import type { Session, Task } from "@ticktick/shared";

import { db } from "../db/db.js";
import { enqueueMutation } from "../sync/outbox.js";
import { ensureDeviceId } from "../sync/deviceId.js";
import { ManualEntryForm } from "../components/ManualEntryForm.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.js";


function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

export function Sessions() {
  const deviceId = useMemo(() => ensureDeviceId(), []);

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]!;
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Data fetching
  const refreshData = useCallback(async () => {
    const [allTasks, allSessions] = await Promise.all([
      db.tasks.toArray(),
      db.sessions.toArray(),
    ]);

    setTasks(allTasks.filter((t) => t.deletedAt == null));

    // Filter sessions by selected date (local time approximation)
    const daySessions = allSessions.filter((s) => {
      if (s.deletedAt != null) return false;
      const datePart = s.startAt.split("T")[0];
      return datePart === selectedDate;
    });

    // Sort by startAt desc
    daySessions.sort((a, b) => b.startAt.localeCompare(a.startAt));

    setSessions(daySessions);
  }, [selectedDate]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Handlers
  const handleSessionCreated = useCallback(() => {
    void refreshData();
  }, [refreshData]);

  const handleSessionUpdated = useCallback(() => {
    setEditingSession(null);
    void refreshData();
  }, [refreshData]);

  const handleDelete = useCallback(async (session: Session) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    const now = new Date().toISOString();
    const updated = { ...session, deletedAt: now, updatedAt: now };

    await db.sessions.put(updated);
    await enqueueMutation({
      deviceId,
      op: "upsert",
      entityType: "session",
      entityId: session.id,
      payload: updated,
      clientTs: now,
    });

    void refreshData();
  }, [deviceId, refreshData]);

  const getTaskTitle = (taskId: string) => {
    return tasks.find(t => t.id === taskId)?.title ?? "Unknown Task";
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sessions</h1>
        <p className="text-muted-foreground">Manage your recorded sessions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Date and Add New */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Date Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </CardContent>
          </Card>

          <ManualEntryForm
            deviceId={deviceId}
            tasks={tasks}
            onCreated={handleSessionCreated}
          // Passing key to force reset on date change if needed, 
          // but ManualEntryForm handles its own date state. 
          // We might want to pass selectedDate as default? 
          // For now, let ManualEntryForm default to today or let user pick.
          />
        </div>

        {/* Right Column: Session List */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Sessions for {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sessions found for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium leading-none">
                        {getTaskTitle(session.taskId)}
                      </p>
                      <div className="text-sm text-muted-foreground flex gap-2 items-center">
                        <span className="font-mono bg-secondary/50 px-1 rounded">
                          {formatDuration(session.durationSeconds ?? 0)}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(session.startAt), "h:mm a")}</span>
                        {session.note && (
                          <>
                            <span>•</span>
                            <span className="italic">{session.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSession(session)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(session)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <ManualEntryForm
              deviceId={deviceId}
              tasks={tasks}
              initialSession={editingSession}
              onUpdated={handleSessionUpdated}
              onCancel={() => setEditingSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
