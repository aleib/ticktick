import { useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.js";
import { Toaster } from "../components/ui/toaster.js";
import { ThemeProvider } from "../hooks/use-theme.jsx";
import { ensureDeviceId } from "../sync/deviceId.js";

import { Dashboard } from "../pages/Dashboard.js";
import { NotFound } from "../pages/NotFound.js";
import { Reports } from "../pages/Reports.js";
import { Sessions } from "../pages/Sessions.js";
import { Settings } from "../pages/Settings.js";
import { Tasks } from "../pages/Tasks.js";

export function App() {
  const deviceId = useMemo(() => ensureDeviceId(), []);

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
