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
import type { Task, RecurrenceRule, Category } from '@ticktick/shared';
import { nowIso } from '@ticktick/shared';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { generateColorSuggestion } from '@/lib/colorUtils';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    categoryColor: '',
    taskColor: '',
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

    void db.categories
      .toArray()
      .then(rows => setCategories(rows.filter(c => c.deletedAt == null)));
  }, []);

  const activeTasks = tasks.filter(t => !t.isArchived);
  const archivedTasks = tasks.filter(t => t.isArchived);

  // Helper to find category color
  const getCategoryColor = (name: string): string | null => {
    return categories.find(c => c.name === name)?.color || null;
  };

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
      categoryColor: '',
      taskColor: '',
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
        categoryColor: task.category ? getCategoryColor(task.category) || '' : '',
        taskColor: task.color || '',
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

    // Handle Category Creation/Update
    if (formData.category) {
      const existingCategory = categories.find(c => c.name === formData.category);
      if (!existingCategory) {
        // Create new category
        const newCategory: Category = {
          id: crypto.randomUUID(),
          name: formData.category,
          color: formData.categoryColor || null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        await db.categories.put(newCategory);
        await enqueueMutation({
          deviceId,
          op: 'upsert',
          entityType: 'category',
          entityId: newCategory.id,
          payload: newCategory,
          clientTs: now,
        });
        setCategories(prev => [...prev, newCategory]);
      } else if (formData.categoryColor && existingCategory.color !== formData.categoryColor) {
        // Update category color if changed
        const updatedCategory = { ...existingCategory, color: formData.categoryColor, updatedAt: now };
        await db.categories.put(updatedCategory);
        await enqueueMutation({
          deviceId,
          op: 'upsert',
          entityType: 'category',
          entityId: updatedCategory.id,
          payload: updatedCategory,
          clientTs: now,
        });
        setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
      }
    }

    const recurrenceRule: RecurrenceRule = {
      freq: 'WEEKLY',
      byWeekdays: formData.recurrenceDays as Array<1 | 2 | 3 | 4 | 5 | 6 | 7>,
    };

    if (editingTask) {
      const updated: Task = {
        ...editingTask,
        title: formData.title,
        category: formData.category || null,
        color: formData.taskColor || null,
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
        color: formData.taskColor || null,
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
                <Label htmlFor="category">Category</Label>
                <div className="flex gap-2 items-start">
                  <div className="flex gap-2">
                    <ColorPicker
                      value={formData.categoryColor}
                      onChange={(color) => setFormData(prev => ({ ...prev, categoryColor: color }))}
                      className="w-6 h-6 p-0 m-auto"
                    />
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={e => {
                        const newCategory = e.target.value;
                        const existingCat = categories.find(c => c.name === newCategory);
                        setFormData(prev => ({
                          ...prev,
                          category: newCategory,
                          categoryColor: existingCat?.color || prev.categoryColor,
                          // Suggest a task color if one isn't set, based on category
                          taskColor: (prev.taskColor === '' && newCategory)
                            ? generateColorSuggestion(existingCat?.color || '#808080')
                            : prev.taskColor
                        }));
                      }}
                      placeholder="e.g., Work"
                      required
                      className="bg-secondary/50 border-0"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <div className="flex gap-2">
                  <ColorPicker
                    value={formData.taskColor}
                    onChange={(color) => setFormData(prev => ({ ...prev, taskColor: color }))}
                    onClear={() => setFormData(prev => ({ ...prev, taskColor: '' }))}
                    className="w-6 h-6 p-0 m-auto"
                  />
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Deep Work"
                    required
                    className="bg-secondary/50 border-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily">Daily Target (min)</Label>
                  <Input
                    id="daily"
                    type="number"
                    min={0}
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
        {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
          const categoryColor = getCategoryColor(category);
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColor || 'transparent', border: categoryColor ? 'none' : '1px solid currentColor' }}
                />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {category}
                </h2>
              </div>
              <div className="space-y-2">
                {categoryTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors"
                    style={{ borderLeft: `4px solid ${task.color || categoryColor || 'transparent'}` }}
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
          );
        })}
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
