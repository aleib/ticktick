import { cn } from "@/lib/utils";
import type { Task } from "@ticktick/shared";
import { Check } from "lucide-react";

type DailyProgress = {
  taskId: string;
  task: Task;
  loggedMinutes: number;
  targetMinutes: number;
};

interface TodayProgressProps {
  progress: DailyProgress[];
  totalMinutes: number;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TodayProgress({ progress, totalMinutes }: TodayProgressProps) {
  if (progress.length === 0) {
    return (
      <div className="rounded-xl bg-card/50 border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Today</h2>
        <p className="text-muted-foreground text-sm">
          No tasks scheduled for today.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card/50 border border-border/50 p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-lg font-semibold">Today</h2>
        <span className="text-2xl font-mono font-semibold text-foreground">
          {formatDuration(totalMinutes)}
        </span>
      </div>

      <div className="space-y-4">
        {progress.map(({ taskId, task, loggedMinutes, targetMinutes }) => {
          const percent = Math.min((loggedMinutes / targetMinutes) * 100, 100);
          const isComplete = percent >= 100;

          return (
            <div key={taskId} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{task.title}</span>
                  {isComplete && <Check className="h-4 w-4 text-success" />}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(loggedMinutes)}
                  <span className="mx-1">/</span>
                  {formatDuration(targetMinutes)}
                </span>
              </div>
              <div className="h-2 bg-progress-bg rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    isComplete ? "bg-success" : "bg-progress-fill"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
