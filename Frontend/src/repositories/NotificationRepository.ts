import type { ApiResponse } from '../types/common';
import type { AppNotification, NotificationType } from '../types/notification';
import apiClient from '../services/api/ApiClient';

interface ServerNotification {
  _id: string;
  request_id: string;
  volunteer_id?: string;
  volunteer_phone: string;
  status: string;
  radius_km: number;
  read?: boolean;
  created_at: string;
}

function toAppNotification(n: ServerNotification): AppNotification {
  const typeMap: Record<string, NotificationType> = {
    accepted: 'help_response',
    sent: 'info',
    delivered: 'info',
    expired: 'system',
  };
  const titleMap: Record<string, string> = {
    accepted: 'Request Accepted',
    sent: 'New Emergency Nearby',
    delivered: 'Notification Delivered',
    expired: 'Request Expired',
  };
  return {
    id: n._id,
    type: typeMap[n.status] || 'info',
    title: titleMap[n.status] || 'Notification',
    body: `Emergency request ${n.status} — ${n.volunteer_phone}`,
    read: n.read || false,
    createdAt: n.created_at,
    emergencyId: n.request_id,
  };
}

export interface INotificationRepository {
  getAll(): Promise<ApiResponse<AppNotification[]>>;
  markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>>;
}

export class NotificationRepository implements INotificationRepository {
  async getAll(): Promise<ApiResponse<AppNotification[]>> {
    const result = await apiClient.get<ServerNotification[]>('/notifications/');
    if (result.success && result.data) {
      return { success: true, data: result.data.map(toAppNotification) };
    }
    return result as unknown as ApiResponse<AppNotification[]>;
  }

  async markAsRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.patch<{ success: boolean }>(`/notifications/${id}`);
  }
}

export default new NotificationRepository();
