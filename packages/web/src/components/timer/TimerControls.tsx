import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

interface TimerControlsProps {
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function TimerControls({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled,
}: TimerControlsProps) {
  if (state === 'idle') {
    return (
      <Button
        size="lg"
        onClick={onStart}
        disabled={disabled}
        className="h-12 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        <Play className="h-5 w-5" />
        Start
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {state === 'running' ? (
        <Button
          size="lg"
          variant="outline"
          onClick={onPause}
          className={cn(
            "h-12 px-6 gap-2 border-timer-paused/50",
            "hover:bg-timer-paused/10 hover:border-timer-paused"
          )}
        >
          <Pause className="h-5 w-5 text-timer-paused" />
          <span className="text-timer-paused">Pause</span>
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onResume}
          className="h-12 px-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Play className="h-5 w-5" />
          Resume
        </Button>
      )}
      <Button
        size="lg"
        variant="outline"
        onClick={onStop}
        className="h-12 px-6 gap-2 border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
      >
        <Square className="h-4 w-4 text-destructive" />
        <span className="text-destructive">Stop</span>
      </Button>
    </div>
  );
}

