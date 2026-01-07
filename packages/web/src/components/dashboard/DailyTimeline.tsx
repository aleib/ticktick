import type { Session, Task } from "@ticktick/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DailyTimelineProps {
  sessions: Session[];
  taskMap: Record<string, Task>;
}

function hashStringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

function getTaskColor(taskId: string): string {
  const hue = hashStringToHue(taskId);
  return `hsl(${hue}, 65%, 55%)`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function DailyTimeline({ sessions, taskMap }: DailyTimelineProps) {
  if (sessions.length === 0) {
    return null;
  }

  // Convert sessions to timeline segments
  const segments = sessions.map((session) => {
    const startDate = new Date(session.startAt);
    const endDate = session.endAt ? new Date(session.endAt) : new Date();

    // Calculate position as percentage of day (0-100%)
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    const leftPercent = (startMinutes / (24 * 60)) * 100;
    const widthPercent = ((endMinutes - startMinutes) / (24 * 60)) * 100;

    const task = taskMap[session.taskId];
    const taskTitle = task?.title || "Unknown Task";
    const color = getTaskColor(session.taskId);

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

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Daily Timeline
      </h3>

      {/* Timeline container */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-12 bg-secondary/20 rounded-lg border border-border/30 relative overflow-hidden">
          {/* Hour markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-border/10 last:border-r-0"
              />
            ))}
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
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
}
