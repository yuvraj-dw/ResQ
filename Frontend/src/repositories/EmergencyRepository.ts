import type { ApiResponse } from '../types/common';
import type {
  EmergencyRequest,
  CreateEmergencyPayload,
  EmergencyCardData,
  EmergencyUrgency,
} from '../types/emergency';
import apiClient from '../services/api/ApiClient';

interface RequestListResponse {
  requests: EmergencyRequest[];
  total: number;
}

function toCardData(r: EmergencyRequest): EmergencyCardData {
  const now = Date.now();
  const created = new Date(r.created_at).getTime();
  const diffMin = Math.floor((now - created) / 60000);
  const timeAgo = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin / 60)}h ago`;

  return {
    _id: r._id,
    requester_phone: r.requester_phone,
    resource: r.resource,
    blood_group: r.blood_group,
    urgency: r.urgency,
    location_name: r.location_name,
    status: r.status,
    distance_km: 0,
    time_ago: timeAgo,
    current_radius_km: r.current_radius_km,
    created_at: r.created_at,
    latitude: r.location?.coordinates?.[1],
    longitude: r.location?.coordinates?.[0],
  };
}

export interface IEmergencyRepository {
  create(data: CreateEmergencyPayload): Promise<ApiResponse<EmergencyRequest>>;
  getAll(): Promise<ApiResponse<EmergencyCardData[]>>;
  getById(id: string): Promise<ApiResponse<EmergencyRequest>>;
  accept(id: string): Promise<ApiResponse<EmergencyRequest>>;
  updateStatus(id: string, status: string): Promise<ApiResponse<EmergencyRequest>>;
  getMyEmergencies(): Promise<ApiResponse<EmergencyRequest[]>>;
}

export class EmergencyRepository implements IEmergencyRepository {
  async create(data: CreateEmergencyPayload): Promise<ApiResponse<EmergencyRequest>> {
    return apiClient.post<EmergencyRequest>('/requests/', data);
  }

  async getAll(): Promise<ApiResponse<EmergencyCardData[]>> {
    const result = await apiClient.get<RequestListResponse>('/requests/');
    if (result.success && result.data) {
      return { success: true, data: result.data.requests.map(toCardData) };
    }
    return result as unknown as ApiResponse<EmergencyCardData[]>;
  }

  async getById(id: string): Promise<ApiResponse<EmergencyRequest>> {
    return apiClient.get<EmergencyRequest>(`/requests/${id}`);
  }

  async accept(id: string): Promise<ApiResponse<EmergencyRequest>> {
    return apiClient.post<EmergencyRequest>(`/requests/${id}/accept`);
  }

  async updateStatus(id: string, status: string): Promise<ApiResponse<EmergencyRequest>> {
    return apiClient.patch<EmergencyRequest>(`/requests/${id}/status?status=${status}`);
  }

  async getMyEmergencies(): Promise<ApiResponse<EmergencyRequest[]>> {
    const result = await apiClient.get<RequestListResponse>('/requests/');
    if (result.success && result.data) {
      return { success: true, data: result.data.requests };
    }
    return result as unknown as ApiResponse<EmergencyRequest[]>;
  }
}

export default new EmergencyRepository();
