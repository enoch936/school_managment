'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Building2,
  Calendar,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar } from './sidebar';
import { useAuth } from '@/components/providers/auth-provider';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/store';
import { fetchAvailableContexts } from '@/features/contexts/api';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  platform_super_admin: 'Platform Super Administrator',
  school_owner: 'School Owner',
  school_admin: 'School Administrator',
  campus_admin: 'Campus Administrator',
  principal: 'Principal / Head Teacher',
  vice_principal: 'Vice Principal',
  registrar: 'Registrar',
  admissions_officer: 'Admissions Officer',
  academic_coordinator: 'Academic Coordinator',
  department_head: 'Department Head',
  teacher: 'Teacher',
  assistant_teacher: 'Assistant Teacher',
  student: 'Student',
  parent: 'Parent / Guardian',
  accountant: 'Accountant',
  cashier: 'Cashier',
  hr_manager: 'HR Manager',
  payroll_officer: 'Payroll Officer',
  librarian: 'Librarian',
  transport_manager: 'Transport Manager',
  nurse: 'School Nurse',
  counselor: 'Counselor',
  exam_officer: 'Examination Officer',
  it_support: 'IT Support',
  auditor: 'Auditor',
};

export function PortalHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const user = useAuthStore((s) => s.user);
  const principal = useAuthStore((s) => s.principal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const activeCampusId = useAuthStore((s) => s.activeCampusId);
  const activeAcademicYearId = useAuthStore((s) => s.activeAcademicYearId);

  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);
  const setActiveSchool = useAuthStore((s) => s.setActiveSchool);
  const setActiveCampus = useAuthStore((s) => s.setActiveCampus);
  const setActiveAcademicYear = useAuthStore((s) => s.setActiveAcademicYear);

  const { data: contextsData } = useQuery({
    queryKey: ['contexts', 'available'],
    queryFn: fetchAvailableContexts,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const onLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleOrganizationChange = (newOrgId: string) => {
    setActiveOrganization(newOrgId || null);
    // Reset subordinate context to let server resolve defaults
    setActiveSchool(null);
    setActiveCampus(null);
    setActiveAcademicYear(null);
    void queryClient.invalidateQueries();
  };

  const handleSchoolChange = (newSchoolId: string) => {
    setActiveSchool(newSchoolId || null);
    setActiveCampus(null);
    setActiveAcademicYear(null);
    void queryClient.invalidateQueries();
  };

  const handleCampusChange = (newCampusId: string) => {
    setActiveCampus(newCampusId || null);
    void queryClient.invalidateQueries();
  };

  const handleAcademicYearChange = (newYearId: string) => {
    setActiveAcademicYear(newYearId || null);
    void queryClient.invalidateQueries();
  };

  // Find active selections in the fetched tree
  const currentOrg =
    contextsData?.organizations.find((o) => o.id === activeOrganizationId) ??
    contextsData?.organizations[0];

  const availableSchools = currentOrg?.schools ?? [];
  const currentSchool =
    availableSchools.find((s) => s.id === activeSchoolId) ?? availableSchools[0];

  const availableCampuses = currentSchool?.campuses ?? [];
  const availableYears = currentSchool?.academicYears ?? [];
  const currentYear =
    availableYears.find((y) => y.id === activeAcademicYearId) ??
    availableYears.find((y) => y.isCurrent) ??
    availableYears[0];

  const activeRoleName = principal?.activeRoleKey
    ? (ROLE_DISPLAY_NAMES[principal.activeRoleKey] ?? principal.activeRoleKey)
    : principal?.isPlatformAdmin
      ? 'Platform Super Administrator'
      : 'User';

  const isClosedYear = currentYear && !currentYear.isCurrent;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Multi-Tenancy Context Selector Bar */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto text-xs">
        {/* Organization Selector (if user has access to multiple) */}
        {contextsData && contextsData.organizations.length > 1 && (
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Active Organization"
              className="bg-transparent text-xs font-medium focus:outline-none"
              value={activeOrganizationId ?? currentOrg?.id ?? ''}
              onChange={(e) => handleOrganizationChange(e.target.value)}
            >
              {contextsData.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* School Selector (if school has multiple or accessible) */}
        {availableSchools.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            {availableSchools.length > 1 ? (
              <select
                aria-label="Active School"
                className="bg-transparent text-xs font-medium focus:outline-none"
                value={activeSchoolId ?? currentSchool?.id ?? ''}
                onChange={(e) => handleSchoolChange(e.target.value)}
              >
                {availableSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-foreground">
                {currentSchool?.name ?? 'School'}
              </span>
            )}
          </div>
        )}

        {/* Campus Selector */}
        {availableCampuses.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
            <MapPin className="h-3.5 w-3.5 text-sky-500" />
            {availableCampuses.length > 1 ? (
              <select
                aria-label="Active Campus"
                className="bg-transparent text-xs font-medium focus:outline-none"
                value={activeCampusId ?? ''}
                onChange={(e) => handleCampusChange(e.target.value)}
              >
                <option value="">All Campuses</option>
                {availableCampuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-muted-foreground">{availableCampuses[0].name}</span>
            )}
          </div>
        )}

        {/* Academic Year Selector */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <select
              aria-label="Academic Year"
              className="bg-transparent text-xs font-medium focus:outline-none"
              value={activeAcademicYearId ?? currentYear?.id ?? ''}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
            >
              {availableYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '• Active' : `(${ay.status})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Closed Academic Year Alert Pill */}
        {isClosedYear && (
          <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldAlert className="h-3 w-3" />
            Historical View (Read-Only)
          </Badge>
        )}
      </div>

      <div className="flex-1" />

      {/* Role Pill */}
      <Badge variant="secondary" className="hidden sm:inline-flex font-medium text-xs px-2.5 py-0.5">
        {activeRoleName}
      </Badge>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="h-5 w-5 dark:hidden" />
        <Moon className="hidden h-5 w-5 dark:block" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">{user?.firstName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-semibold">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              <span className="mt-1 text-[11px] font-medium text-primary">
                {activeRoleName}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <UserIcon className="h-4 w-4" /> Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
