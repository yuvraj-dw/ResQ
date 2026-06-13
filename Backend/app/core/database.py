from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient = None
    database = None


db = Database()


async def connect_to_database():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.database = db.client[settings.DATABASE_NAME]

    await db.database.users.create_index("phone", unique=True)
    await db.database.users.create_index([("location", "2dsphere")])
    await db.database.users.create_index("resources")
    await db.database.users.create_index("registration_source")

    await db.database.requests.create_index([("location", "2dsphere")])
    await db.database.requests.create_index([("status", 1), ("resource", 1)])
    await db.database.requests.create_index("requester_phone")
    await db.database.requests.create_index("created_at")
    await db.database.requests.create_index("short_id", unique=True)

    await db.database.notifications.create_index([("request_id", 1), ("status", 1)])
    await db.database.notifications.create_index("volunteer_phone")

    await db.database.otps.create_index("phone")
    await db.database.otps.create_index("expires_at")

    await db.database.sms_sessions.create_index("phone")
    await db.database.sms_sessions.create_index("updated_at")

    await db.database.app_notifications.create_index([("user_phone", 1), ("created_at", -1)])
    await db.database.app_notifications.create_index([("user_phone", 1), ("read", 1)])


async def disconnect_from_database():
    if db.client:
        db.client.close()


def get_database():
    return db.database