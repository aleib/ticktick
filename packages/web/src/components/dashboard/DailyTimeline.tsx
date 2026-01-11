import { getTaskAccentColor } from "@/lib/taskColors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Category, Session, Task } from "@ticktick/shared";
interface DailyTimelineProps {
  sessions: Session[];
  taskMap: Record<string, Task>;
  categories?: Category[];
}

const DEFAULT_VIEW_START_MINUTES = 7 * 60; // 06:00
const DEFAULT_VIEW_END_MINUTES = 18 * 60; // 22:00
const MINUTES_IN_DAY = 24 * 60;
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function formatMinutesLabel(totalMinutes: number): string {
  const minutes = Math.max(0, Math.min(totalMinutes, MINUTES_IN_DAY));
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function DailyTimeline({
  sessions,
  taskMap,
  categories,
}: DailyTimelineProps) {
  if (sessions.length === 0) {
    return null;
  }

  // Derive view window: default 06:00-22:00, widen if any session exceeds it.
  const sessionWindows = sessions.map((session) => {
    const startDate = new Date(session.startAt);
    const endDate = session.endAt ? new Date(session.endAt) : new Date();
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    return { startMinutes, endMinutes };
  });

  const minStart = Math.min(
    ...sessionWindows.map((w) => w.startMinutes),
    DEFAULT_VIEW_START_MINUTES
  );
  const maxEnd = Math.max(
    ...sessionWindows.map((w) => w.endMinutes),
    DEFAULT_VIEW_END_MINUTES
  );
  const viewStart = Math.max(0, Math.min(DEFAULT_VIEW_START_MINUTES, minStart));
  const viewEnd = Math.min(
    MINUTES_IN_DAY,
    Math.max(DEFAULT_VIEW_END_MINUTES, maxEnd)
  );
  const viewRange = Math.max(1, viewEnd - viewStart); // avoid divide-by-zero

  // Convert sessions to timeline segments within the view window
  const segments = sessions.map((session) => {
    const startDate = new Date(session.startAt);
    const endDate = session.endAt ? new Date(session.endAt) : new Date();

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    const leftPercent = ((startMinutes - viewStart) / viewRange) * 100;
    const widthPercent = ((endMinutes - startMinutes) / viewRange) * 100;

    const task = taskMap[session.taskId];
    const taskTitle = task?.title || "Unknown Task";
    const color = getTaskAccentColor(task ?? null, categories);

    return {
      session,
      task,
      taskTitle,
      color,
      leftPercent,
      widthPercent,
      startTime: formatTime(session.startAt),
      endTime: session.endAt ? formatTime(session.endAt) : "Now",
      duration: formatDuration(session.durationSeconds || 0),
    };
  });

  const startHour = Math.floor(viewStart / 60);
  const endHour = Math.ceil(viewEnd / 60);
  const hourTicks = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  const labelPositions = [0, 0.25, 0.5, 0.75, 1];
  const labels = labelPositions.map((position) => {
    const minutes = viewStart + viewRange * position;
    return formatMinutesLabel(minutes);
  });

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Daily Timeline
      </h3>

      {/* Timeline container */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-12 bg-secondary/20 rounded-lg border border-border/30 relative overflow-hidden">
          {/* Hour markers aligned to the current view window */}
          <div className="absolute inset-0">
            {hourTicks.map((hour) => {
              const left = ((hour * 60 - viewStart) / viewRange) * 100;
              return (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 border-r border-border/10 last:border-r-0"
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>

          {/* Session segments */}
          <TooltipProvider>
            {segments.map((segment, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:brightness-110 hover:scale-y-110 hover:z-10"
                    style={{
                      left: `${segment.leftPercent}%`,
                      width: `${Math.max(segment.widthPercent, 0.5)}%`,
                      backgroundColor: segment.color,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-semibold">{segment.taskTitle}</div>
                    <div className="text-muted-foreground">
                      {segment.startTime} - {segment.endTime}
                    </div>
                    <div className="text-muted-foreground">
                      {segment.duration}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          {labels.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
