import { CircularProgress } from './CircularProgress';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TaskPicker } from './TaskPicker';
import type { Task } from '@ticktick/shared';
import { cn } from '@/lib/utils';
import { Timer, Zap } from 'lucide-react';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

interface TimerHeroProps {
  state: TimerState;
  elapsedSeconds: number;
  progress: number;
  isPomodoroMode: boolean;
  selectedTaskId: string | null;
  tasks: Task[];
  pomodoroPhase?: 'work' | 'shortBreak' | 'longBreak';
  pomodoroSession?: number;
  onSelectTask: (taskId: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onTogglePomodoro: () => void;
}

export function TimerHero({
  state,
  elapsedSeconds,
  progress,
  isPomodoroMode,
  selectedTaskId,
  tasks,
  pomodoroPhase,
  pomodoroSession,
  onSelectTask,
  onStart,
  onPause,
  onResume,
  onStop,
  onTogglePomodoro,
}: TimerHeroProps) {
  const getPomodoroLabel = () => {
    if (!isPomodoroMode) return null;
    
    if (pomodoroPhase === 'work') {
      return `Session ${pomodoroSession ?? 1}`;
    }
    return pomodoroPhase === 'longBreak' ? 'Long Break' : 'Short Break';
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-12 md:py-16 px-4",
        "rounded-2xl bg-card/50 border border-border/50",
        "transition-all duration-500",
        state === 'running' && "timer-glow"
      )}
    >
      {/* Pomodoro toggle */}
      <button
        onClick={onTogglePomodoro}
        className={cn(
          "absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full",
          "text-sm font-medium transition-all duration-200",
          isPomodoroMode
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        {isPomodoroMode ? (
          <Timer className="h-4 w-4" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {isPomodoroMode ? 'Pomodoro' : 'Stopwatch'}
      </button>

      {/* Timer circle */}
      <CircularProgress
        progress={isPomodoroMode ? progress : 0}
        state={state}
        size={280}
        strokeWidth={4}
      >
        <TimerDisplay seconds={elapsedSeconds} state={state} />
      </CircularProgress>

      {/* Task context */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <TaskPicker
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelect={onSelectTask}
          disabled={state === 'running'}
        />
        
        {isPomodoroMode && (
          <span className={cn(
            "text-sm font-medium",
            state === 'break' ? "text-timer-break" : "text-muted-foreground"
          )}>
            {getPomodoroLabel()}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8">
        <TimerControls
          state={state}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          disabled={!selectedTaskId}
        />
      </div>

      {/* No task selected hint */}
      {!selectedTaskId && state === 'idle' && (
        <p className="mt-4 text-sm text-muted-foreground animate-fade-in">
          Select a task to start tracking
        </p>
      )}
    </div>
  );
}

