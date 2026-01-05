import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Task } from '@ticktick/shared';
import { cn } from '@/lib/utils';

interface TaskPickerProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  disabled?: boolean;
}

export function TaskPicker({
  tasks,
  selectedTaskId,
  onSelect,
  disabled,
}: TaskPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className={cn(
            "h-auto py-2 px-3 gap-2 text-base font-medium",
            "hover:bg-secondary/80",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {selectedTask ? (
            <span>{selectedTask.title}</span>
          ) : (
            <span className="text-muted-foreground">Select a task</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border-border" align="center">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filteredTasks.map(task => {
            const isSelected = task.id === selectedTaskId;

            return (
              <button
                key={task.id}
                onClick={() => {
                  onSelect(task.id);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left",
                  "hover:bg-secondary/80 transition-colors",
                  isSelected && "bg-secondary"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{task.title}</span>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
              No tasks found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

