import { MorphingTime } from "@/components/ui/morphing-digit";
import { cn } from "@/lib/utils";

type TimerState = "idle" | "running" | "paused" | "break";

type TimerDisplayProps = {
  seconds: number;
  state: TimerState;
};

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const getColorClass = (state: TimerState): string => {
  switch (state) {
    case "running":
      return "text-timer-running";
    case "paused":
      return "text-timer-paused";
    case "break":
      return "text-timer-break";
    default:
      return "text-foreground";
  }
};

export const TimerDisplay = ({ seconds, state }: TimerDisplayProps) => {
  const timeString = formatTime(seconds);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "font-mono text-5xl md:text-6xl font-semibold tracking-tight transition-colors duration-300",
          getColorClass(state),
          state === "paused" && "opacity-70"
        )}
        aria-label={`Timer: ${timeString}`}
        role="timer"
      >
        <MorphingTime time={timeString} />
      </div>
      {state === "paused" ? (
        <span className="text-sm text-timer-paused font-medium animate-fade-in">
          Paused
        </span>
      ) : null}
    </div>
  );
};
