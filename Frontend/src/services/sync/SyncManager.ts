import storageService from '../storage/StorageService';
import connectivityService from '../connectivity/ConnectivityService';
import type { PendingRequest } from '../../types/common';
import type { ConnectionStatus } from '../../types/common';
import { env } from '../../config';
import { STORAGE_KEYS } from '../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ISyncManager {
  startAutoSync(): void;
  stopAutoSync(): void;
  syncNow(): Promise<SyncResult>;
  addPendingRequest(request: PendingRequest): Promise<void>;
  getSyncStatus(): Promise<SyncStatusInfo>;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

interface SyncStatusInfo {
  pending: number;
  lastSync: string | null;
  isSyncing: boolean;
}

class SyncManager implements ISyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private lastSync: string | null = null;

  startAutoSync(): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, env.syncIntervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncNow(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    if (this.isSyncing) return result;
    this.isSyncing = true;

    try {
      const isOnline = await connectivityService.isOnline();
      if (!isOnline) return result;

      const pendingRequests = await storageService.getPendingRequests();
      if (pendingRequests.length === 0) return result;

      for (const request of pendingRequests) {
        try {
          const success = await this.processRequest(request);
          if (success) {
            await storageService.removePendingRequest(request.id);
            result.synced++;
          } else {
            request.retryCount++;
            if (request.retryCount >= env.maxRetryCount) {
              await storageService.removePendingRequest(request.id);
              result.failed++;
              result.errors.push(`Max retries exceeded for ${request.id}`);
            }
          }
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Failed to sync ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.lastSync = new Date().toISOString();
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  async addPendingRequest(request: PendingRequest): Promise<void> {
    await storageService.addPendingRequest(request);
  }

  getSyncStatus(): Promise<SyncStatusInfo> {
    return (async () => {
      const pending = await storageService.getPendingRequests();
      return {
        pending: pending.length,
        lastSync: this.lastSync,
        isSyncing: this.isSyncing,
      };
    })();
  }

  onConnectivityChange(status: ConnectionStatus): void {
    if (status === 'online') {
      this.syncNow();
    }
  }

  private async processRequest(request: PendingRequest): Promise<boolean> {
    const endpoint = this.getEndpointForType(request.type);
    if (!endpoint) return false;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      if (stored) {
        const tokens = JSON.parse(stored);
        const token = tokens.access_token || tokens.accessToken;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.payload),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getEndpointForType(type: PendingRequest['type']): string | null {
    const baseUrl = env.apiUrl.replace(/\/+$/, '');
    switch (type) {
      case 'registration':
        return `${baseUrl}/api/v1/auth/register/app/verify`;
      case 'emergency':
        return `${baseUrl}/api/v1/requests/`;
      case 'sms':
        return `${baseUrl}/api/v1/sms/incoming`;
      case 'help_response':
        return `${baseUrl}/api/v1/requests/`;
      default:
        return null;
    }
  }
}

const syncManager = new SyncManager();
export default syncManager;
