import type { RunningTimerState, Session, Task } from "@ticktick/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ManualEntryForm } from "../components/ManualEntryForm.js";
import { TodayProgress } from "../components/dashboard/TodayProgress.js";
import { TimerHero } from "../components/timer/TimerHero.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.js";
import { db } from "../db/db.js";
import { computeDailyTotals, formatHhMm } from "../reports/localReports.js";
import { ensureDeviceId } from "../sync/deviceId.js";
import { StopwatchHero } from "../components/timer/StopwatchHero.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs.js";
import { TimerStore } from "../timer/timerStore.js";

/** Returns today's date as YYYY-MM-DD in local timezone */
function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns today's ISO weekday (1=Mon ... 7=Sun) */
function getTodayIsoWeekday(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, etc.
  return (dayOfWeek === 0 ? 7 : dayOfWeek) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

type UIState = "idle" | "running" | "paused" | "break";

function deriveUIState(timerState: RunningTimerState | null): UIState {
  if (!timerState) return "idle";
  if (!timerState.isRunning) return "paused";
  if (
    timerState.pomodoro?.phase === "shortBreak" ||
    timerState.pomodoro?.phase === "longBreak"
  ) {
    return "break";
  }
  return "running";
}

export function Dashboard() {
  // --- State ---
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [timerState, setTimerState] = useState<RunningTimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(0);

  // Persistent Tab State
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("dashboard.activeTab") || "timer";
  });

  // Persistent Task Selection (shared across tabs when idle)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    return localStorage.getItem("dashboard.selectedTaskId") || null;
  });

  useEffect(() => {
    localStorage.setItem("dashboard.activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem("dashboard.selectedTaskId", selectedTaskId);
    } else {
      localStorage.removeItem("dashboard.selectedTaskId");
    }
  }, [selectedTaskId]);

  // Stable refs
  const deviceId = useMemo(() => ensureDeviceId(), []);
  const timerStore = useMemo(() => new TimerStore({ deviceId }), [deviceId]);

  // --- Data fetching ---

  /** Refresh all data from IndexedDB */
  const refreshData = useCallback(async () => {
    const [allTasks, allSessions] = await Promise.all([
      db.tasks.toArray(),
      db.sessions.toArray(),
    ]);

    setTasks(allTasks.filter((t) => t.deletedAt == null && !t.isArchived));
    setSessions(allSessions.filter((s) => s.deletedAt == null));
  }, []);

  // Initial data load
  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Refresh data periodically (for multi-tab sync, external changes)
  useEffect(() => {
    const interval = setInterval(() => void refreshData(), 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // --- Timer state polling ---

  useEffect(() => {
    let mounted = true;

    const refreshTimer = async () => {
      const state = await timerStore.getState();
      if (!mounted) return;

      setTimerState(state ?? null);

      // Calculate elapsed seconds from persisted state
      if (state?.isRunning && state.lastTickPerfNow != null) {
        const now = performance.now();
        const elapsed = Math.floor((now - state.lastTickPerfNow) / 1000);
        setElapsedSeconds(state.accumulatedSeconds + elapsed);
      } else if (state) {
        setElapsedSeconds(state.accumulatedSeconds);
      } else {
        setElapsedSeconds(0);
      }
    };

    void refreshTimer();
    const interval = setInterval(() => void refreshTimer(), 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [timerStore]);

  // --- Pomodoro progress calculation ---

  useEffect(() => {
    if (!timerState?.pomodoro) {
      setProgress(0);
      return;
    }

    // Calculate progress based on settings
    const updateProgress = async () => {
      const settings = await db.settings.get("singleton");
      const phase = timerState.pomodoro!.phase;

      const totalSeconds =
        phase === "work"
          ? (settings?.pomodoroWorkMinutes ?? 25) * 60
          : phase === "longBreak"
            ? (settings?.pomodoroLongBreakMinutes ?? 15) * 60
            : (settings?.pomodoroShortBreakMinutes ?? 5) * 60;

      const remaining = timerState.pomodoro!.remainingSeconds;
      const pct = ((totalSeconds - remaining) / totalSeconds) * 100;
      setProgress(Math.max(0, Math.min(100, pct)));
    };

    void updateProgress();
  }, [timerState?.pomodoro?.phase, timerState?.pomodoro?.remainingSeconds]);

  // --- Derived state ---

  const uiState = useMemo(() => deriveUIState(timerState), [timerState]);

  const todayIso = useMemo(() => getTodayIso(), []);

  const todayTotal = useMemo(() => {
    const daily = computeDailyTotals(sessions, todayIso);
    return formatHhMm(daily.totalSeconds);
  }, [sessions, todayIso]);

  /** Tasks scheduled for today with their progress */
  const todayProgress = useMemo(() => {
    const isoWeekday = getTodayIsoWeekday();

    const activeTasks = tasks.filter((task) => {
      if (!task.targetDailyMinutes) return false;

      // Check if task is scheduled for today
      if (task.recurrenceRule) {
        if (task.recurrenceRule.freq === "WEEKLY") {
          const byWeekdays = task.recurrenceRule.byWeekdays;
          if (byWeekdays && byWeekdays.length > 0) {
            return byWeekdays.includes(isoWeekday);
          }
        } else if (task.recurrenceRule.freq === "DAILY") {
          return true;
        }
      }
      return false;
    });

    const daily = computeDailyTotals(sessions, todayIso);

    return activeTasks.map((task) => {
      const loggedSeconds = daily.totalsByTaskId[task.id] ?? 0;
      const loggedMinutes = Math.floor(loggedSeconds / 60);
      const targetMinutes = task.targetDailyMinutes ?? 0;

      return {
        taskId: task.id,
        task,
        loggedMinutes,
        targetMinutes,
      };
    });
  }, [tasks, sessions, todayIso]);

  const totalTodayMinutes = useMemo(() => {
    return todayProgress.reduce((sum, p) => sum + p.loggedMinutes, 0);
  }, [todayProgress]);

  // --- Event handlers ---

  const handleStart = useCallback(async () => {
    if (timerState?.isRunning) return;

    const taskId = selectedTaskId;
    if (!taskId) return;

    const kind = activeTab === "timer" ? "pomodoro" : "normal";
    await timerStore.start(taskId, kind);
  }, [timerState?.isRunning, selectedTaskId, activeTab, timerStore]);

  const handlePause = useCallback(async () => {
    await timerStore.pause();
  }, [timerStore]);

  const handleResume = useCallback(async () => {
    await timerStore.resume();
  }, [timerStore]);

  const handleStop = useCallback(async () => {
    await timerStore.stop();
    // Refresh data to show the new session
    await refreshData();
  }, [timerStore, refreshData]);

  const handleSelectTask = useCallback(
    async (taskId: string) => {
      setSelectedTaskId(taskId);

      // If we are in Manual mode, just selecting the task is enough.
      // If in Timer or Stopwatch mode, we might want to auto-start or just select.
      // Current behavior was auto-start, let's keep it for Timer/Stopwatch if user clicks a task in the list.
      // BUT, if the timer is already running, we ignore or switch?
      // The original code: if (timerState?.isRunning) return;

      if (timerState?.isRunning) return;

      if (activeTab === "manual") {
        return; // Just select
      }

      // For timer/stopwatch, auto-start
      const kind = activeTab === "timer" ? "pomodoro" : "normal";
      await timerStore.start(taskId, kind);
    },
    [timerState?.isRunning, activeTab, timerStore]
  );

  const handleTogglePomodoro = useCallback(async () => {
    // This is now effectively handled by switching Tabs, but we might want to keep
    // some logic if the user switches tabs while running?
    // Actually, switching tabs strictly changes the VIEW. The underlying timer state
    // persists. If I am running a Pomodoro, and I switch to Stopwatch tab, what happens?
    // Ideally, the UI should reflect the RUNNING state. 
    // If I have a running Pomodoro, and I go to Stopwatch tab, maybe I should see the running timer?
    // OR, we disable tab switching while running? 
    // For now, let's assume the user stops before switching or validly switches.
    // If we switch tabs, we don't necessarily change the timer KIND unless we start a new one.
  }, []);

  // Update active tab based on running state to ensure user sees the right interface
  useEffect(() => {
    if (timerState?.isRunning) {
      const runningTab = timerState.kind === "pomodoro" ? "timer" : "stopwatch";
      if (activeTab !== runningTab && activeTab !== "manual") {
        // Optionally force switch, or just let user be. 
        // Let's NOT force switch for now to avoid jarring UX, 
        // but we could show a banner "Timer is running incognito"
        setActiveTab(runningTab);
      }
    }
  }, [timerState?.isRunning, timerState?.kind]);

  const handleManualEntryCreated = useCallback(() => {
    void refreshData();
  }, [refreshData]);

  // --- Render ---

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Today: {todayTotal}</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="timer">Timer</TabsTrigger>
              <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="timer">
              <Card>
                <CardHeader>
                  <CardTitle>Focus Timer</CardTitle>
                </CardHeader>
                <CardContent>
                  <TimerHero
                    state={uiState}
                    elapsedSeconds={elapsedSeconds}
                    progress={progress}
                    isPomodoroMode={true}
                    selectedTaskId={timerState?.taskId ?? selectedTaskId}
                    tasks={tasks}
                    pomodoroPhase={timerState?.pomodoro?.phase}
                    pomodoroSession={(timerState?.pomodoro?.cycleCount ?? 0) + 1}
                    onSelectTask={handleSelectTask}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stopwatch">
              <Card>
                <CardHeader>
                  <CardTitle>Stopwatch</CardTitle>
                </CardHeader>
                <CardContent>
                  <StopwatchHero
                    state={uiState}
                    elapsedSeconds={elapsedSeconds}
                    selectedTaskId={timerState?.taskId ?? selectedTaskId}
                    tasks={tasks}
                    onSelectTask={handleSelectTask}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual">
              <ManualEntryForm
                deviceId={deviceId}
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onCreated={handleManualEntryCreated}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <TodayProgress
            progress={todayProgress}
            totalMinutes={totalTodayMinutes}
          />
        </div>
      </div>
    </div>
  );
}
