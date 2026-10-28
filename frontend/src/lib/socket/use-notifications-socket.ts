'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import { getAccessToken } from '@/lib/api/client';

export function useNotificationsSocket() {
  const principal = useAuthStore((s) => s.principal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!isAuthenticated || !token || !principal) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    // Remove /api/v1 suffix if present for the base socket connection
    const baseSocketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

    const socket = io(`${baseSocketUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Connected to notifications room
    });

    socket.on('announcement:new', (data: { title?: string; content?: string }) => {
      toast.info(data.title || 'New Announcement', {
        description: data.content,
      });
    });

    socket.on('attendance:alert', (data: { message?: string; studentName?: string }) => {
      toast.warning('Attendance Alert', {
        description: data.message || `Unexcused absence recorded for ${data.studentName}`,
      });
    });

    socket.on('finance:payment-received', (data: { invoiceNumber?: string; amount?: string }) => {
      toast.success('Payment Confirmed', {
        description: `Invoice ${data.invoiceNumber || ''} payment recorded: ${data.amount || ''}`,
      });
    });

    socket.on('notification:received', (data: { title?: string; message?: string }) => {
      toast(data.title || 'Notification', {
        description: data.message,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, principal]);

  return socketRef.current;
}
