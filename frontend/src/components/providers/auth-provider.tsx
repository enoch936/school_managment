'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setActiveOrganizationId, setRefreshHandler } from '@/lib/api/client';
import type { AuthUser, MeResponse } from '@/lib/api/domain';
import { useAuthStore } from '@/lib/auth/store';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const store = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // Browser auth uses httpOnly cookies; the client never stores the token.
  useEffect(() => {
    setRefreshHandler(async () => {
      try {
        await api.post('/auth/refresh', {});
        return true;
      } catch {
        return false;
      }
    });
  }, []);

  useEffect(() => {
    setActiveOrganizationId(store.activeOrganizationId);
  }, [store.activeOrganizationId]);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await api.get<MeResponse>('/auth/me');
      store.setUser(me.user);
      store.setPrincipal(me.principal);
    } catch {
      store.reset();
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (store.isAuthenticated && !store.principal) {
      void refreshMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string, mfaCode?: string) => {
      const result = await api.post<{ user: AuthUser; accessToken: string }>('/auth/login', {
        email,
        password,
        mfaCode,
      });
      store.setUser(result.user);
      const me = await api.get<MeResponse>('/auth/me');
      store.setPrincipal(me.principal);
    },
    [store],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await api.post<{ user: AuthUser }>('/auth/register', input);
      store.setUser(result.user);
      const me = await api.get<MeResponse>('/auth/me');
      store.setPrincipal(me.principal);
    },
    [store],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } finally {
      store.reset();
      queryClient.clear();
    }
  }, [queryClient, store]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
      hasPermission: store.hasPermission,
    }),
    [store.user, store.isAuthenticated, store.hasPermission, isLoading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
