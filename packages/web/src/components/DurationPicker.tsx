import * as SliderPrimitive from "@radix-ui/react-slider";
import { clsx, type ClassValue } from "clsx";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type DurationPickerProps = {
  value: number; // in minutes
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

// Common presets for tasks/sessions
const PRESETS = [15, 30, 45, 60, 90, 120];

export function DurationPicker({
  value,
  onChange,
  className,
  min = 5,
  max = 180,
  step = 5,
}: DurationPickerProps) {
  // Format display string (e.g. "1h 30m")
  const displayValue = useMemo(() => {
    const h = Math.floor(value / 60);
    const m = value % 60;
    if (h > 0) {
      return `${h}h ${m > 0 ? `${m}m` : ""}`;
    }
    return `${m}m`;
  }, [value]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header with Display Value and Input Toggle could go here if we wanted complex switching, 
          but for now let's just show a clear verified value */}
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold font-mono tracking-tight",
          value === 0 ? "text-muted-foreground" : "text-primary")}>
          {displayValue}
        </span>
        <div className="w-20">
          {/* Small manual input as fallback/precision */}
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              let v = parseInt(e.target.value);
              if (isNaN(v)) v = 0;
              onChange(v);
            }}
            className="h-8 text-right font-mono"
          />
        </div>
      </div>

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? 0)}
        max={max}
        min={min}
        step={step}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 transition-transform" />
      </SliderPrimitive.Root>

      <div className="grid grid-cols-6 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            variant={value === preset ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-0"
            onClick={() => onChange(preset)}
          >
            {preset < 60 ? `${preset}m` : `${preset / 60}h`}
          </Button>
        ))}
      </div>
    </div>
  );
}
