import type { ApiResponse } from '../../types/common';
import type {
  AppRegisterRequest,
  AppRegisterVerifyRequest,
  UserResponse,
} from '../../types/auth';
import type {
  EmergencyRequest,
  CreateEmergencyPayload,
  EmergencyCardData,
} from '../../types/emergency';
import type { AppNotification } from '../../types/notification';
import type { UpdateProfileRequest } from '../../types/profile';
import { generateId } from '../../utils/formatters';

const MOCK_DELAY = 800;
const MOCK_USER_ID = 'user_mock_001';

const mockProfile: UserResponse = {
  _id: MOCK_USER_ID,
  name: 'John Doe',
  phone: '+919876543210',
  resources: ['blood', 'transport'],
  blood_group: 'O+',
  location: { type: 'Point', coordinates: [77.4126, 23.2599] },
  location_name: 'Bhopal',
  is_volunteer: false,
  registration_source: 'app',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEmergencies: EmergencyRequest[] = [
  {
    _id: 'emergency_001',
    requester_id: 'user_mock_002',
    requester_phone: '+919876543211',
    source: 'app',
    resource: 'blood',
    blood_group: 'B-',
    urgency: 'critical',
    location_name: 'AIIMS Bhopal',
    location: { type: 'Point', coordinates: [77.4126, 23.2599] },
    raw_message: null,
    status: 'open',
    assigned_volunteer: null,
    current_radius_km: 5.0,
    created_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    _id: 'emergency_002',
    requester_id: 'user_mock_003',
    requester_phone: '+919876543212',
    source: 'app',
    resource: 'transport',
    blood_group: null,
    urgency: 'high',
    location_name: 'Hoshangabad Road',
    location: { type: 'Point', coordinates: [77.4308, 23.2378] },
    raw_message: null,
    status: 'open',
    assigned_volunteer: null,
    current_radius_km: 5.0,
    created_at: new Date(Date.now() - 1200000).toISOString(),
    updated_at: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    _id: 'emergency_003',
    requester_id: 'user_mock_004',
    requester_phone: '+919876543213',
    source: 'sms',
    resource: 'medicines',
    blood_group: null,
    urgency: 'medium',
    location_name: 'Old City',
    location: { type: 'Point', coordinates: [77.3975, 23.2217] },
    raw_message: 'Need medicines urgently',
    status: 'open',
    assigned_volunteer: null,
    current_radius_km: 5.0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const mockNotifications: AppNotification[] = [
  {
    id: 'notif_001',
    type: 'emergency',
    title: 'Emergency Near You',
    body: 'Blood requirement reported 2.3 km away',
    read: false,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    emergencyId: 'emergency_001',
  },
  {
    id: 'notif_002',
    type: 'help_response',
    title: 'Help is Coming',
    body: 'A responder has accepted your emergency request',
    read: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    emergencyId: 'emergency_002',
  },
];

function delay(ms = MOCK_DELAY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApiClient {
  private userState: UserResponse = { ...mockProfile };
  private emergencyState: EmergencyRequest[] = [...mockEmergencies];
  private notificationState: AppNotification[] = [...mockNotifications];
  private registeredUsers: Map<string, string> = new Map();

  async registerApp(data: AppRegisterRequest): Promise<ApiResponse<{ message: string; phone: string; requires_verification: boolean }>> {
    await delay(500);
    this.userState = {
      ...this.userState,
      name: data.name,
      phone: data.phone,
      blood_group: data.blood_group,
      resources: data.resources,
      location_name: data.location_name,
    };
    this.registeredUsers.set(data.phone, generateId());
    return {
      success: true,
      data: { message: 'OTP sent to your phone', phone: data.phone, requires_verification: true },
    };
  }

  async verifyAppRegistration(data: AppRegisterVerifyRequest): Promise<ApiResponse<{
    access_token: string;
    token_type: string;
    user: UserResponse;
  }>> {
    await delay();
    if (!data.otp || data.otp.length < 4) {
      return { success: false, error: 'Invalid OTP' };
    }
    if (data.name) this.userState.name = data.name;
    if (data.blood_group) this.userState.blood_group = data.blood_group;
    if (data.resources) this.userState.resources = data.resources;
    if (data.location_name) this.userState.location_name = data.location_name;
    return {
      success: true,
      data: {
        access_token: `mock_access_${generateId()}`,
        token_type: 'bearer',
        user: { ...this.userState },
      },
    };
  }

  async getProfile(): Promise<ApiResponse<UserResponse>> {
    await delay();
    return { success: true, data: { ...this.userState } };
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserResponse>> {
    await delay();
    this.userState = {
      ...this.userState,
      ...data,
      updated_at: new Date().toISOString(),
    } as UserResponse;
    return { success: true, data: { ...this.userState } };
  }

  async createEmergency(payload: CreateEmergencyPayload): Promise<ApiResponse<EmergencyRequest>> {
    await delay();
    const emergency: EmergencyRequest = {
      _id: `emergency_${generateId()}`,
      requester_id: MOCK_USER_ID,
      requester_phone: this.userState.phone,
      source: 'app',
      resource: payload.resource,
      blood_group: payload.blood_group || null,
      urgency: payload.urgency,
      location_name: payload.location_name,
      location: { type: 'Point', coordinates: [payload.longitude, payload.latitude] },
      raw_message: null,
      status: 'open',
      assigned_volunteer: null,
      current_radius_km: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.emergencyState.unshift(emergency);
    return { success: true, data: emergency };
  }

  async getEmergencies(): Promise<ApiResponse<EmergencyCardData[]>> {
    await delay();
    const cards: EmergencyCardData[] = this.emergencyState
      .filter((e) => e.status === 'open' || e.status === 'matched')
      .map((e) => ({
        _id: e._id,
        requester_phone: e.requester_phone,
        resource: e.resource,
        blood_group: e.blood_group,
        urgency: e.urgency,
        location_name: e.location_name,
        status: e.status,
        distance_km: Math.random() * 10 + 0.5,
        time_ago: `${Math.floor(Math.random() * 60) + 1}m ago`,
        current_radius_km: e.current_radius_km,
        created_at: e.created_at,
        latitude: e.location?.coordinates[1],
        longitude: e.location?.coordinates[0],
      }));
    return { success: true, data: cards };
  }

  async getEmergencyById(id: string): Promise<ApiResponse<EmergencyRequest>> {
    await delay();
    const emergency = this.emergencyState.find((e) => e._id === id);
    if (!emergency) {
      return { success: false, error: 'Emergency not found' };
    }
    return { success: true, data: { ...emergency } };
  }

  async acceptEmergency(id: string): Promise<ApiResponse<EmergencyRequest>> {
    await delay();
    const emergency = this.emergencyState.find((e) => e._id === id);
    if (!emergency) {
      return { success: false, error: 'Emergency not found' };
    }
    emergency.status = 'assigned';
    emergency.assigned_volunteer = MOCK_USER_ID;
    return { success: true, data: { ...emergency } };
  }

  async getNotifications(): Promise<ApiResponse<AppNotification[]>> {
    await delay();
    return { success: true, data: [...this.notificationState] };
  }

  async markNotificationRead(id: string): Promise<ApiResponse<{ success: boolean }>> {
    await delay(300);
    const notif = this.notificationState.find((n) => n.id === id);
    if (notif) notif.read = true;
    return { success: true, data: { success: true } };
  }

  async cancelEmergency(id: string): Promise<ApiResponse<{ success: boolean }>> {
    await delay();
    const emergency = this.emergencyState.find((e) => e._id === id);
    if (emergency) emergency.status = 'cancelled';
    return { success: true, data: { success: true } };
  }

  async getMyEmergencies(): Promise<ApiResponse<EmergencyRequest[]>> {
    await delay();
    const myEmergencies = this.emergencyState.filter(
      (e) => e.requester_id === MOCK_USER_ID,
    );
    return { success: true, data: myEmergencies };
  }
}

const mockApiClient = new MockApiClient();
export default mockApiClient;
