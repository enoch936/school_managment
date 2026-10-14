'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Principal } from '@/lib/api/domain';

interface AuthState {
  user: AuthUser | null;
  principal: Principal | null;
  activeOrganizationId: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, principal?: Principal | null) => void;
  setUser: (user: AuthUser | null) => void;
  setPrincipal: (principal: Principal | null) => void;
  setActiveOrganization: (organizationId: string | null) => void;
  reset: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      principal: null,
      activeOrganizationId: null,
      isAuthenticated: false,
      setSession: (user, principal = null) =>
        set({
          user,
          principal,
          isAuthenticated: true,
          activeOrganizationId:
            principal?.activeOrganizationId ?? get().activeOrganizationId ??
            principal?.memberships[0]?.organizationId ?? null,
        }),
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      setPrincipal: (principal) =>
        set({
          principal,
          activeOrganizationId:
            principal?.activeOrganizationId ??
            principal?.memberships[0]?.organizationId ??
            get().activeOrganizationId,
        }),
      setActiveOrganization: (organizationId) => set({ activeOrganizationId: organizationId }),
      reset: () =>
        set({ user: null, principal: null, activeOrganizationId: null, isAuthenticated: false }),
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
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
