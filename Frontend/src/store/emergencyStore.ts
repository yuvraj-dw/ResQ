import { create } from 'zustand';
import type {
  EmergencyRequest,
  CreateEmergencyPayload,
  EmergencyCardData,
  EmergencyStatus,
} from '../types/emergency';
import type { SyncStatus } from '../types/common';
import emergencyRepository from '../repositories/EmergencyRepository';
import smsRepository from '../repositories/SmsRepository';
import storageService from '../services/storage/StorageService';
import syncManager from '../services/sync/SyncManager';
import connectivityService from '../services/connectivity/ConnectivityService';

interface EmergencyStore {
  emergencies: EmergencyCardData[];
  myEmergencies: EmergencyRequest[];
  currentEmergency: EmergencyRequest | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  syncStatus: SyncStatus;

  fetchEmergencies: () => Promise<void>;
  fetchMyEmergencies: () => Promise<void>;
  fetchEmergencyById: (id: string) => Promise<void>;
  createEmergency: (data: CreateEmergencyPayload) => Promise<{ success: boolean; error?: string; info?: string }>;
  acceptEmergency: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateEmergencyStatus: (id: string, status: string) => Promise<{ success: boolean; error?: string }>;
  cancelEmergency: (id: string) => Promise<void>;
  handleNewRequest: (request: EmergencyRequest) => void;
  handleRequestUpdate: (requestId: string, status: EmergencyStatus) => void;
  clearCurrentEmergency: () => void;
  clearError: () => void;
  getSyncStatus: () => Promise<void>;
  reset: () => void;
}

const initialSyncStatus: SyncStatus = {
  pending: 0,
  synced: 0,
  failed: 0,
  lastSync: null,
};

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

export const useEmergencyStore = create<EmergencyStore>((set, get) => ({
  emergencies: [],
  myEmergencies: [],
  currentEmergency: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  syncStatus: initialSyncStatus,

  fetchEmergencies: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await emergencyRepository.getAll();
      if (result.success && result.data) {
        set({ emergencies: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to fetch emergencies', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch emergencies',
        isLoading: false,
      });
    }
  },

  fetchMyEmergencies: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await emergencyRepository.getMyEmergencies();
      if (result.success && result.data) {
        set({ myEmergencies: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to fetch your emergencies', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch your emergencies',
        isLoading: false,
      });
    }
  },

  fetchEmergencyById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await emergencyRepository.getById(id);
      if (result.success && result.data) {
        set({ currentEmergency: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Emergency not found', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch emergency',
        isLoading: false,
      });
    }
  },

  createEmergency: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const isOnline = await connectivityService.isOnline();

      if (isOnline) {
        const result = await emergencyRepository.create(data);
        if (result.success && result.data) {
          await storageService.addEmergency(result.data);
          set({ isSubmitting: false });
          const card = toCardData(result.data);
          set((s) => ({ emergencies: [card, ...s.emergencies] }));
          return { success: true };
        }
        set({ isSubmitting: false });
        return { success: false, error: result.error || 'Failed to create emergency' };
      } else {
        const smsSent = await smsRepository.sendEmergency(data);
        if (smsSent) {
          await storageService.addEmergency({
            _id: `emergency_${Date.now()}`,
            requester_id: null,
            requester_phone: '',
            source: 'sms',
            resource: data.resource,
            blood_group: data.blood_group || null,
            urgency: data.urgency,
            location_name: data.location_name,
            location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
            raw_message: null,
            status: 'open',
            assigned_volunteer: null,
            current_radius_km: 5.0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          set({ isSubmitting: false });
          return { success: true, info: 'Emergency request sent via SMS.' };
        }
        set({ isSubmitting: false });
        return { success: false, error: 'Failed to send emergency via SMS.' };
      }
    } catch (error) {
      set({ isSubmitting: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create emergency',
      };
    }
  },

  acceptEmergency: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await emergencyRepository.accept(id);
      if (result.success && result.data) {
        set({ isSubmitting: false });
        return { success: true };
      }
      set({ isSubmitting: false });
      return { success: false, error: result.error || 'Failed to accept emergency' };
    } catch (error) {
      set({ isSubmitting: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept emergency',
      };
    }
  },

  updateEmergencyStatus: async (id, status) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await emergencyRepository.updateStatus(id, status);
      if (result.success) {
        set({ isSubmitting: false });
        return { success: true };
      }
      set({ isSubmitting: false });
      return { success: false, error: result.error || 'Failed to update status' };
    } catch (error) {
      set({ isSubmitting: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      };
    }
  },

  cancelEmergency: async (id) => {
    try {
      await emergencyRepository.updateStatus(id, 'cancelled');
      const emergencies = get().emergencies.filter((e) => e._id !== id);
      set({ emergencies });
    } catch {
      set({ error: 'Failed to cancel emergency' });
    }
  },

  handleNewRequest: (request) => {
    const card = toCardData(request);
    set((s) => ({ emergencies: [card, ...s.emergencies] }));
  },

  handleRequestUpdate: (requestId, status) => {
    set((s) => ({
      emergencies: s.emergencies.map((e) =>
        e._id === requestId ? { ...e, status } : e,
      ),
      currentEmergency:
        s.currentEmergency?._id === requestId
          ? { ...s.currentEmergency, status }
          : s.currentEmergency,
    }));
  },

  clearCurrentEmergency: () => {
    set({ currentEmergency: null });
  },

  clearError: () => {
    set({ error: null });
  },

  getSyncStatus: async () => {
    const status = await syncManager.getSyncStatus();
    set({
      syncStatus: {
        pending: status.pending,
        synced: 0,
        failed: 0,
        lastSync: status.lastSync,
      },
    });
  },

  reset: () => {
    set({
      emergencies: [],
      myEmergencies: [],
      currentEmergency: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
    });
  },
}));
