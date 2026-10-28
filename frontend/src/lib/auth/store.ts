'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Principal } from '@/lib/api/domain';

interface AuthState {
  user: AuthUser | null;
  principal: Principal | null;
  activeOrganizationId: string | null;
  activeSchoolId: string | null;
  activeCampusId: string | null;
  activeAcademicYearId: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, principal?: Principal | null) => void;
  setUser: (user: AuthUser | null) => void;
  setPrincipal: (principal: Principal | null) => void;
  setActiveOrganization: (organizationId: string | null) => void;
  setActiveSchool: (schoolId: string | null) => void;
  setActiveCampus: (campusId: string | null) => void;
  setActiveAcademicYear: (yearId: string | null) => void;
  reset: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      principal: null,
      activeOrganizationId: null,
      activeSchoolId: null,
      activeCampusId: null,
      activeAcademicYearId: null,
      isAuthenticated: false,
      setSession: (user, principal = null) =>
        set({
          user,
          principal,
          isAuthenticated: true,
          activeOrganizationId:
            principal?.activeOrganizationId ?? get().activeOrganizationId ??
            principal?.memberships[0]?.organizationId ?? null,
          activeSchoolId: principal?.activeSchoolId ?? get().activeSchoolId ?? null,
          activeCampusId: principal?.activeCampusId ?? get().activeCampusId ?? null,
          activeAcademicYearId: principal?.activeAcademicYearId ?? get().activeAcademicYearId ?? null,
        }),
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      setPrincipal: (principal) =>
        set({
          principal,
          activeOrganizationId:
            principal?.activeOrganizationId ??
            principal?.memberships[0]?.organizationId ??
            get().activeOrganizationId,
          activeSchoolId: principal?.activeSchoolId ?? get().activeSchoolId,
          activeCampusId: principal?.activeCampusId ?? get().activeCampusId,
          activeAcademicYearId: principal?.activeAcademicYearId ?? get().activeAcademicYearId,
        }),
      setActiveOrganization: (organizationId) => set({ activeOrganizationId: organizationId }),
      setActiveSchool: (schoolId) => set({ activeSchoolId: schoolId }),
      setActiveCampus: (campusId) => set({ activeCampusId: campusId }),
      setActiveAcademicYear: (yearId) => set({ activeAcademicYearId: yearId }),
      reset: () =>
        set({
          user: null,
          principal: null,
          activeOrganizationId: null,
          activeSchoolId: null,
          activeCampusId: null,
          activeAcademicYearId: null,
          isAuthenticated: false,
        }),
      hasPermission: (permission) => {
        const principal = get().principal;
        if (!principal) return false;
        if (principal.isPlatformAdmin) return true;
        return principal.permissions.includes(permission);
      },
    }),
    {
      name: 'sms-auth',
      partialize: (state) => ({
        user: state.user,
        principal: state.principal,
        activeOrganizationId: state.activeOrganizationId,
        activeSchoolId: state.activeSchoolId,
        activeCampusId: state.activeCampusId,
        activeAcademicYearId: state.activeAcademicYearId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
