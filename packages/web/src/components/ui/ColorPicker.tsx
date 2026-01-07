import { useState, useCallback } from "react";
import { Check, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const PRESET_COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#78716c", // stone-500
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  onClear?: () => void;
  className?: string;
}

export function ColorPicker({ value, onChange, onClear, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || "#000000");

  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  }, [onChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-full border border-border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aspect-square",
            className
          )}
          style={{ backgroundColor: value || "transparent" }}
          onClick={() => setIsOpen(true)}
        >
          {!value && <div className="w-full h-full bg-secondary/30" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card border-border">
        <div className="grid grid-cols-6 gap-2 mb-4">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                "h-8 w-8 rounded-md border border-border/50 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                value === color && "ring-2 ring-primary ring-offset-2 border-primary"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setCustomColor(color);
                setIsOpen(false);
              }}
              title={color}
            >
              {value === color && (
                <Check className="h-4 w-4 text-white mx-auto drop-shadow-md" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground">Custom Color</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                className="pl-8"
                maxLength={7}
              />
              <div
                className="absolute left-2.5 top-2.5 h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: customColor }}
              />
            </div>
            <div className="relative w-10 h-10 overflow-hidden rounded-md border border-border cursor-pointer hover:opacity-90">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
              />
              <Pipette className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {onClear && (
          <div className="pt-3 mt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
            >
              Clear Color
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
