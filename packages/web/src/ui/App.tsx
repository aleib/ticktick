import { useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "../hooks/use-theme.jsx";
import { AppLayout } from "../components/layout/AppLayout.js";
import { Toaster } from "../components/ui/toaster.js";
import { TimerStore } from "../timer/timerStore.js";
import { ensureDeviceId } from "../sync/deviceId.js";

import { Dashboard } from "../pages/Dashboard.js";
import { Tasks } from "../pages/Tasks.js";
import { Reports } from "../pages/Reports.js";
import { Settings } from "../pages/Settings.js";
import { NotFound } from "../pages/NotFound.js";
import { Sessions } from "../pages/Sessions.js";

export function App() {
  const deviceId = useMemo(() => ensureDeviceId(), []);
  const timerStore = useMemo(() => new TimerStore({ deviceId }), [deviceId]);

  useEffect(() => {
    // On reload, the app should never silently keep running. We persist state but pause it.
    const onLifecycle = () => {
      void timerStore.pauseForLifecycle();
    };
    window.addEventListener("pagehide", onLifecycle);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        onLifecycle();
      }
    });
    return () => {
      window.removeEventListener("pagehide", onLifecycle);
    };
  }, [timerStore]);



  return (
    <ThemeProvider defaultTheme="system" storageKey="ticktick-theme">
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}
