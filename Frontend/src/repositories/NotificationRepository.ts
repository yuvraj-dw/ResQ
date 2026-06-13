import type { ApiResponse } from '../types/common';
import type { AppNotification, NotificationType } from '../types/notification';
import apiClient from '../services/api/ApiClient';

interface AppNotificationResponse {
  _id: string;
  user_phone: string;
  notification_type: string;
  title: string;
  message: string;
  request_id?: string | null;
  data?: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

function toAppNotification(n: AppNotificationResponse): AppNotification {
  const typeMap: Record<string, NotificationType> = {
    new_request: 'emergency',
    volunteer_found: 'help_response',
    request_matched: 'info',
    request_assigned: 'info',
    request_cancelled: 'system',
    search_expanded: 'info',
  };
  return {
    id: n._id,
    type: typeMap[n.notification_type] || 'info',
    title: n.title,
    body: n.message,
    read: n.read || false,
    createdAt: n.created_at,
    emergencyId: n.request_id || undefined,
  };
}

export interface INotificationRepository {
  getAll(): Promise<ApiResponse<AppNotification[]>>;
  markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>>;
  markAllAsRead(): Promise<ApiResponse<{ marked_read: number }>>;
  getUnreadCount(): Promise<ApiResponse<{ unread_count: number }>>;
}

export class NotificationRepository implements INotificationRepository {
  async getAll(): Promise<ApiResponse<AppNotification[]>> {
    const result = await apiClient.get<AppNotificationResponse[]>('/notifications/');
    if (result.success && result.data) {
      return { success: true, data: result.data.map(toAppNotification) };
    }
    return result as unknown as ApiResponse<AppNotification[]>;
  }

  async markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<ApiResponse<{ marked_read: number }>> {
    return apiClient.post<{ marked_read: number }>('/notifications/mark-all-read');
  }

  async getUnreadCount(): Promise<ApiResponse<{ unread_count: number }>> {
    return apiClient.get<{ unread_count: number }>('/notifications/unread-count');
  }
}

export default new NotificationRepository();
