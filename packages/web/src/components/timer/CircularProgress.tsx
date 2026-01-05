import { cn } from '@/lib/utils';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  state: TimerState;
  children?: React.ReactNode;
}

export function CircularProgress({
  progress,
  size = 280,
  strokeWidth = 4,
  state,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStrokeColor = () => {
    switch (state) {
      case 'running':
        return 'stroke-timer-running';
      case 'paused':
        return 'stroke-timer-paused';
      case 'break':
        return 'stroke-timer-break';
      default:
        return 'stroke-timer-idle';
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={cn(
          "transform -rotate-90 transition-all duration-300",
          state === 'running' && "animate-timer-pulse"
        )}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-progress-bg"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-500 ease-out",
            getStrokeColor()
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

