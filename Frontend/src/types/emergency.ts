export type EmergencyResource = 'blood' | 'transport' | 'medicines' | 'food' | 'shelter';
export type EmergencyUrgency = 'critical' | 'high' | 'medium' | 'low';
export type EmergencySource = 'app' | 'sms';
export type EmergencyStatus = 'open' | 'matched' | 'assigned' | 'completed' | 'cancelled';

export interface EmergencyRequest {
  _id: string;
  requester_id: string | null;
  requester_phone: string;
  source: EmergencySource;
  resource: EmergencyResource;
  blood_group: string | null;
  urgency: EmergencyUrgency;
  location_name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  raw_message: string | null;
  status: EmergencyStatus;
  assigned_volunteer: string | null;
  current_radius_km: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyPayload {
  resource: EmergencyResource;
  blood_group?: string;
  urgency: EmergencyUrgency;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface EmergencyCardData {
  _id: string;
  requester_phone: string;
  resource: EmergencyResource;
  blood_group: string | null;
  urgency: EmergencyUrgency;
  location_name: string;
  status: EmergencyStatus;
  distance_km: number;
  time_ago: string;
  current_radius_km: number;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

export interface EmergencyFormData {
  resource: EmergencyResource;
  blood_group: string;
  urgency: EmergencyUrgency;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface EmergencyLocation {
  emergency_id: string;
  resource: EmergencyResource;
  location_name: string;
  coordinates: [number, number];
}
