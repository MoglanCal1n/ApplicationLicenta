import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { API_BASE_URL } from '../api';
import { useAuth } from './AuthContext';
import { Toast } from '../components/ui';
import type { ToastType } from '../components/ui';

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
};

// Custom event emitted when a real-time notification arrives.
// Pages can subscribe to this to refresh their data automatically.
export const NOTIFICATION_EVENT = 'ehealth:notification';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ── Standalone toast queue ──────────────────────────────────────────────────
// Multiple toasts can be shown simultaneously (stacked vertically).
type QueuedToast = { id: number; message: string; type: ToastType };
let _toastCounter = 0;

function ToastQueue({ toasts, onDismiss }: { toasts: QueuedToast[]; onDismiss: (id: number) => void }) {
  return (
    <>
      {toasts.map((t, index) => (
        <div
          key={t.id}
          style={{ position: 'fixed', top: `${88 + index * 72}px`, right: '24px', zIndex: 99999 }}
        >
          <Toast message={t.message} type={t.type} onClose={() => onDismiss(t.id)} portal={false} />
        </div>
      ))}
    </>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const userRef = useRef(user);
  const connectionAttemptRef = useRef(0);
  const processedIdsRef = useRef<Set<number>>(new Set());

  // Keep a live reference to user so the WebSocket callback always sees
  // the latest value without being listed as a dependency.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const pushToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 6s in case Toast auto-close doesn't fire (portal edge-case)
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications', { params: { page: 1, limit: 50 } }),
        api.get('/notifications/unread-count')
      ]);
      const items = listRes.data.items || [];
      setNotifications(items);
      setUnreadCount(countRes.data.count || 0);
      
      // Synchronously sync our processed notifications ID list
      processedIdsRef.current = new Set(items.map((n: any) => n.id));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [user]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      pushToast('All notifications marked as read.', 'success');
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  // Setup WebSocket connection — stable callback, no showToast dependency
  const connectWebSocket = useCallback(async () => {
    if (!userRef.current) return;

    const currentAttempt = ++connectionAttemptRef.current;

    // Clean up old socket if exists
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    let tokenParam = '';
    try {
      const res = await api.get('/auth/ws-token');
      // If a newer connection attempt has started while we paused, abort this one!
      if (currentAttempt !== connectionAttemptRef.current) {
        console.log('[WS] Connection attempt obsolete, aborting.');
        return;
      }
      if (res.data?.token) {
        tokenParam = `?token=${encodeURIComponent(res.data.token)}`;
      }
    } catch (err) {
      console.error('[WS] Failed to fetch WS token, attempting cookie fallback...', err);
      if (currentAttempt !== connectionAttemptRef.current) return;
    }

    // Build WebSocket URL from the API base
    let wsBaseUrl = '';
    if (API_BASE_URL.startsWith('http')) {
      wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsBaseUrl = `${wsProtocol}//${host}${API_BASE_URL}`;
    }

    const wsUrl = `${wsBaseUrl}/notifications/ws${tokenParam}`;
    console.log(`[WS] Connecting to ${wsUrl.split('?')[0]} (token: ${!!tokenParam})`);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WS] Connected successfully.');
      setIsConnected(true);

      // Send periodic pings to keep the connection alive (prevents proxy/Docker timeouts)
      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 30_000);
      // Store for cleanup
      (socket as any).__pingInterval = pingInterval;
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'notification') {
          const newNotif: NotificationItem = payload.data;

          // Synchronously filter out duplicates to guarantee exactly one Toast and list entry
          if (processedIdsRef.current.has(newNotif.id)) {
            console.log('[WS] Duplicate notification filtered synchronously:', newNotif.id);
            return;
          }
          processedIdsRef.current.add(newNotif.id);

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
          pushToast(`${newNotif.title}: ${newNotif.message}`, 'info');

          // Emit a custom DOM event so dashboards refresh
          window.dispatchEvent(
            new CustomEvent(NOTIFICATION_EVENT, { detail: newNotif })
          );
        }
      } catch (err) {
        console.error('[WS] Error handling message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`[WS] Closed: code=${event.code}, reason=${event.reason}`);
      setIsConnected(false);

      // Clean up ping interval
      if ((socket as any).__pingInterval) {
        clearInterval((socket as any).__pingInterval);
      }

      // Auto reconnect after 5 seconds if still logged in
      // Auto reconnect after 5 seconds if still logged in AND not closed intentionally (1000)
      if (userRef.current && event.code !== 4001 && event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS] Attempting reconnect...');
          connectWebSocket();
        }, 5000);
      }
    };

    socket.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToast]);

  // Connect/disconnect based on user login state
  useEffect(() => {
    if (user) {
      fetchNotifications();
      connectWebSocket();
    } else {
      // Cleanup on logout
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      processedIdsRef.current.clear();
      if (socketRef.current) {
        socketRef.current.close(1000, 'Logout');
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    }

    return () => {
      connectionAttemptRef.current++; // Invalidate any pending connection attempts in flight
      if (socketRef.current) {
        socketRef.current.close(1000, 'Cleanup');
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, fetchNotifications, connectWebSocket]);

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      processedIdsRef.current.delete(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.is_read) {
          setUnreadCount((c) => Math.max(c - 1, 0));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
      processedIdsRef.current.clear();
      pushToast('All notifications cleared.', 'success');
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <ToastQueue toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
