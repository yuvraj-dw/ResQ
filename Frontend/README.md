# ResQ

A production-ready React Native mobile application for community-based emergency assistance. Users can request help during emergencies and nearby users can respond, with support for both online and offline operation.

## Features

- **User Registration** - Register with full name, mobile, blood group, address, and pincode
- **OTP Verification** - Mock OTP verification flow (ready for real SMS gateway)
- **Emergency Requests** - Create emergency requests with GPS location capture
- **Emergency Alerts** - View and respond to nearby emergencies
- **Push Notifications** - Notification architecture ready for FCM integration
- **Offline Mode** - Send emergency requests via SMS when offline
- **Map Integration** - View emergencies and user locations on map
- **Profile Management** - Edit and store profile locally
- **Dashboard** - Centralized view of all features
- **Dark Mode** - Theme support with dark mode colors defined

## Tech Stack

- React Native with TypeScript
- Expo SDK 51
- React Navigation (Native Stack + Bottom Tabs)
- Zustand for state management
- TanStack React Query
- React Native Maps
- Expo Location
- Expo Notifications
- AsyncStorage for offline storage
- @react-native-community/netinfo for connectivity

## Project Structure

```
src/
├── app/                  # App entry point
├── navigation/           # Navigation setup
├── services/             # Service layer
│   ├── api/              # API client (real + mock)
│   ├── communication/    # Communication abstraction (API/SMS)
│   ├── connectivity/     # Network connectivity
│   ├── location/         # Location services
│   ├── notification/     # Push notification services
│   ├── storage/          # AsyncStorage wrapper
│   └── sync/             # Offline sync manager
├── repositories/         # Repository pattern layer
├── features/             # Feature-based modules
│   ├── auth/             # Authentication (screens + hooks)
│   ├── emergency/        # Emergency management
│   ├── notifications/    # Notifications screen
│   ├── maps/             # Map screen
│   └── profile/          # Profile management
├── components/           # Reusable UI components
├── hooks/                # Shared custom hooks
├── store/                # Zustand stores
├── utils/                # Utilities
├── types/                # TypeScript types
└── config/               # App configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Expo CLI
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

```bash
# Install dependencies
cd ResQ
npm install

# Start the Expo development server
npx expo start
```

### Environment Variables

Copy `.env` to configure the app:

```env
EXPO_PUBLIC_API_URL=https://api.resq.app/v1
EXPO_PUBLIC_SMS_GATEWAY_ENABLED=false
EXPO_PUBLIC_SMS_GATEWAY_NUMBER=+1234567890
EXPO_PUBLIC_MAP_PROVIDER=default
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_ENABLE_MOCK_API=true
EXPO_PUBLIC_USE_FCM=false
```

## Architecture

### Repository Pattern

All API calls are abstracted through repository interfaces. Each repository has a mock implementation that returns realistic fake data. When real backend APIs become available, switch from mock to real by toggling `EXPO_PUBLIC_ENABLE_MOCK_API=false`.

**Example: AuthRepository**

```typescript
// src/repositories/AuthRepository.ts
export class AuthRepository implements IAuthRepository {
  async register(data: RegisterRequest): Promise<ApiResponse<...>> {
    if (this.useMock) return mockApiClient.register(data);
    return apiClient.post('/auth/register', data, false);
  }
}
```

### Communication Service Abstraction

```
CommunicationService (interface)
├── ApiCommunicationService  (online mode)
└── SmsCommunicationService  (offline mode)
```

### Offline-First Architecture

1. **Connectivity Detection** - `ConnectivityService` monitors network state
2. **Offline Queue** - `SyncManager` stores pending requests in AsyncStorage
3. **Auto-Sync** - When connectivity returns, queued requests are processed automatically
4. **SMS Fallback** - When offline, emergency data is formatted as SMS and sent via device SMS composer

### Service Interfaces

All services are defined as interfaces/abstract classes:

- `ILocationService` - MockLocationService / ExpoLocationService
- `INotificationService` - MockNotificationService / FcmNotificationService
- `ICommunicationService` - ApiCommunicationService / SmsCommunicationService
- `IStorageService` - AsyncStorage-based implementation
- `IConnectivityService` - NetInfo-based implementation

## Connecting a Real Backend API

### Step 1: Set environment variables

```env
EXPO_PUBLIC_ENABLE_MOCK_API=false
EXPO_PUBLIC_API_URL=https://your-production-api.com/v1
```

### Step 2: Implement the API endpoints

The real `ApiClient` expects the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/verify-otp` | OTP verification |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh token |
| GET | `/profile` | Get user profile |
| PATCH | `/profile` | Update profile |
| POST | `/emergency` | Create emergency |
| GET | `/emergency` | List active emergencies |
| GET | `/emergency/:id` | Get emergency details |
| POST | `/emergency/respond` | Respond to emergency |
| POST | `/emergency/:id/cancel` | Cancel emergency |
| GET | `/emergency/my` | Get user's emergencies |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark notification read |
| PATCH | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/:id` | Delete notification |

### Step 3: API Response Format

All API endpoints should return:

```json
{
  "success": true,
  "data": { ... },
  "error": "optional error message"
}
```

### Step 4: Replace mock implementations

For each repository, the logic to switch from mock to real is already built in. Simply set `EXPO_PUBLIC_ENABLE_MOCK_API=false`.

## Offline Mode Details

When the device has no internet:

1. **Emergency Creation** - The emergency payload is queued in AsyncStorage as a `PendingRequest`
2. **User Notification** - A message informs the user the request is saved offline
3. **SMS Composer** - The device SMS app opens with pre-formatted emergency text
4. **Auto-Sync** - `SyncManager` periodically checks connectivity and sends queued requests
5. **Retry Logic** - Failed requests retry up to `maxRetryCount` times (configurable)

### SMS Payload Format

**Registration:**
```
/register
Name: John
Blood: O+
Address: ABC
Pincode: 462001
```

**Emergency:**
```
/emergency
Type: Medical
Description: Need ambulance urgently
Lat: 23.25
Lng: 77.41
```

**Help Response:**
```
/help
EmergencyId: 12345
```

## Push Notifications

Currently uses `MockNotificationService`. To connect Firebase Cloud Messaging:

1. Set `EXPO_PUBLIC_USE_FCM=true`
2. Configure FCM credentials in `app.json`
3. The `FcmNotificationService` will handle real push notifications

## Screens

1. **Splash** - App loading screen with logo
2. **Onboarding** - 4-step intro to app features
3. **Registration** - User registration form
4. **OTP Verification** - 6-digit OTP input
5. **Dashboard** - Home screen with quick actions and active emergencies
6. **Emergency List** - All active emergencies near user
7. **Emergency Detail** - Full emergency details with map and actions
8. **Emergency Form** - Create new emergency request
9. **My Emergencies** - User's past emergency requests
10. **Notifications** - Push notification history
11. **Map** - Emergency locations on interactive map
12. **Profile** - User profile display
13. **Edit Profile** - Edit user profile fields

## Future Enhancements

- Firebase Cloud Messaging integration
- Google Directions API for route visualization
- Real SMS gateway integration
- Voice/video calls within the app
- Emergency chat system
- Multi-language support
- Admin dashboard
- Analytics integration
- CI/CD pipeline with EAS Build
