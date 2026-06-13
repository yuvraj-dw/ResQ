import type { ApiResponse, ApiErrorResponse } from '../../types/common';
import { STORAGE_KEYS } from '../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

const API_PREFIX = '/api/v1';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private logEnabled = true;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setLogging(enabled: boolean) {
    this.logEnabled = enabled;
  }

  private logRequest(method: string, url: string, body?: unknown) {
    if (!this.logEnabled) return;
    console.log(`\n🌐 [API] --> ${method} ${url}`);
    if (body) {
      console.log(`📦 [API] --> Body:`, JSON.stringify(body, null, 2));
    }
  }

  private logResponse(method: string, url: string, status: number | string, data?: unknown) {
    if (!this.logEnabled) return;
    console.log(`📡 [API] <-- ${method} ${url} [${status}]`);
    if (data) {
      console.log(`📦 [API] <-- Response:`, JSON.stringify(data, null, 2));
    }
  }

  async setTokens(tokens: { access_token: string }): Promise<void> {
    this.accessToken = tokens.access_token;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
  }

  async loadTokens(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.accessToken = parsed.access_token || parsed.accessToken || null;
      }
    } catch {
      this.accessToken = null;
    }
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
  }

  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { method, endpoint, body, headers = {}, requiresAuth = false } = config;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requiresAuth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    const url = `${this.baseUrl}${API_PREFIX}${endpoint}`;
    try {
      this.logRequest(method, url, body);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let data: T;
      try {
        data = JSON.parse(text);
      } catch {
        this.logResponse(method, url, response.status, `Invalid JSON: ${text.slice(0, 100)}`);
        return { success: false, error: `Invalid JSON response: ${text.slice(0, 100)}` };
      }

      if (!response.ok) {
        const err = data as unknown as ApiErrorResponse;
        this.logResponse(method, url, response.status, data);
        return {
          success: false,
          error: err.detail || (data as Record<string, unknown>)?.message as string || `HTTP ${response.status}`,
        };
      }

      this.logResponse(method, url, response.status, data);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      this.logResponse(method, url, 'ERROR', message);
      return { success: false, error: message };
    }
  }

  get<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', endpoint, requiresAuth });
  }

  post<T>(endpoint: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', endpoint, body, requiresAuth });
  }

  put<T>(endpoint: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', endpoint, body, requiresAuth });
  }

  patch<T>(endpoint: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', endpoint, body, requiresAuth });
  }

  delete<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', endpoint, requiresAuth });
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

const apiClient = new ApiClient(
  process.env.EXPO_PUBLIC_API_URL || 'https://api.resq.app',
);

export { ApiClient };
export default apiClient;
