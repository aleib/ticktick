import { useEffect, useMemo, useState } from "react";

import type { Task } from "@ticktick/shared";
import { nowIso } from "@ticktick/shared";

import { db } from "../db/db.js";
import { IdleWatcher } from "../idle/idleWatcher.js";
import { computeDailyTotals, formatHhMm } from "../reports/localReports.js";
import { ensureDeviceId } from "../sync/deviceId.js";
import { enqueueMutation } from "../sync/outbox.js";
import { syncNow } from "../sync/syncNow.js";
import { TimerStore } from "../timer/timerStore.js";
import { ManualEntryForm } from "./ManualEntryForm.js";
import { createNewTask } from "./taskFactory.js";

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [timerKind, setTimerKind] = useState<"normal" | "pomodoro">("normal");
  const [running, setRunning] = useState<string>("(none)");
  const [sessionsTotal, setSessionsTotal] = useState<string>("0h 00m");
  const deviceId = useMemo(() => ensureDeviceId(), []);
  const timerStore = useMemo(() => new TimerStore({ deviceId }), [deviceId]);

  useEffect(() => {
    void db.tasks
      .toArray()
      .then((rows) => setTasks(rows.filter((t) => t.deletedAt == null)));
  }, []);

  useEffect(() => {
    const refreshTotals = async () => {
      const sessions = await db.sessions.toArray();
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const daily = computeDailyTotals(sessions, todayIso);
      setSessionsTotal(formatHhMm(daily.totalSeconds));
    };

    void refreshTotals();
  }, []);

  useEffect(() => {
    // On reload, the app should never silently keep running. We persist state but pause it.
    const onLifecycle = () => {
      void timerStore.pauseForLifecycle();
    };
    window.addEventListener("pagehide", onLifecycle);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        onLifecycle();
      }
    });
    return () => {
      window.removeEventListener("pagehide", onLifecycle);
    };
  }, [timerStore]);

  useEffect(() => {
    const watcher = new IdleWatcher({ timerStore, idlePauseSeconds: 60 });
    watcher.start();
    return () => {
      watcher.stop();
    };
  }, [timerStore]);

  useEffect(() => {
    void timerStore.getState().then((s) => {
      if (s == null) {
        setRunning("(none)");
        return;
      }
      setSelectedTaskId(s.taskId);
      setRunning(s.isRunning ? `running (${s.kind})` : `paused (${s.kind})`);
    });
  }, [timerStore]);

  async function onCreateTask() {
    const trimmed = title.trim();
    if (trimmed === "") return;

    const task = createNewTask(trimmed);
    await db.tasks.put(task);
    await enqueueMutation({
      deviceId,
      op: "upsert",
      entityType: "task",
      entityId: task.id,
      payload: task,
      clientTs: nowIso(),
    });

    setTitle("");
    setTasks((prev) => [task, ...prev]);
  }

  async function onDeleteTask(id: string) {
    const existing = await db.tasks.get(id);
    if (existing == null) return;

    const deletedAt = nowIso();
    const next: Task = { ...existing, deletedAt, updatedAt: deletedAt };

    await db.tasks.put(next);
    await enqueueMutation({
      deviceId,
      op: "upsert",
      entityType: "task",
      entityId: id,
      payload: next,
      clientTs: nowIso(),
    });

    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function onStartTimer() {
    if (selectedTaskId === "") return;
    const state = await timerStore.start(selectedTaskId, timerKind);
    setRunning(
      state.isRunning ? `running (${state.kind})` : `paused (${state.kind})`
    );
  }

  async function onResumeTimer() {
    await timerStore.resume();
    const s = await timerStore.getState();
    setRunning(
      s?.isRunning === true
        ? `running (${s.kind})`
        : `paused (${s?.kind ?? "normal"})`
    );
  }

  async function onPauseTimer() {
    await timerStore.pause();
    const s = await timerStore.getState();
    setRunning(
      s?.isRunning === true
        ? `running (${s.kind})`
        : `paused (${s?.kind ?? "normal"})`
    );
  }

  async function onStopTimer() {
    const session = await timerStore.stop();
    setRunning(session != null ? "stopped" : "(none)");
  }

  async function onSync() {
    await syncNow({ deviceId, apiBaseUrl: "http://localhost:8787" });
    const next = await db.tasks.toArray();
    setTasks(next.filter((t) => t.deletedAt == null));
  }

  async function onRefreshTotals() {
    const sessions = await db.sessions.toArray();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const daily = computeDailyTotals(sessions, todayIso);
    setSessionsTotal(formatHhMm(daily.totalSeconds));
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>TickTick</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        Offline-first weekly time & habit tracker (MVP scaffold)
      </p>
      <p style={{ marginTop: 8, color: "#555" }}>Today: {sessionsTotal}</p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={title}
          placeholder="New task title"
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 8, flex: 1 }}
        />
        <button onClick={onCreateTask} style={{ padding: "8px 12px" }}>
          Create
        </button>
        <button onClick={onSync} style={{ padding: "8px 12px" }}>
          Sync now
        </button>
        <button onClick={onRefreshTotals} style={{ padding: "8px 12px" }}>
          Refresh totals
        </button>
      </div>

      <h2 style={{ marginTop: 24 }}>Timer</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={timerKind}
          onChange={(e) =>
            setTimerKind(e.target.value === "pomodoro" ? "pomodoro" : "normal")
          }
          style={{ padding: 8 }}
        >
          <option value="normal">Normal</option>
          <option value="pomodoro">Pomodoro</option>
        </select>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          style={{ padding: 8, minWidth: 240 }}
        >
          <option value="">Select a task</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <button onClick={onStartTimer} style={{ padding: "8px 12px" }}>
          Start
        </button>
        <button onClick={onPauseTimer} style={{ padding: "8px 12px" }}>
          Pause
        </button>
        <button onClick={onResumeTimer} style={{ padding: "8px 12px" }}>
          Resume
        </button>
        <button onClick={onStopTimer} style={{ padding: "8px 12px" }}>
          Stop
        </button>

        <span style={{ color: "#555" }}>{running}</span>
      </div>

      <div style={{ marginTop: 16 }}>
        <ManualEntryForm
          deviceId={deviceId}
          tasks={tasks}
          onCreated={() => {
            void onRefreshTotals();
          }}
        />
      </div>

      <h2 style={{ marginTop: 24 }}>Tasks</h2>
      <ul style={{ paddingLeft: 18 }}>
        {tasks.map((t) => (
          <li
            key={t.id}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span style={{ flex: 1 }}>{t.title}</span>
            <button
              onClick={() => void onDeleteTask(t.id)}
              style={{ padding: "4px 8px" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
