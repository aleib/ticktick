import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

import "react-day-picker/dist/style.css";

export type DatePickerProps = {
  date?: Date;
  onSelect: (date?: Date) => void;
  className?: string;
};

export function DatePicker({ date, onSelect, className }: DatePickerProps) {
  // Styles override for shadcn-like look if we want, or just use default for speed then customize
  // Since we don't have a full shadcn Calendar component in the repo (it wasn't in list_dir),
  // we are using raw react-day-picker but standardizing the trigger button.

  // Note: react-day-picker v9 has new css import or we can use the classNames prop for Tailwind.
  // Assuming minimal css for now.

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={onSelect}
          showOutsideDays
          className="p-3"
          classNames={{
            root: "rdp-root", // We might need to inject some global styles for rdp if css not loaded
            // Simple mapping to Tailwind if we want "shadcn" look instantly:
            // This is extensive, let's stick to basic first or rely on the import "react-day-picker/dist/style.css" we added.
          }}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
        // Default to today
        />
      </PopoverContent>
    </Popover>
  );
}
