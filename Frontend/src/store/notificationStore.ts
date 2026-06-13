import { create } from 'zustand';
import type { AppNotification } from '../types/notification';
import notificationRepository from '../repositories/NotificationRepository';
import { createNotificationService } from '../services/notification/NotificationService';

const notificationService = createNotificationService();

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  requestPermissions: () => Promise<boolean>;
  scheduleLocal: (payload: { title: string; body: string; data?: Record<string, unknown>; type?: string; emergencyId?: string }) => Promise<string | null>;
  clearError: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await notificationRepository.getAll();
      if (result.success && result.data) {
        const unread = result.data.filter((n) => !n.read).length;
        set({ notifications: result.data, unreadCount: unread, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationRepository.markAsRead(id);
      const notifications = get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount });
    } catch {
      // Silent fail
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationRepository.markAllAsRead();
      const notifications = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications, unreadCount: 0 });
    } catch {
      // Silent fail
    }
  },

  addNotification: (notification) => {
    const notifications = [notification, ...get().notifications];
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  requestPermissions: async () => {
    return notificationService.requestPermissions();
  },

  scheduleLocal: async (payload) => {
    try {
      const id = await notificationService.scheduleLocalNotification({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        type: (payload.type || 'info') as 'emergency' | 'help_response' | 'info' | 'system',
        emergencyId: payload.emergencyId,
      });
      return id;
    } catch {
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0, isLoading: false, error: null });
  },
}));
