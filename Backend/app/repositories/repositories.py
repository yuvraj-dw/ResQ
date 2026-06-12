from datetime import datetime, timedelta, timezone
from typing import Optional, List
from bson import ObjectId
from app.core.database import get_database
from app.models.models import (
    UserDB,
    RequestDB,
    NotificationDB,
    OTPDB,
    SMSSessionDB,
    ResourceType,
    BloodGroup,
    RequestStatus,
    NotificationStatus,
    SMSSessionStep,
)


class UserRepo:
    def __init__(self):
        self.collection_name = "users"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, user_data: dict) -> str:
        user_data["created_at"] = datetime.now(timezone.utc)
        user_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(user_data)
        return str(result.inserted_id)

    async def get_by_id(self, user_id: str) -> Optional[dict]:
        return await self.collection.find_one({"_id": ObjectId(user_id)})

    async def get_by_phone(self, phone: str) -> Optional[dict]:
        return await self.collection.find_one({"phone": phone})

    async def update(self, user_id: str, update_data: dict) -> Optional[dict]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )
        return await self.get_by_id(user_id)

    async def update_location(self, phone: str, location: dict, location_name: str = None):
        update = {"location": location, "updated_at": datetime.now(timezone.utc)}
        if location_name:
            update["location_name"] = location_name
        await self.collection.update_one({"phone": phone}, {"$set": update})

    async def find_nearby_volunteers(
        self,
        coordinates: List[float],
        resource: ResourceType,
        radius_meters: float,
        blood_group: Optional[BloodGroup] = None,
    ) -> List[dict]:
        query = {
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": coordinates,
                    },
                    "$maxDistance": radius_meters,
                }
            },
            "resources": {"$in": [resource.value]},
            "is_volunteer": True,
        }
        if blood_group and resource == ResourceType.BLOOD:
            query["blood_group"] = blood_group.value

        cursor = self.collection.find(query)
        return await cursor.to_list(length=100)


class RequestRepo:
    def __init__(self):
        self.collection_name = "requests"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, request_data: dict) -> str:
        request_data["created_at"] = datetime.now(timezone.utc)
        request_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(request_data)
        return str(result.inserted_id)

    async def get_by_id(self, request_id: str) -> Optional[dict]:
        return await self.collection.find_one({"_id": ObjectId(request_id)})

    async def update(self, request_id: str, update_data: dict) -> Optional[dict]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": ObjectId(request_id)}, {"$set": update_data}
        )
        return await self.get_by_id(request_id)

    async def update_status(self, request_id: str, status: RequestStatus, assigned_volunteer: str = None):
        update = {"status": status.value, "updated_at": datetime.now(timezone.utc)}
        if assigned_volunteer:
            update["assigned_volunteer"] = assigned_volunteer
        await self.collection.update_one(
            {"_id": ObjectId(request_id)}, {"$set": update}
        )

    async def list_open_by_phone(self, phone: str) -> List[dict]:
        cursor = self.collection.find(
            {"requester_phone": phone, "status": {"$in": ["open", "matched"]}},
        ).sort("created_at", -1)
        return await cursor.to_list(length=50)

    async def list_by_phone(self, phone: str) -> List[dict]:
        cursor = self.collection.find(
            {"requester_phone": phone},
        ).sort("created_at", -1)
        return await cursor.to_list(length=50)


class NotificationRepo:
    def __init__(self):
        self.collection_name = "notifications"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, notification_data: dict) -> str:
        notification_data["created_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(notification_data)
        return str(result.inserted_id)

    async def get_by_request(self, request_id: str) -> List[dict]:
        cursor = self.collection.find({"request_id": request_id})
        return await cursor.to_list(length=100)

    async def update_status(self, notification_id: str, status: NotificationStatus):
        await self.collection.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"status": status.value}},
        )

    async def mark_accepted_for_request(self, request_id: str, volunteer_id: str):
        await self.collection.update_many(
            {"request_id": request_id, "volunteer_id": {"$ne": volunteer_id}},
            {"$set": {"status": NotificationStatus.EXPIRED.value}},
        )


class OTPRepo:
    def __init__(self):
        self.collection_name = "otps"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def create(self, otp_data: dict) -> str:
        otp_data["created_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(otp_data)
        return str(result.inserted_id)

    async def get_latest(self, phone: str) -> Optional[dict]:
        return await self.collection.find_one(
            {"phone": phone, "expires_at": {"$gt": datetime.now(timezone.utc)}},
            sort=[("created_at", -1)],
        )

    async def verify_and_delete(self, phone: str):
        await self.collection.delete_many({"phone": phone})


class SMSSessionRepo:
    def __init__(self):
        self.collection_name = "sms_sessions"

    @property
    def collection(self):
        return get_database()[self.collection_name]

    async def get_by_phone(self, phone: str) -> Optional[dict]:
        return await self.collection.find_one(
            {"phone": phone},
            sort=[("updated_at", -1)],
        )

    async def create(self, session_data: dict) -> str:
        session_data["created_at"] = datetime.now(timezone.utc)
        session_data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.insert_one(session_data)
        return str(result.inserted_id)

    async def update(self, session_id: str, update_data: dict) -> Optional[dict]:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": ObjectId(session_id)}, {"$set": update_data}
        )
        return await self.collection.find_one({"_id": ObjectId(session_id)})

    async def delete(self, phone: str):
        await self.collection.delete_many({"phone": phone})