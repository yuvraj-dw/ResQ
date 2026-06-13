const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.resq.app',
  smsGatewayEnabled: process.env.EXPO_PUBLIC_SMS_GATEWAY_ENABLED === 'true',
  smsGatewayNumber: process.env.EXPO_PUBLIC_SMS_GATEWAY_NUMBER || '+1234567890',
  mapProvider: process.env.EXPO_PUBLIC_MAP_PROVIDER || 'default',
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  enableMockApi: process.env.EXPO_PUBLIC_ENABLE_MOCK_API !== 'false',
  appName: 'ResQ',
  appVersion: '1.0.0',
  maxRetryCount: 3,
  syncIntervalMs: 30000,
  emergencyTimeoutMs: 300000,
  otpLength: 6,
  otpExpiryMs: 300000,
};

export default env;
