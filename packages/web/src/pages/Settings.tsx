import { useState, useEffect } from 'react';
import { Download, RotateCcw, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { db } from '../db/db.js';
import type { Settings } from '@ticktick/shared';
import { nowIso } from '@ticktick/shared';
import { cn } from '@/lib/utils';

export function Settings() {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pomodoroSettings, setPomodoroSettings] = useState({
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
  });

  const [idleSettings, setIdleSettings] = useState({
    enabled: true,
    timeoutMinutes: 1,
  });

  const [notifications, setNotifications] = useState({
    enabled: true,
    sound: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const s = await db.settings.get("singleton");
      if (s) {
        setSettings(s);
        setPomodoroSettings({
          workMinutes: s.pomodoroWorkMinutes,
          shortBreakMinutes: s.pomodoroShortBreakMinutes,
          longBreakMinutes: s.pomodoroLongBreakMinutes,
          sessionsBeforeLongBreak: s.pomodoroLongBreakEvery,
        });
        setIdleSettings({
          enabled: s.idlePauseSeconds > 0,
          timeoutMinutes: Math.floor(s.idlePauseSeconds / 60),
        });
        setNotifications({
          enabled: s.notificationsEnabled,
          sound: false, // Not stored in settings yet
        });
      }
    };
    void loadSettings();
  }, []);

  const saveSettings = async () => {
    const now = nowIso();
    const updated: Settings = {
      singletonId: "singleton",
      timezone: settings?.timezone ?? 'local',
      weekStartsOn: settings?.weekStartsOn ?? 1,
      idlePauseSeconds: idleSettings.enabled ? idleSettings.timeoutMinutes * 60 : 0,
      pomodoroWorkMinutes: pomodoroSettings.workMinutes,
      pomodoroShortBreakMinutes: pomodoroSettings.shortBreakMinutes,
      pomodoroLongBreakMinutes: pomodoroSettings.longBreakMinutes,
      pomodoroLongBreakEvery: pomodoroSettings.sessionsBeforeLongBreak,
      notificationsEnabled: notifications.enabled,
      createdAt: settings?.createdAt ?? now,
      updatedAt: now,
    };
    await db.settings.put(updated);
    setSettings(updated);
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated.',
    });
  };

  const handleExport = async () => {
    const tasks = await db.tasks.toArray();
    const sessions = await db.sessions.toArray();
    const settings = await db.settings.get("singleton");
    
    const data = {
      tasks,
      sessions,
      settings,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticktick-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Data exported',
      description: 'Your data has been downloaded as a JSON file.',
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure? This will delete all your tasks and time entries.')) {
      void db.tasks.clear();
      void db.sessions.clear();
      void db.runningTimer.clear();
      void db.outbox.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      {/* Appearance */}
      <section className="rounded-xl bg-card/50 border border-border/50 p-6 mb-6">
        <h2 className="font-medium mb-4">Appearance</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme" className="bg-secondary/50 border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Currently using: <span className="font-medium capitalize">{resolvedTheme}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Pomodoro Settings */}
      <section className="rounded-xl bg-card/50 border border-border/50 p-6 mb-6">
        <h2 className="font-medium mb-4">Timer & Pomodoro</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="work">Work Duration (min)</Label>
            <Input
              id="work"
              type="number"
              min={1}
              max={120}
              value={pomodoroSettings.workMinutes}
              onChange={e => setPomodoroSettings(prev => ({
                ...prev,
                workMinutes: parseInt(e.target.value) || 25
              }))}
              className="bg-secondary/50 border-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortBreak">Short Break (min)</Label>
            <Input
              id="shortBreak"
              type="number"
              min={1}
              max={30}
              value={pomodoroSettings.shortBreakMinutes}
              onChange={e => setPomodoroSettings(prev => ({
                ...prev,
                shortBreakMinutes: parseInt(e.target.value) || 5
              }))}
              className="bg-secondary/50 border-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longBreak">Long Break (min)</Label>
            <Input
              id="longBreak"
              type="number"
              min={1}
              max={60}
              value={pomodoroSettings.longBreakMinutes}
              onChange={e => setPomodoroSettings(prev => ({
                ...prev,
                longBreakMinutes: parseInt(e.target.value) || 15
              }))}
              className="bg-secondary/50 border-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessions">Sessions Before Long Break</Label>
            <Input
              id="sessions"
              type="number"
              min={1}
              max={10}
              value={pomodoroSettings.sessionsBeforeLongBreak}
              onChange={e => setPomodoroSettings(prev => ({
                ...prev,
                sessionsBeforeLongBreak: parseInt(e.target.value) || 4
              }))}
              className="bg-secondary/50 border-0"
            />
          </div>
        </div>
        <Button onClick={saveSettings} className="mt-4">Save Settings</Button>
      </section>

      {/* Idle Detection */}
      <section className="rounded-xl bg-card/50 border border-border/50 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Idle Detection</h2>
          <Switch
            checked={idleSettings.enabled}
            onCheckedChange={enabled => setIdleSettings(prev => ({ ...prev, enabled }))}
          />
        </div>
        {idleSettings.enabled && (
          <div className="space-y-2">
            <Label htmlFor="idleTimeout">Pause after inactivity (min)</Label>
            <Input
              id="idleTimeout"
              type="number"
              min={1}
              max={30}
              value={idleSettings.timeoutMinutes}
              onChange={e => setIdleSettings(prev => ({
                ...prev,
                timeoutMinutes: parseInt(e.target.value) || 1
              }))}
              className="bg-secondary/50 border-0 w-32"
            />
          </div>
        )}
        <Button onClick={saveSettings} className="mt-4">Save Settings</Button>
      </section>

      {/* Notifications */}
      <section className="rounded-xl bg-card/50 border border-border/50 p-6 mb-6">
        <h2 className="font-medium mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when sessions complete
              </p>
            </div>
            <Switch
              checked={notifications.enabled}
              onCheckedChange={enabled => setNotifications(prev => ({ ...prev, enabled }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Sound</Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when sessions complete
              </p>
            </div>
            <Switch
              checked={notifications.sound}
              onCheckedChange={sound => setNotifications(prev => ({ ...prev, sound }))}
            />
          </div>
        </div>
        <Button onClick={saveSettings} className="mt-4">Save Settings</Button>
      </section>

      {/* Data */}
      <section className="rounded-xl bg-card/50 border border-border/50 p-6">
        <h2 className="font-medium mb-4">Data</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 border-destructive/50 hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Data
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Your data is stored locally in your browser. Export regularly to avoid data loss.
        </p>
      </section>
    </div>
  );
}
