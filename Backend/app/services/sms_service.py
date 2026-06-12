import httpx
from typing import Optional
from app.core.config import settings


class SMSService:
    def __init__(self):
        self.base_url = settings.SMS_GATE_BASE_URL
        self.username = settings.SMS_GATE_USERNAME
        self.password = settings.SMS_GATE_PASSWORD
        self.device_id = settings.SMS_GATE_DEVICE_ID

    async def send_sms(self, phone: str, message: str) -> Optional[dict]:
        if not self.username or not self.password:
            return {"status": "skipped", "reason": "SMS gateway not configured"}

        payload = {
            "textMessage": {"text": message},
            "phoneNumbers": [phone],
            "priority": 100,
        }

        if self.device_id:
            payload["deviceId"] = self.device_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/messages",
                    auth=(self.username, self.password),
                    json=payload,
                )
                if response.status_code in (200, 202):
                    return {"status": "sent", "response": response.json()}
                return {"status": "failed", "code": response.status_code, "body": response.text}
            except httpx.HTTPError as e:
                return {"status": "error", "reason": str(e)}

    async def send_otp(self, phone: str, otp: str) -> Optional[dict]:
        message = f"Your ResQ Auth Code is: {otp} "
        return await self.send_sms(phone, message)

    async def send_request_received(self, phone: str, resource: str, location: str) -> Optional[dict]:
        message = f"Emergency request received for {resource} near {location}. Searching for volunteers nearby..."
        return await self.send_sms(phone, message)

    async def send_search_expanded(self, phone: str, radius_km: float) -> Optional[dict]:
        message = f"Search expanded to {radius_km:.0f} km. Looking for more volunteers..."
        return await self.send_sms(phone, message)

    async def send_volunteer_found(self, phone: str, volunteer_name: str, volunteer_phone: str, distance_km: float) -> Optional[dict]:
        message = (
            f"Volunteer found! {volunteer_name} ({volunteer_phone}) "
            f"is {distance_km:.1f} km away and has been assigned to your request."
        )
        return await self.send_sms(phone, message)

    async def send_volunteer_notification(self, phone: str, resource: str, urgency: str, distance_km: float, location: str) -> Optional[dict]:
        message = (
            f"Emergency: {urgency} need for {resource} near {location}. "
            f"You are {distance_km:.1f} km away. "
            f"Reply YES to accept or NO to decline."
        )
        return await self.send_sms(phone, message)


sms_service = SMSService()