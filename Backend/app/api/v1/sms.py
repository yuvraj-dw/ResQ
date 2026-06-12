import logging
import hmac as hmac_module
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException, status, Query
from app.schemas.schemas import SMSWebhookPayload, SMSIncomingMessage
from app.models.models import (
    ResourceType,
    BloodGroup,
    UrgencyLevel,
    RequestStatus,
    SMSSessionStep,
)
from app.repositories.repositories import SMSSessionRepo, UserRepo, RequestRepo, NotificationRepo
from app.services.ai_parser import AIParserService
from app.services.geocoder import GeocoderService
from app.services.sms_service import sms_service
from app.services.matching import MatchingService, haversine_km
from app.services.notification_service import notification_service
from app.core.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["SMS"])


RESOURCE_KEYWORDS = {
    "blood": ResourceType.BLOOD,
    "transport": ResourceType.TRANSPORT,
    "medicines": ResourceType.MEDICINES,
    "medicine": ResourceType.MEDICINES,
    "food": ResourceType.FOOD,
    "shelter": ResourceType.SHELTER,
}

BLOOD_GROUP_KEYWORDS = {
    "a+": BloodGroup.A_POSITIVE,
    "a-": BloodGroup.A_NEGATIVE,
    "b+": BloodGroup.B_POSITIVE,
    "b-": BloodGroup.B_NEGATIVE,
    "ab+": BloodGroup.AB_POSITIVE,
    "ab-": BloodGroup.AB_NEGATIVE,
    "o+": BloodGroup.O_POSITIVE,
    "o-": BloodGroup.O_NEGATIVE,
}

URGENCY_KEYWORDS = {
    "urgent": UrgencyLevel.CRITICAL,
    "urgently": UrgencyLevel.CRITICAL,
    "emergency": UrgencyLevel.CRITICAL,
    "critical": UrgencyLevel.CRITICAL,
    "asap": UrgencyLevel.HIGH,
    "important": UrgencyLevel.MEDIUM,
    "low": UrgencyLevel.LOW,
}


