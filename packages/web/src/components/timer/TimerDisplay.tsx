import { cn } from '@/lib/utils';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

interface TimerDisplayProps {
  seconds: number;
  state: TimerState;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TimerDisplay({ seconds, state }: TimerDisplayProps) {
  const getColorClass = () => {
    switch (state) {
      case 'running':
        return 'text-timer-running';
      case 'paused':
        return 'text-timer-paused';
      case 'break':
        return 'text-timer-break';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "font-mono text-5xl md:text-6xl font-semibold tracking-tight transition-colors duration-300",
          getColorClass(),
          state === 'paused' && "opacity-70"
        )}
      >
        {formatTime(seconds)}
      </span>
      {state === 'paused' && (
        <span className="text-sm text-timer-paused font-medium animate-fade-in">
          Paused
        </span>
      )}
    </div>
  );
}

