'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/navigation/sidebar';
import { PortalHeader } from '@/components/navigation/portal-header';
import { useAuthStore } from '@/lib/auth/store';
import { useNotificationsSocket } from '@/lib/socket/use-notifications-socket';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // Connect real-time WebSockets notifications listener
  useNotificationsSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
