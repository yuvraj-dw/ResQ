from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from app.models.models import ResourceType, BloodGroup, UrgencyLevel, RequestStatus, RegistrationSource


class LocationSchema(BaseModel):
    type: str = "Point"
    coordinates: List[float]

    @validator("coordinates")
    def validate_coordinates(cls, v):
        if len(v) != 2:
            raise ValueError("Coordinates must be [longitude, latitude]")
        if not (-180 <= v[0] <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        if not (-90 <= v[1] <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v


class OTPSendRequest(BaseModel):
    phone: str

    @validator("phone")
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v
        return v


class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

    @validator("phone")
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v
        return v


class AppRegisterRequest(BaseModel):
    phone: str
    name: Optional[str] = ""
    resources: Optional[List[ResourceType]] = []
    blood_group: Optional[BloodGroup] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone")
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v
        return v

    @validator("blood_group")
    def validate_blood_group(cls, v, values):
        resources = values.get("resources", [])
        if resources and ResourceType.BLOOD in resources and v is None:
            raise ValueError("Blood group is required when registering as blood donor")
        return v


class AppRegisterVerifyRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    resources: Optional[List[ResourceType]] = None
    blood_group: Optional[BloodGroup] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone")
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v
        return v


class SMSRegisterRequest(BaseModel):
    phone: str
    name: str
    resources: List[ResourceType]
    blood_group: Optional[BloodGroup] = None
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone")
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+" + v
        return v

    @validator("blood_group")
    def validate_blood_group(cls, v, values):
        resources = values.get("resources", [])
        if ResourceType.BLOOD in resources and v is None:
            raise ValueError("Blood group is required when registering as blood donor")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RequestCreate(BaseModel):
    resource: ResourceType
    blood_group: Optional[BloodGroup] = None
    urgency: UrgencyLevel = UrgencyLevel.HIGH
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raw_message: Optional[str] = None


class RequestResponse(BaseModel):
    id: str = Field(..., alias="_id")
    requester_id: Optional[str] = None
    requester_phone: str
    source: str
    resource: ResourceType
    blood_group: Optional[BloodGroup] = None
    urgency: UrgencyLevel
    location_name: Optional[str] = None
    location: Optional[LocationSchema] = None
    raw_message: Optional[str] = None
    status: RequestStatus
    assigned_volunteer: Optional[str] = None
    current_radius_km: float = 5.0
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class RequestListResponse(BaseModel):
    requests: List[RequestResponse]
    total: int


class VolunteerRegister(BaseModel):
    name: str
    phone: str
    resources: List[ResourceType]
    blood_group: Optional[BloodGroup] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("blood_group")
    def validate_blood_group(cls, v, values):
        resources = values.get("resources", [])
        if ResourceType.BLOOD in resources and v is None:
            raise ValueError("Blood group is required when registering as blood donor")
        return v


class VolunteerUpdate(BaseModel):
    name: Optional[str] = None
    resources: Optional[List[ResourceType]] = None
    blood_group: Optional[BloodGroup] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    phone: str
    resources: List[ResourceType] = []
    blood_group: Optional[BloodGroup] = None
    location: Optional[LocationSchema] = None
    location_name: Optional[str] = None
    is_volunteer: bool = False
    registration_source: str = "app"
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class AcceptRequestResponse(BaseModel):
    request_id: str
    status: str
    volunteer: UserResponse


class DistanceResponse(BaseModel):
    request_id: str
    volunteer_phone: str
    distance_km: float
    volunteer_location: Optional[LocationSchema] = None


class AIParsedRequest(BaseModel):
    resource: Optional[str] = None
    blood_group: Optional[str] = None
    location_name: Optional[str] = None
    urgency: Optional[str] = None


class SMSWebhookPayload(BaseModel):
    deviceId: Optional[str] = None
    event: str
    id: str
    payload: dict


class SMSIncomingMessage(BaseModel):
    messageId: Optional[str] = None
    message: str
    sender: str
    recipient: Optional[str] = None
    simNumber: Optional[int] = None
    receivedAt: Optional[str] = None


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class NotificationResponse(BaseModel):
    id: str = Field(..., alias="_id")
    request_id: str
    volunteer_id: Optional[str] = None
    volunteer_phone: str
    status: str
    radius_km: float
    created_at: datetime

    class Config:
        populate_by_name = True


TokenResponse.model_rebuild()