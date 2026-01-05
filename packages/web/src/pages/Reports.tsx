import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '../db/db.js';
import { computeWeeklyTotals, formatHhMm } from '../reports/localReports.js';
import type { Task, Session } from '@ticktick/shared';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(weekOffset: number = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function formatWeekRange(dates: string[]): string {
  const start = new Date(dates[0]);
  const end = new Date(dates[6]);
  
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Generate colors for tasks
const TASK_COLORS = [
  'hsl(175, 55%, 50%)', // primary
  'hsl(280, 50%, 55%)', // purple
  'hsl(38, 85%, 55%)',  // amber
  'hsl(145, 55%, 45%)', // green
  'hsl(200, 60%, 50%)', // blue
  'hsl(340, 60%, 55%)', // pink
];

export function Reports() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    void db.tasks.toArray().then((rows) => 
      setTasks(rows.filter((t) => t.deletedAt == null && !t.isArchived))
    );
    void db.sessions.toArray().then((rows) => 
      setSessions(rows.filter((s) => s.deletedAt == null))
    );
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  
  const taskColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tasks.forEach((task, index) => {
      map[task.id] = TASK_COLORS[index % TASK_COLORS.length];
    });
    return map;
  }, [tasks]);

  const weekData = useMemo(() => {
    return weekDates.map(date => {
      const daySessions = sessions.filter(s => {
        if (!s.endAt) return false;
        const sessionDate = new Date(s.startAt).toISOString().split('T')[0];
        return sessionDate === date;
      });
      
      const taskTotals: Record<string, number> = {};
      
      daySessions.forEach(session => {
        const minutes = Math.floor((session.durationSeconds ?? 0) / 60);
        taskTotals[session.taskId] = (taskTotals[session.taskId] || 0) + minutes;
      });

      const total = Object.values(taskTotals).reduce((sum, m) => sum + m, 0);
      
      return {
        date,
        taskTotals,
        total,
      };
    });
  }, [weekDates, sessions]);

  const weekTotal = weekData.reduce((sum, d) => sum + d.total, 0);
  const maxDayTotal = Math.max(...weekData.map(d => d.total), 60); // Min 60 for scale

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <span className="text-2xl font-mono font-semibold">
          {formatDuration(weekTotal)}
        </span>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(prev => prev - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-medium">
          {formatWeekRange(weekDates)}
          {isCurrentWeek && <span className="text-muted-foreground ml-2">(This week)</span>}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(prev => prev + 1)}
          disabled={isCurrentWeek}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-xl bg-card/50 border border-border/50 p-6">
        <div className="flex items-end justify-between gap-2 h-48">
          {weekData.map((day, index) => {
            const barHeight = day.total > 0 ? (day.total / maxDayTotal) * 100 : 0;
            const segments = Object.entries(day.taskTotals);

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-40 flex flex-col justify-end">
                  {day.total > 0 ? (
                    <div
                      className="w-full rounded-t-md overflow-hidden transition-all duration-300"
                      style={{ height: `${barHeight}%` }}
                    >
                      {segments.map(([taskId, minutes]) => {
                        const segmentHeight = (minutes / day.total) * 100;
                        return (
                          <div
                            key={taskId}
                            style={{
                              height: `${segmentHeight}%`,
                              backgroundColor: taskColorMap[taskId] || TASK_COLORS[0],
                            }}
                            className="w-full transition-all duration-300"
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-1 bg-border/50 rounded" />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground">
                    {DAYS_SHORT[index]}
                  </div>
                  {day.total > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDuration(day.total)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border/50">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: taskColorMap[task.id] }}
              />
              <span className="text-muted-foreground">{task.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Week summary */}
      <div className="mt-6 rounded-xl bg-card/50 border border-border/50 p-6">
        <h3 className="font-medium mb-4">Week Summary</h3>
        <div className="space-y-3">
          {tasks.map(task => {
            const taskTotal = weekData.reduce((sum, day) => {
              return sum + (day.taskTotals[task.id] || 0);
            }, 0);
            
            const targetMinutes = task.targetWeeklyMinutes ?? 0;
            const percent = targetMinutes > 0 ? Math.min((taskTotal / targetMinutes) * 100, 100) : 0;

            return (
              <div key={task.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{task.title}</span>
                  <span className="text-muted-foreground">
                    {formatDuration(taskTotal)} / {formatDuration(targetMinutes)}
                  </span>
                </div>
                <div className="h-1.5 bg-progress-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: taskColorMap[task.id],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
