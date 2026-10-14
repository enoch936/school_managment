'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarCheck,
  CreditCard,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
  Bus,
  Users,
  UserSquare2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  planned?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: Users, permission: 'student:read' },
  { href: '/academics', label: 'Academics', icon: BookOpen, permission: 'class:read' },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, permission: 'attendance:read' },
  { href: '/guardians', label: 'Guardians', icon: UserSquare2, permission: 'guardian:read', planned: true },
  { href: '/examinations', label: 'Examinations', icon: GraduationCap, permission: 'exam:read', planned: true },
  { href: '/finance', label: 'Finance', icon: CreditCard, permission: 'invoice:read', planned: true },
  { href: '/library', label: 'Library', icon: Library, permission: 'library:read', planned: true },
  { href: '/transport', label: 'Transport', icon: Bus, permission: 'transport:read', planned: true },
  { href: '/reports', label: 'Reports', icon: FileBarChart, permission: 'report:read', planned: true },
  { href: '/audit', label: 'Audit log', icon: ShieldCheck, permission: 'audit:read' },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const principal = useAuthStore((s) => s.principal);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const visible = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission) || principal?.isPlatformAdmin,
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" aria-hidden />
        <span className="truncate">School MS</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (item.planned) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Planned module"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60"
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  Soon
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        {principal?.memberships.length ? `${principal.memberships.length} membership(s)` : 'No memberships'}
      </div>
    </div>
  );
}
