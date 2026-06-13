from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId


class ResourceType(str, Enum):
    BLOOD = "blood"
    TRANSPORT = "transport"
    MEDICINES = "medicines"
    FOOD = "food"
    SHELTER = "shelter"


class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class UrgencyLevel(str, Enum):
    LOW = "low"
    HIGH = "high"


class RequestStatus(str, Enum):
    OPEN = "open"
    MATCHED = "matched"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class NotificationStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class AppNotificationType(str, Enum):
    NEW_REQUEST = "new_request"
    REQUEST_MATCHED = "request_matched"
    REQUEST_ASSIGNED = "request_assigned"
    REQUEST_CANCELLED = "request_cancelled"
    VOLUNTEER_FOUND = "volunteer_found"
    SEARCH_EXPANDED = "search_expanded"


class SMSSessionStep(str, Enum):
    NAME = "name"
    RESOURCES = "resources"
    BLOOD_GROUP = "blood_group"
    LOCATION = "location"
    COMPLETE = "complete"


class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class RegistrationSource(str, Enum):
    APP = "app"
    SMS = "sms"


class UserDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    phone: str
    resources: List[ResourceType] = []
    blood_group: Optional[BloodGroup] = None
    location: Optional[Location] = None
    location_name: Optional[str] = None
    is_volunteer: bool = False
    registration_source: str = "app"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class RequestDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    short_id: Optional[str] = None
    requester_id: Optional[str] = None
    requester_phone: str
    source: str
    resource: ResourceType
    blood_group: Optional[BloodGroup] = None
    urgency: UrgencyLevel = UrgencyLevel.HIGH
    location_name: Optional[str] = None
    location: Optional[Location] = None
    raw_message: Optional[str] = None
    status: RequestStatus = RequestStatus.OPEN
    assigned_volunteer: Optional[str] = None
    current_radius_km: float = 5.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NotificationDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    request_id: str
    volunteer_id: Optional[str] = None
    volunteer_phone: str
    status: NotificationStatus = NotificationStatus.SENT
    radius_km: float = 5.0
    message_sid: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class OTPDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    phone: str
    otp_hash: str
    verified: bool = False
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class SMSSessionDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    phone: str
    step: SMSSessionStep = SMSSessionStep.NAME
    data: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class AppNotificationDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_phone: str
    notification_type: AppNotificationType
    title: str
    message: str
    request_id: Optional[str] = None
    data: Optional[dict] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}