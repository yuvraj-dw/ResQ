import { create } from 'zustand';
import type { AuthState, AppRegisterRequest, AppRegisterVerifyRequest, UserResponse } from '../types/auth';
import authRepository from '../repositories/AuthRepository';
import profileRepository from '../repositories/ProfileRepository';
import smsRepository from '../repositories/SmsRepository';
import connectivityService from '../services/connectivity/ConnectivityService';
import storageService from '../services/storage/StorageService';
import apiClient from '../services/api/ApiClient';

interface AuthStore extends AuthState {
  setRegistrationData: (data: AppRegisterRequest) => void;
  registerApp: (data: AppRegisterRequest) => Promise<{ success: boolean; error?: string; info?: string }>;
  verifyAppRegistration: (data: AppRegisterVerifyRequest) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserResponse) => void;
  checkAuth: () => Promise<void>;
  reset: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  tokens: null,
  user: null,
  registrationData: null,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setRegistrationData: (data) => {
    set({ registrationData: data });
  },

  registerApp: async (data) => {
    set({ isLoading: true });
    try {
      const isOnline = await connectivityService.isOnline();

      if (isOnline) {
        const result = await authRepository.registerApp(data);
        if (result.success) {
          set({
            registrationData: data,
            isLoading: false,
          });
          return { success: true };
        }
        set({ isLoading: false });
        return { success: false, error: result.error || 'Registration failed' };
      }

      const smsSent = await smsRepository.sendRegistration(data);
      if (smsSent) {
        set({
          registrationData: data,
          isLoading: false,
        });
        return { success: true, info: 'Registration sent via SMS. Check your messages for confirmation.' };
      }
      set({ isLoading: false });
      return { success: false, error: 'Failed to send registration via SMS. Please try again.' };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  },

  verifyAppRegistration: async (data) => {
    set({ isLoading: true });
    try {
      const result = await authRepository.verifyAppRegistration(data);
      if (result.success && result.data) {
        const { access_token, token_type, user } = result.data;
        await profileRepository.saveLocalProfile(user);
        set({
          isAuthenticated: true,
          isLoading: false,
          tokens: { access_token, token_type },
          user,
        });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, error: result.error || 'Verification failed' };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  },

  sendOtp: async (phone) => {
    set({ isLoading: true });
    try {
      const result = await authRepository.sendOtp({ phone });
      if (result.success) {
        set({ isLoading: false });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, error: result.error || 'Failed to send OTP' };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      };
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const result = await authRepository.verifyOtp({ phone, otp });
      if (result.success && result.data) {
        const { access_token, token_type, user } = result.data;
        await profileRepository.saveLocalProfile(user);
        set({
          isAuthenticated: true,
          isLoading: false,
          tokens: { access_token, token_type },
          user,
        });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, error: result.error || 'OTP verification failed' };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP verification failed',
      };
    }
  },

  loadProfile: async () => {
    try {
      const localProfile = await profileRepository.getLocalProfile();
      if (localProfile) {
        set({ user: localProfile });
      }
      const result = await profileRepository.getProfile();
      if (result.success && result.data) {
        set({ user: result.data });
      }
    } catch {
      const localProfile = await profileRepository.getLocalProfile();
      if (localProfile) {
        set({ user: localProfile });
      }
    }
  },

  logout: async () => {
    await authRepository.logout();
    await storageService.clearAll();
    set(initialState);
  },

  setUser: (user) => {
    set({ user });
  },

  checkAuth: async () => {
    await apiClient.loadTokens();
    const tokens = apiClient.getAccessToken();
    if (tokens) {
      const localProfile = await profileRepository.getLocalProfile();
      set({
        isAuthenticated: true,
        user: localProfile,
        tokens: { access_token: tokens, token_type: 'bearer' },
      });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
