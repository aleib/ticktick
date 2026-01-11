import { CircularProgress } from './CircularProgress';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TaskPicker } from './TaskPicker';
import type { Category, Task } from '@ticktick/shared';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';
import { getTaskAccentColor } from '@/lib/taskColors';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

interface StopwatchHeroProps {
  state: TimerState;
  elapsedSeconds: number;
  selectedTaskId: string | null;
  tasks: Task[];
  categories?: Category[];
  onSelectTask: (taskId: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function StopwatchHero({
  state,
  elapsedSeconds,
  selectedTaskId,
  tasks,
  categories,
  onSelectTask,
  onStart,
  onPause,
  onResume,
  onStop,
}: StopwatchHeroProps) {
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? null;
  const accentColor = getTaskAccentColor(selectedTask, categories);
  const accentBackground = `color-mix(in srgb, ${accentColor} 15%, transparent)`;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-12 md:py-16 px-4",
        "rounded-2xl bg-card/50 border border-border/50",
        "transition-all duration-500",
        state === 'running' && "timer-glow"
      )}
    >
      <div
        className={cn(
          "absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
          "transition-colors"
        )}
        style={{
          color: accentColor,
          borderColor: accentColor,
          backgroundColor: accentBackground,
        }}
      >
        <Zap className="h-4 w-4" />
        Stopwatch
      </div>

      {/* Timer circle */}
      <CircularProgress
        progress={0} // Always 0 or could be used for something else later
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
