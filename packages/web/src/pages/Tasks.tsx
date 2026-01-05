import { useState, useEffect } from 'react';
import { Plus, Archive, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '../db/db.js';
import { ensureDeviceId } from '../sync/deviceId.js';
import { enqueueMutation } from '../sync/outbox.js';
import type { Task, RecurrenceRule } from '@ticktick/shared';
import { nowIso } from '@ticktick/shared';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Convert ISO weekday (1=Mon, 7=Sun) to JS day (0=Sun, 6=Sat)
function isoToJsDay(iso: number): number {
  return iso === 7 ? 0 : iso;
}

// Convert JS day (0=Sun, 6=Sat) to ISO weekday (1=Mon, 7=Sun)
function jsToIsoDay(js: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    dailyTargetMinutes: 30,
    weeklyTargetMinutes: 150,
    recurrenceDays: [1, 2, 3, 4, 5] as number[], // ISO weekdays
  });
  const deviceId = ensureDeviceId();

  useEffect(() => {
    void db.tasks
      .toArray()
      .then((rows) => setTasks(rows.filter((t) => t.deletedAt == null)));
  }, []);

  const activeTasks = tasks.filter(t => !t.isArchived);
  const archivedTasks = tasks.filter(t => t.isArchived);
  
  const tasksByCategory = activeTasks.reduce((acc, task) => {
    const category = task.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      description: '',
      dailyTargetMinutes: 30,
      weeklyTargetMinutes: 150,
      recurrenceDays: [1, 2, 3, 4, 5],
    });
    setEditingTask(null);
  };

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      const recurrenceDays = task.recurrenceRule?.freq === 'WEEKLY' && task.recurrenceRule.byWeekdays
        ? task.recurrenceRule.byWeekdays
        : [1, 2, 3, 4, 5];
      setFormData({
        title: task.title,
        category: task.category || '',
        description: task.description || '',
        dailyTargetMinutes: task.targetDailyMinutes ?? 30,
        weeklyTargetMinutes: task.targetWeeklyMinutes ?? 150,
        recurrenceDays,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = nowIso();
    
    const recurrenceRule: RecurrenceRule = {
      freq: 'WEEKLY',
      byWeekdays: formData.recurrenceDays as Array<1 | 2 | 3 | 4 | 5 | 6 | 7>,
    };

    if (editingTask) {
      const updated: Task = {
        ...editingTask,
        title: formData.title,
        category: formData.category || null,
        description: formData.description || null,
        targetDailyMinutes: formData.dailyTargetMinutes,
        targetWeeklyMinutes: formData.weeklyTargetMinutes,
        recurrenceRule,
        updatedAt: now,
      };
      await db.tasks.put(updated);
      await enqueueMutation({
        deviceId,
        op: 'upsert',
        entityType: 'task',
        entityId: updated.id,
        payload: updated,
        clientTs: now,
      });
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: formData.title,
        category: formData.category || null,
        description: formData.description || null,
        targetDailyMinutes: formData.dailyTargetMinutes,
        targetWeeklyMinutes: formData.weeklyTargetMinutes,
        recurrenceRule,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await db.tasks.put(newTask);
      await enqueueMutation({
        deviceId,
        op: 'upsert',
        entityType: 'task',
        entityId: newTask.id,
        payload: newTask,
        clientTs: now,
      });
      setTasks(prev => [newTask, ...prev]);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleDay = (isoDay: number) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(isoDay)
        ? prev.recurrenceDays.filter(d => d !== isoDay)
        : [...prev.recurrenceDays, isoDay].sort(),
    }));
  };

  const archiveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated: Task = { ...task, isArchived: true, updatedAt: nowIso() };
    await db.tasks.put(updated);
    await enqueueMutation({
      deviceId,
      op: 'upsert',
      entityType: 'task',
      entityId: id,
      payload: updated,
      clientTs: nowIso(),
    });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const restoreTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated: Task = { ...task, isArchived: false, updatedAt: nowIso() };
    await db.tasks.put(updated);
    await enqueueMutation({
      deviceId,
      op: 'upsert',
      entityType: 'task',
      entityId: id,
      payload: updated,
      clientTs: nowIso(),
    });
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Deep Work"
                  required
                  className="bg-secondary/50 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Work"
                  required
                  className="bg-secondary/50 border-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily">Daily Target (min)</Label>
                  <Input
                    id="daily"
                    type="number"
                    min={1}
                    value={formData.dailyTargetMinutes}
                    onChange={e => setFormData(prev => ({ ...prev, dailyTargetMinutes: parseInt(e.target.value) || 0 }))}
                    className="bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly">Weekly Target (min)</Label>
                  <Input
                    id="weekly"
                    type="number"
                    min={1}
                    value={formData.weeklyTargetMinutes}
                    onChange={e => setFormData(prev => ({ ...prev, weeklyTargetMinutes: parseInt(e.target.value) || 0 }))}
                    className="bg-secondary/50 border-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex gap-1">
                  {DAYS.map((day, index) => {
                    const isoDay = jsToIsoDay(index);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(isoDay)}
                        className={cn(
                          "flex-1 py-2 text-xs font-medium rounded-md transition-colors",
                          formData.recurrenceDays.includes(isoDay)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tasks */}
      <div className="space-y-6">
        {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
          <div key={category}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="space-y-2">
              {categoryTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {task.targetDailyMinutes}m daily • {task.targetWeeklyMinutes}m weekly
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleOpenDialog(task)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void archiveTask(task.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Archived Tasks */}
      {archivedTasks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Archived
          </h2>
          <div className="space-y-2 opacity-60">
            {archivedTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg bg-card/30 border border-border/30"
              >
                <div>
                  <h3 className="font-medium">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.category || 'Uncategorized'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void restoreTask(task.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
