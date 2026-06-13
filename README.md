# ResQ — Emergency Resource Platform

> Connecting people in crisis with nearby volunteers — even without a smartphone.

![Status](https://img.shields.io/badge/status-MVP-orange?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Hackathon](https://img.shields.io/badge/built%20at-Hackathon-blueviolet?style=flat-square)

---

## About

ResQ is an **emergency resource coordination platform** that connects people in urgent need — blood, medicine, food, shelter, transport — with registered volunteers nearby.

The platform works across **two entry points**:

- **Mobile App (React Native)** — for users with a smartphone and internet access.
- **Plain SMS** — for anyone with just a basic phone. No app, no internet, no registration required to request help.

When an SMS comes in, an on-device AI (Meta LLaMA 3.1 via DeepInfra) parses the free-text message, extracts the resource type, urgency, and location, and kicks off the same matching pipeline as the app. Volunteers within a 5 km radius are notified via SMS and an in-app push simultaneously.

**The core insight:** emergencies don't wait for someone to download an app.

---


## Features

- **Multi-resource support** — blood, transport, medicine, food, shelter
- **React Native app** — OTP login, request creation, live volunteer tracking
- **SMS-based requests** — no smartphone or internet needed to request help
- **AI-powered SMS parsing** — LLaMA 3.1 extracts structure from free-text messages
- **Geospatial volunteer matching** — MongoDB `$near` query with 2dsphere index
- **Auto-expanding search radius** — 5 km → 10 km → 15 km → 20 km if no match found
- **Real-time WebSocket push** — volunteers get instant alerts without polling
- **Dual-channel notifications** — both SMS and WebSocket push for maximum reach
- **Live distance tracking** — requester can see volunteer distance in real time
- **Phone-based OTP auth** — no passwords, JWT-secured sessions
- **SMS volunteer registration** — guided multi-step flow entirely over text messages
- **Rate limiting** — 60 requests/min per IP via middleware

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) (Python) | REST API, WebSocket, webhook handlers |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) + Motor (async) | Data storage, geospatial indexing |
| AI Parsing | [DeepInfra](https://deepinfra.com/) — Meta-LLaMA-3.1-8B | Parse free-text SMS into structured JSON |
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) | Place name → coordinates |
| SMS Gateway | [SMS Gate](https://smsgate.app/) (Android app) | Send/receive SMS via an Android device |
| Auth | OTP via SMS + JWT (HS256) | Passwordless phone-based authentication |
| Real-time | WebSocket | Push new requests to volunteer apps instantly |
| Mobile App | React Native | Cross-platform iOS/Android app |

---

## Architecture

```

 Entry Points 
 
 React Native App Meena's Nokia (plain SMS) 
 
 REST API calls SMS Gate (Android) 
 Webhook POST 

 
 

 FastAPI Backend 
 
 /auth/* /requests/* /sms/incoming /ws/volunteer 
 
 AI Parser (LLaMA) 
 Geocoder (Nominatim) 
 
 
 MongoDB Atlas 
 users · requests · otps 
 notifications · sms_sessions 
 
 
 Matching Engine ($near geospatial) 
 
 
 Notification Service 
 SMS Gate (outbound) WebSocket push 
 

```

---

## Project Structure

```
resq-backend/
 app/
 main.py # App entry point, CORS, rate limiting, route mounting
 core/
 config.py # All environment variables (DB, AI, SMS, JWT)
 database.py # MongoDB connection + auto-creates indexes on startup
 security.py # JWT create/verify helpers
 middleware.py # Rate limiting (60 req/min per IP)
 models/
 models.py # Database document models + enums
 schemas/
 schemas.py # Pydantic input/output schemas for all endpoints
 repositories/ # All MongoDB queries (data access layer)
 services/
 auth_service.py # OTP logic + JWT generation
 ai_parser.py # LLM call → structured JSON from free-text SMS
 geocoder.py # Text → coordinates (and reverse)
 matching.py # Geospatial volunteer matching engine
 sms_service.py # Send SMS via SMS Gate API
 notification_service.py # Dispatch alerts to matched volunteers
 distance.py # Haversine distance + location update logic
 scheduler.py # Background radius expansion job
 ws_manager.py # WebSocket connection manager
 api/v1/
 auth.py # /auth/* — OTP request, OTP verify
 requests.py # Emergency request CRUD
 volunteers.py # Volunteer registration, profile, location
 sms.py # Incoming SMS webhook + YES/NO command handler
 tracking.py # Live location updates + distance polling
 notifications.py # List notifications for a user
 websocket.py # WebSocket endpoint
 .env.example # Environment variable template
 requirements.txt
 README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- MongoDB Atlas account (free tier works)
- DeepInfra API key
- An Android device with [SMS Gate](https://smsgate.app/) installed and configured
- Node.js + React Native CLI (for the mobile app)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yuvraj-dw/ResQ
cd resq-backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (see section below)

# 5. Start the server
uvicorn app.main:app --reload --port 8000
```

MongoDB will automatically create all collections and indexes on first startup — no manual database setup needed.

### Interactive API Docs

Once running, open:

```
http://localhost:8000/docs # Swagger UI (interactive)
http://localhost:8000/redoc # ReDoc (read-only)
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the following:

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URL` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DATABASE_NAME` | MongoDB database name | `resq` |
| `SECRET_KEY` | JWT signing secret (generate a long random string) | `openssl rand -hex 32` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiry | `1440` |
| `DEEPINFRA_API_KEY` | DeepInfra API key for LLaMA | `your_deepinfra_key` |
| `DEEPINFRA_MODEL` | LLaMA model string | `meta-llama/Meta-Llama-3.1-8B-Instruct` |
| `SMS_GATE_URL` | SMS Gate webhook base URL | `http://your-phone-ip:8080` |
| `SMS_GATE_USERNAME` | SMS Gate basic auth username | `admin` |
| `SMS_GATE_PASSWORD` | SMS Gate basic auth password | `your_password` |
| `SMS_GATE_DEVICE_ID` | SMS Gate device ID | `your_device_id` |
| `OTP_EXPIRY_MINUTES` | OTP validity window | `5` |
| `INITIAL_SEARCH_RADIUS_KM` | Starting volunteer search radius | `5` |
| `MAX_SEARCH_RADIUS_KM` | Maximum search radius | `20` |
| `RADIUS_EXPANSION_INTERVAL_MINUTES` | How often to expand the radius | `5` |

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/request-otp` | None | Send OTP to a phone number |
| `POST` | `/api/v1/auth/verify-otp` | None | Verify OTP and receive JWT token |

### Emergency Requests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/requests/` | JWT | Create a new emergency request |
| `GET` | `/api/v1/requests/` | JWT | List all requests (with filters) |
| `GET` | `/api/v1/requests/{request_id}` | JWT | Get a single request by ID |
| `PATCH` | `/api/v1/requests/{request_id}/cancel` | JWT | Cancel a request |

### Volunteers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/volunteers/register` | JWT | Register current user as a volunteer |
| `GET` | `/api/v1/volunteers/profile` | JWT | Get own volunteer profile |
| `PATCH` | `/api/v1/volunteers/profile` | JWT | Update resources, blood group, availability |
| `POST` | `/api/v1/volunteers/accept/{request_id}` | JWT | Accept an assigned emergency request |
| `POST` | `/api/v1/volunteers/decline/{request_id}` | JWT | Decline a request |

### Live Tracking

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/tracking/location` | JWT | Volunteer pushes their current GPS location |
| `GET` | `/api/v1/tracking/{request_id}/distance` | JWT | Requester polls volunteer's current distance |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications/` | JWT | List notifications for the current user |

### SMS Webhook

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/sms/incoming` | Signing key | SMS Gate forwards incoming messages here |

### WebSocket

| Endpoint | Auth | Description |
|---|---|---|
| `WS /api/v1/ws/volunteer` | JWT (query param `?token=`) | Real-time push channel for volunteers |

---

## WebSocket Events

Connect as a volunteer:
```
ws://your-server/api/v1/ws/volunteer?token=<jwt>
```

### Events received by the client

| Event type | Payload | Description |
|---|---|---|
| `new_request` | `{ resource, blood_group, urgency, location_name, distance_km }` | A matching emergency request was found near the volunteer |
| `request_update` | `{ request_id, status }` | A request status changed (e.g. already accepted by someone else) |
| `pong` | — | Response to a client `ping` to keep the connection alive |

### Events sent by the client

| Event | Description |
|---|---|
| `ping` | Send every 30 seconds to keep the connection alive |

---

## Core Flows

### SMS Emergency Request (no smartphone needed)

```
User sends SMS
 → SMS Gate receives it
 → Webhook POST to /api/v1/sms/incoming
 → AI Parser extracts resource, blood group, urgency, location
 → Geocoder converts location name to coordinates
 → Request created in MongoDB
 → Matching engine runs $near query (5 km radius)
 → Volunteers notified via SMS + WebSocket
 → Requester receives confirmation SMS
```

### Volunteer Matching & Radius Expansion

```
Request created (status: "open")
 → $near query: volunteers within 5 km
 → If found → notify → status: "matched"
 → If not found → wait 5 min → expand to 10 km
 → Repeat: 15 km, then 20 km
 → First volunteer to accept → status: "assigned"
 → All other pending notifications expire
 → Requester notified with volunteer details
```

### OTP Login (app users)

```
POST /auth/request-otp { phone }
 → 6-digit OTP generated, hashed, stored (5 min expiry)
 → OTP sent via SMS Gate
POST /auth/verify-otp { phone, otp }
 → Hash verified, expiry checked
 → User created if first time
 → JWT returned (valid 24h)
```

---

## Known Limitations & Roadmap

| Status | Item |
|---|---|
| Done | SMS + AI parsing flow |
| Done | Geospatial volunteer matching |
| Done | OTP authentication + JWT |
| Done | WebSocket real-time push |
| Done | Dual-channel notifications (SMS + WebSocket) |
| Done | SMS volunteer registration flow |
| Done | SMS YES/NO accept/decline commands |
| Done | Rate limiting middleware |
| In Progress | Background radius expansion scheduler (needs validation) |
| Planned | Automated test suite |
| Planned | React Native app UI polish |
| Planned | Admin dashboard for monitoring active requests |
| Planned | Multi-language SMS support |

> **Note on coordinates:** MongoDB stores coordinates as `[longitude, latitude]` (GeoJSON standard). React Native Maps and Leaflet use `[latitude, longitude]`. Always swap when passing coordinates between the API and the frontend map.

---

## Team & Credits

> _Built at [Hackathon Name] — [Date]_

| Name | Role |
|---|---|
| [Yuvraj Dwivedi] | Backend / API / Database / Matching Engine |
| [Harsh Kushwaha] | Mobile App (React Native) |
| [Vishwas Paliwal] | UI/UX |
| [Rudra Purohit] | Documentation |

**Special thanks to:**
- [DeepInfra](https://deepinfra.com/) for the LLaMA inference API
- [OpenStreetMap](https://www.openstreetmap.org/) & Nominatim for geocoding
- [SMS Gate](https://smsgate.app/) for the Android SMS gateway

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
 Built with urgency. Because emergencies don't wait.
</p>
