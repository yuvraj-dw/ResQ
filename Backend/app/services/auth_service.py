import hashlib
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from app.repositories.repositories import UserRepo, OTPRepo
from app.core.security import create_access_token, verify_access_token
from app.core.config import settings


logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.otp_repo = OTPRepo()

    async def send_otp(self, phone: str) -> dict:
        user = await self.user_repo.get_by_phone(phone)
        if not user:
            await self.user_repo.create({
                "name": "",
                "phone": phone,
                "resources": [],
                "blood_group": None,
                "location": None,
                "location_name": None,
                "is_volunteer": False,
                "registration_source": "app",
            })

        otp = f"{random.randint(0, 999999):0{settings.OTP_LENGTH}d}"
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        await self.otp_repo.create({
            "phone": phone,
            "otp_hash": otp_hash,
            "verified": False,
            "expires_at": expires_at,
        })

        return {"otp": otp, "phone": phone, "expires_at": expires_at}

    async def verify_otp(self, phone: str, otp: str) -> Optional[Tuple[str, dict]]:
        otp_record = await self.otp_repo.get_latest(phone)
        if not otp_record:
            return None

        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        if otp_record["otp_hash"] != otp_hash:
            return None

        if datetime.now(timezone.utc) > otp_record["expires_at"]:
            return None

        await self.otp_repo.verify_and_delete(phone)

        user = await self.user_repo.get_by_phone(phone)
        if not user:
            return None

        token = create_access_token(data={"sub": user["phone"], "user_id": str(user["_id"])})
        user_response = {
            "id": str(user["_id"]),
            "name": user["name"],
            "phone": user["phone"],
            "resources": user.get("resources", []),
            "blood_group": user.get("blood_group"),
            "is_volunteer": user.get("is_volunteer", False),
        }
        return token, user_response

    @staticmethod
    def get_current_user(token: str) -> Optional[dict]:
        payload = verify_access_token(token)
        if not payload:
            return None
        return payload