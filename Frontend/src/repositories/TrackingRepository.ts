import type { ApiResponse, LocationUpdate } from '../types/common';
import apiClient from '../services/api/ApiClient';

interface LocationUpdateResponse {
  phone: string;
  location: { type: string; coordinates: [number, number] };
  location_name: string;
}

interface DistanceResponse {
  request_id: string;
  volunteer_phone: string;
  distance_km: number;
  volunteer_location?: { type: string; coordinates: [number, number] } | null;
}

export interface ITrackingRepository {
  updateLocation(data: LocationUpdate): Promise<ApiResponse<LocationUpdateResponse>>;
  getDistance(requestId: string): Promise<ApiResponse<DistanceResponse>>;
}

export class TrackingRepository implements ITrackingRepository {
  async updateLocation(data: LocationUpdate): Promise<ApiResponse<LocationUpdateResponse>> {
    return apiClient.post<LocationUpdateResponse>('/tracking/location', data);
  }

  async getDistance(requestId: string): Promise<ApiResponse<DistanceResponse>> {
    return apiClient.get<DistanceResponse>(`/tracking/${requestId}/distance`);
  }
}

export default new TrackingRepository();
