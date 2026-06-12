import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.schemas.schemas import (
    OTPSendRequest,
    OTPVerifyRequest,
    AppRegisterRequest,
    AppRegisterVerifyRequest,
    SMSRegisterRequest,
    TokenResponse,
    UserResponse,
    LocationSchema,
)
from app.services.sms_service import sms_service
from app.services.geocoder import GeocoderService
from app.repositories.repositories import UserRepo
from app.models.models import RegistrationSource


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_to_response(user: dict) -> UserResponse:
    location = None
    if user.get("location") and user["location"] is not None and "coordinates" in user["location"]:
        location = LocationSchema(
            type=user["location"]["type"],
            coordinates=user["location"]["coordinates"],
        )
    return UserResponse(
        _id=str(user["_id"]),
        name=user.get("name", ""),
        phone=user["phone"],
        resources=user.get("resources", []),
        blood_group=user.get("blood_group"),
        location=location,
        location_name=user.get("location_name"),
        is_volunteer=user.get("is_volunteer", False),
        registration_source=user.get("registration_source", "app"),
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )


@router.post("/send-otp", response_model=dict)
async def send_otp(request: OTPSendRequest):
    auth_service = AuthService()
    result = await auth_service.send_otp(request.phone)
    await sms_service.send_otp(request.phone, result["otp"])
    return {"message": "OTP sent successfully", "phone": request.phone}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerifyRequest):
    auth_service = AuthService()
    result = await auth_service.verify_otp(request.phone, request.otp)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )
    token, user_data = result
    user_repo = UserRepo()
    user = await user_repo.get_by_phone(request.phone)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_to_response(user),
    )


@router.post("/register/app", response_model=dict)
async def register_app(data: AppRegisterRequest):
    user_repo = UserRepo()
    existing = await user_repo.get_by_phone(data.phone)

    if existing:
        auth_service = AuthService()
        result = await auth_service.send_otp(data.phone)
        await sms_service.send_otp(data.phone, result["otp"])

        pending_data = {}
        if data.name:
            pending_data["name"] = data.name
        if data.resources:
            pending_data["resources"] = [r.value for r in data.resources]
        if data.blood_group:
            pending_data["blood_group"] = data.blood_group.value
        if data.location_name:
            pending_data["location_name"] = data.location_name
        if data.latitude and data.longitude:
            pending_data["latitude"] = data.latitude
            pending_data["longitude"] = data.longitude
        await user_repo.update(str(existing["_id"]), {"registration_pending": pending_data})

        return {
            "message": "OTP sent to your phone. Verify to complete registration.",
            "phone": data.phone,
            "requires_verification": True,
        }

    coordinates = None
    if data.latitude and data.longitude:
        coordinates = [data.longitude, data.latitude]
    elif data.location_name:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(data.location_name)
        if coords:
            coordinates = list(coords)

    user_data = {
        "name": data.name or "",
        "phone": data.phone,
        "resources": [r.value for r in data.resources] if data.resources else [],
        "blood_group": data.blood_group.value if data.blood_group else None,
        "is_volunteer": bool(data.resources),
        "location_name": data.location_name,
        "registration_source": RegistrationSource.APP.value,
    }
    if coordinates:
        user_data["location"] = {"type": "Point", "coordinates": coordinates}

    created_id = await user_repo.create(user_data)

    auth_service = AuthService()
    result = await auth_service.send_otp(data.phone)
    await sms_service.send_otp(data.phone, result["otp"])

    await user_repo.update(created_id, {"registration_pending": {
        "name": data.name or "",
        "resources": [r.value for r in data.resources] if data.resources else [],
        "blood_group": data.blood_group.value if data.blood_group else None,
        "location_name": data.location_name,
        "latitude": data.latitude,
        "longitude": data.longitude,
    }})

    return {
        "message": "OTP sent to your phone. Verify to complete registration.",
        "phone": data.phone,
        "requires_verification": True,
    }


@router.post("/register/app/verify", response_model=TokenResponse)
async def register_app_verify(data: AppRegisterVerifyRequest):
    auth_service = AuthService()
    result = await auth_service.verify_otp(data.phone, data.otp)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    user_repo = UserRepo()
    user = await user_repo.get_by_phone(data.phone)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    pending = user.pop("registration_pending", None)
    update_data = {"registration_source": RegistrationSource.APP.value}

    if data.name:
        update_data["name"] = data.name
    elif pending and pending.get("name"):
        update_data["name"] = pending["name"]

    if data.resources:
        update_data["resources"] = [r.value for r in data.resources]
        update_data["is_volunteer"] = True
    elif pending and pending.get("resources"):
        update_data["resources"] = pending["resources"]
        update_data["is_volunteer"] = True

    if data.blood_group:
        update_data["blood_group"] = data.blood_group.value
    elif pending and pending.get("blood_group"):
        update_data["blood_group"] = pending["blood_group"]

    coordinates = None
    if data.latitude and data.longitude:
        coordinates = [data.longitude, data.latitude]
    elif pending and pending.get("latitude") and pending.get("longitude"):
        coordinates = [pending["longitude"], pending["latitude"]]
    elif data.location_name or (pending and pending.get("location_name")):
        loc_name = data.location_name or pending.get("location_name", "")
        geocoder = GeocoderService()
        coords = await geocoder.geocode(loc_name)
        if coords:
            coordinates = list(coords)
            update_data["location_name"] = loc_name

    if coordinates:
        update_data["location"] = {"type": "Point", "coordinates": coordinates}

    update_data.pop("registration_pending", None)
    await user_repo.collection.update_one(
        {"_id": user["_id"]},
        {"$unset": {"registration_pending": ""}, "$set": update_data},
    )

    user = await user_repo.get_by_phone(data.phone)
    token = result[0]

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_to_response(user),
    )


@router.post("/register/sms", response_model=TokenResponse)
async def register_sms(data: SMSRegisterRequest):
    user_repo = UserRepo()

    coordinates = None
    if data.latitude and data.longitude:
        coordinates = [data.longitude, data.latitude]
    elif data.location_name:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(data.location_name)
        if not coords:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not geocode location: {data.location_name}",
            )
        coordinates = list(coords)

    user_data = {
        "name": data.name,
        "phone": data.phone,
        "resources": [r.value for r in data.resources],
        "blood_group": data.blood_group.value if data.blood_group else None,
        "is_volunteer": True,
        "location_name": data.location_name,
        "registration_source": RegistrationSource.SMS.value,
    }
    if coordinates:
        user_data["location"] = {"type": "Point", "coordinates": coordinates}

    existing = await user_repo.get_by_phone(data.phone)
    if existing:
        await user_repo.update(str(existing["_id"]), user_data)
        user = await user_repo.get_by_phone(data.phone)
    else:
        await user_repo.create(user_data)
        user = await user_repo.get_by_phone(data.phone)

    from app.core.security import create_access_token
    token = create_access_token(data={"sub": user["phone"], "user_id": str(user["_id"])})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)