def verify_webhook_signature(request_body: bytes, timestamp: str, signature: str) -> bool:
    if not settings.SMS_GATE_SIGNING_KEY:
        return True
    message = request_body + timestamp.encode()
    expected = hmac_module.new(
        settings.SMS_GATE_SIGNING_KEY.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
    return hmac_module.compare_digest(expected, signature)


async def handle_sms_accept(phone: str, request_id: str):
    req_repo = RequestRepo()
    user_repo = UserRepo()

    request = await req_repo.get_by_id(request_id)
    if not request:
        await sms_service.send_sms(phone, "Request not found. It may have been cancelled.")
        return

    if request["status"] not in (RequestStatus.OPEN.value, RequestStatus.MATCHED.value):
        await sms_service.send_sms(
            phone,
            f"This request has already been {request['status']}. Thank you for responding.",
        )
        return

    volunteer = await user_repo.get_by_phone(phone)
    if not volunteer or not volunteer.get("is_volunteer"):
        await sms_service.send_sms(phone, "You need to register as a volunteer first. Send REGISTER to sign up.")
        return

    resource_types = volunteer.get("resources", [])
    if request["resource"] not in resource_types:
        if request["resource"] == "blood" and "blood" not in resource_types:
            await sms_service.send_sms(phone, "You are not registered for this resource type.")
            return

    volunteer_id = str(volunteer["_id"])

    await req_repo.update_status(
        request_id=request_id,
        status=RequestStatus.ASSIGNED,
        assigned_volunteer=volunteer_id,
    )

    await notification_service.mark_accepted(request_id, volunteer_id)

    distance_km = None
    if request.get("location") and volunteer.get("location"):
        req_coords = request["location"]["coordinates"]
        vol_coords = volunteer["location"]["coordinates"]
        distance_km = haversine_km(
            lat1=req_coords[1], lon1=req_coords[0],
            lat2=vol_coords[1], lon2=vol_coords[0],
        )

    await sms_service.send_volunteer_found(
        phone=request["requester_phone"],
        volunteer_name=volunteer.get("name", "Volunteer"),
        volunteer_phone=phone,
        distance_km=distance_km or 0,
    )

    await sms_service.send_sms(
        phone,
        f"You have accepted the request for {request['resource']}. "
        f"The requester has been notified. "
        f"Distance: {distance_km:.1f} km" if distance_km else "The requester has been notified.",
    )

    logger.info(f"Volunteer {phone} accepted request {request_id}")


async def handle_sms_decline(phone: str, request_id: str):
    req_repo = RequestRepo()
    request = await req_repo.get_by_id(request_id)
    if not request:
        await sms_service.send_sms(phone, "Request not found.")
        return

    await sms_service.send_sms(
        phone,
        "You have declined this request. You may still receive future requests. Thank you.",
    )

    logger.info(f"Volunteer {phone} declined request {request_id}")


async def process_sms_request(phone: str, message: str, location_name: Optional[str] = None):
    ai_parser = AIParserService()
    parsed = await ai_parser.parse_emergency_message(message)

    resource = None
    blood_group = None
    urgency = UrgencyLevel.HIGH

    if parsed:
        if parsed.resource:
            try:
                resource = ResourceType(parsed.resource.lower())
            except ValueError:
                pass
        if parsed.blood_group:
            try:
                blood_group = BloodGroup(parsed.blood_group)
            except ValueError:
                pass
        if parsed.urgency:
            try:
                urgency = UrgencyLevel(parsed.urgency.lower())
            except ValueError:
                pass
        if parsed.location_name and not location_name:
            location_name = parsed.location_name

    if not resource:
        for keyword, res_type in RESOURCE_KEYWORDS.items():
            if keyword in message.lower():
                resource = res_type
                break

    if not blood_group and resource == ResourceType.BLOOD:
        msg_lower = message.lower()
        for keyword, bg in BLOOD_GROUP_KEYWORDS.items():
            if keyword in msg_lower:
                blood_group = bg
                break

    if not resource:
        await sms_service.send_sms(phone, "Could not understand the resource type. Please specify: blood, transport, medicines, food, or shelter.")
        return None

    coordinates = None
    if location_name:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(location_name)
        if coords:
            coordinates = list(coords)

    if not coordinates:
        await sms_service.send_sms(phone, f"Could not determine location for '{location_name}'. Please provide a more specific location.")
        return None

    req_repo = RequestRepo()
    request_dict = {
        "requester_id": None,
        "requester_phone": phone,
        "source": "sms",
        "resource": resource.value,
        "blood_group": blood_group.value if blood_group else None,
        "urgency": urgency.value,
        "location_name": location_name,
        "location": {
            "type": "Point",
            "coordinates": coordinates,
        } if coordinates else None,
        "raw_message": message,
        "status": RequestStatus.OPEN.value,
        "assigned_volunteer": None,
        "current_radius_km": 5.0,
    }

    request_id = await req_repo.create(request_dict)

    resource_label = resource.value
    if blood_group:
        resource_label = f"{blood_group.value} blood"
    await sms_service.send_request_received(phone, resource_label, location_name or "your area")

    matching_svc = MatchingService()
    volunteers = await matching_svc.find_matching_volunteers(
        request_id=request_id,
        coordinates=coordinates,
        resource=resource,
        blood_group=blood_group,
    )

    if volunteers:
        await notification_service.notify_volunteers(
            request_id=request_id,
            volunteers=volunteers,
            resource=resource.value,
            urgency=urgency.value,
            location_name=location_name or "unknown",
        )
        await req_repo.update_status(request_id, RequestStatus.MATCHED)
    else:
        await sms_service.send_search_expanded(phone, 5.0)

    return request_id


async def handle_sms_registration(phone: str, message: str):
    session_repo = SMSSessionRepo()
    user_repo = UserRepo()

    msg_lower = message.strip().lower()

    if msg_lower in ("register", "start", "hello", "hi"):
        await session_repo.delete(phone)
        await session_repo.create({
            "phone": phone,
            "step": SMSSessionStep.NAME.value,
            "data": {},
        })
        await sms_service.send_sms(phone, "Welcome to ResQ! What is your name?")
        return

    session = await session_repo.get_by_phone(phone)
    if not session:
        await sms_service.send_sms(phone, "Send 'REGISTER' to sign up as a volunteer.")
        return

    step = session["step"]
    data = session.get("data", {})

    if step == SMSSessionStep.NAME.value:
        name = message.strip()
        if len(name) < 2:
            await sms_service.send_sms(phone, "Please enter a valid name (at least 2 characters).")
            return
        data["name"] = name
        await session_repo.update(str(session["_id"]), {
            "step": SMSSessionStep.RESOURCES.value,
            "data": data,
        })
        await sms_service.send_sms(
            phone,
            f"Hi {name}! What can you help with? Reply with resource types:\n"
            "1. BLOOD\n2. TRANSPORT\n3. MEDICINES\n4. FOOD\n5. SHELTER\n"
            "You can combine: e.g., 'blood, transport'"
        )
        return

    if step == SMSSessionStep.RESOURCES.value:
        msg_resources = msg_lower.replace("and", ",").replace(".", "").replace(" ", "")
        resources = []
        for keyword, res_type in RESOURCE_KEYWORDS.items():
            if keyword in msg_resources:
                resources.append(res_type.value)

        if not resources:
            await sms_service.send_sms(phone, "Please specify at least one resource: blood, transport, medicines, food, shelter")
            return

        data["resources"] = resources

        next_step = SMSSessionStep.BLOOD_GROUP if "blood" in resources else SMSSessionStep.LOCATION
        await session_repo.update(str(session["_id"]), {
            "step": next_step.value,
            "data": data,
        })

        if next_step == SMSSessionStep.BLOOD_GROUP:
            await sms_service.send_sms(phone, "What is your blood group? (A+, A-, B+, AB+, AB-, O+, O-)")
        else:
            await sms_service.send_sms(phone, "Where are you located? Enter City and Pincode (e.g., 'Bhopal, 462020')")
        return

    if step == SMSSessionStep.BLOOD_GROUP.value:
        bg = None
        msg_normalized = msg_lower.strip().replace(" ", "")
        for keyword, bg_type in BLOOD_GROUP_KEYWORDS.items():
            if keyword == msg_normalized:
                bg = bg_type
                break

        if not bg:
            await sms_service.send_sms(phone, "Please enter a valid blood group: A+, A-, B+, B-, AB+, AB-, O+, O-")
            return

        data["blood_group"] = bg.value
        await session_repo.update(str(session["_id"]), {
            "step": SMSSessionStep.LOCATION.value,
            "data": data,
        })
        await sms_service.send_sms(phone, "Where are you located? Enter City and Pincode (e.g., 'Bhopal, 462020')")
        return

    if step == SMSSessionStep.LOCATION.value:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(message.strip())
        if not coords:
            await sms_service.send_sms(phone, f"Could not find location '{message}'. Please try again with a more specific location.")
            return

        coordinates = list(coords)
        data["location"] = {"type": "Point", "coordinates": coordinates}
        data["location_name"] = message.strip()

        existing = await user_repo.get_by_phone(phone)
        if existing:
            update_data = {
                "name": data.get("name", existing.get("name", "")),
                "resources": data.get("resources", existing.get("resources", [])),
                "blood_group": data.get("blood_group", existing.get("blood_group")),
                "is_volunteer": True,
                "location": data["location"],
                "location_name": data["location_name"],
                "registration_source": "sms",
            }
            await user_repo.update(str(existing["_id"]), update_data)
        else:
            await user_repo.create({
                "name": data.get("name", ""),
                "phone": phone,
                "resources": data.get("resources", []),
                "blood_group": data.get("blood_group"),
                "location": data["location"],
                "location_name": data["location_name"],
                "is_volunteer": True,
                "registration_source": "sms",
            })

        await session_repo.delete(phone)
        await sms_service.send_sms(phone, "Registration complete! You'll receive emergency alerts for your area. You can send emergency requests anytime by texting your need.")
        return


@router.post("/incoming")
async def sms_webhook(
    payload: SMSWebhookPayload,
    background_tasks: BackgroundTasks,
    request: Request,
):
    if payload.event != "sms:received":
        logger.info(f"Ignoring SMS event: {payload.event}")
        return {"status": "ignored", "event": payload.event}

    sms_data = SMSIncomingMessage(**payload.payload)

    phone = sms_data.sender
    message = sms_data.message.strip()

    logger.info(f"Incoming SMS from {phone}: {message[:50]}...")

    msg_lower = message.lower().strip()

    if msg_lower.startswith("yes"):
        parts = message.strip().split()
        if len(parts) >= 2:
            request_id = parts[1].strip()
            await handle_sms_accept(phone, request_id)
        else:
            await sms_service.send_sms(phone, "To accept a request, reply: YES <request_id>")
        return {"status": "processed"}

    if msg_lower.startswith("no") or msg_lower.startswith("decline"):
        parts = message.strip().split()
        if len(parts) >= 2:
            request_id = parts[1].strip()
            await handle_sms_decline(phone, request_id)
        else:
            await sms_service.send_sms(phone, "To decline a request, reply: NO <request_id>")
        return {"status": "processed"}

    if msg_lower in ("register", "start") or msg_lower in ("hi", "hello", "hey", "help", "info", "menu"):
        await handle_sms_registration(phone, message)
    elif any(keyword in msg_lower for keyword in ["need", "urgent", "emergency", "blood", "transport", "medicine", "food", "shelter"]) or msg_lower.startswith("req"):
        background_tasks.add_task(process_sms_request, phone, message)
    else:
        session_repo = SMSSessionRepo()
        session = await session_repo.get_by_phone(phone)
        if session:
            await handle_sms_registration(phone, message)
        else:
            HELP_MESSAGE = (
                "ResQ - Emergency Response Platform\n\n"
                "How to use this service:\n\n"
                "1. REGISTER - Sign up as a volunteer\n"
                "   Send: REGISTER\n\n"
                "2. EMERGENCY - Request help\n"
                "   Send: Need B- blood urgently near AIIMS\n"
                "   Send: Need transport near MP Nagar\n"
                "   Send: Need medicines for diabetes near Kolar Road\n\n"
                "3. ACCEPT a request\n"
                "   Send: YES <request_id>\n\n"
                "4. DECLINE a request\n"
                "   Send: NO <request_id>\n\n"
                "5. HELP - See this message\n"
                "   Send: HELP\n\n"
                "Resources: blood, transport, medicines, food, shelter"
            )
            await sms_service.send_sms(phone, HELP_MESSAGE)

    return {"status": "processed"}