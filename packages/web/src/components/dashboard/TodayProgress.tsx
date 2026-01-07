import { cn } from "@/lib/utils";
import type { Task, Category } from "@ticktick/shared";
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
  categories?: Category[];
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TodayProgress({
  progress,
  totalMinutes,
  categories = [],
  selectedTaskId,
  onSelectTask,
}: TodayProgressProps) {
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

      <div className="space-y-2">
        {progress.map(({ taskId, task, loggedMinutes, targetMinutes }) => {
          const percent =
            targetMinutes > 0
              ? Math.min((loggedMinutes / targetMinutes) * 100, 100)
              : 100;
          const isComplete = percent >= 100;
          const isSelected = taskId === selectedTaskId;

          // Determine color: Task Color -> Category Color -> Default (Primary)
          const taskColor = task.color;
          const categoryColor = task.category
            ? categories.find(c => c.name === task.category)?.color
            : null;
          const barColor = taskColor || categoryColor || 'hsl(var(--primary))';

          return (
            <div
              key={taskId}
              className={cn(
                "group relative p-3 rounded-lg transition-all duration-200 border",
                onSelectTask && "cursor-pointer",
                isSelected
                  ? "bg-accent/10 border-accent/50 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-accent/5"
              )}
              onClick={() => onSelectTask?.(taskId)}
            >
              <div className="flex items-center justify-between mb-2 z-10 relative">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium transition-colors",
                      isSelected && "text-primary"
                    )}
                  >
                    {task.title}
                  </span>
                  {isComplete && <Check className="h-4 w-4 text-muted-foreground/50" />}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(loggedMinutes)}
                  {targetMinutes > 0 && (
                    <>
                      <span className="mx-1">/</span>
                      {formatDuration(targetMinutes)}
                    </>
                  )}
                </span>
              </div>
              <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percent}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
