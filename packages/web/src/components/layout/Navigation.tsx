import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListTodo, BarChart3, Settings, Clock, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sessions', label: 'Sessions', icon: CalendarCheck },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:relative md:border-t-0 md:border-r md:h-screen md:w-64 md:shrink-0">
      {/* Logo - Desktop only */}
      <div className="hidden md:flex items-center gap-2 px-6 py-5 border-b border-border">
        <Clock className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">TickTick</span>
      </div>

      {/* Nav items */}
      <ul className="flex md:flex-col justify-around md:justify-start md:gap-1 md:p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-3",
                  "py-3 px-4 md:px-4 md:py-2.5 rounded-lg",
                  "text-xs md:text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )
              }
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

