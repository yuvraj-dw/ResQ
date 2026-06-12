from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.schemas.schemas import (
    VolunteerRegister,
    VolunteerUpdate,
    UserResponse,
    LocationSchema,
)
from app.models.models import ResourceType, BloodGroup
from app.repositories.repositories import UserRepo
from app.services.geocoder import GeocoderService


router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


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


@router.post("/register", response_model=UserResponse)
async def register_volunteer(
    data: VolunteerRegister,
    current_user: dict = Depends(get_current_user),
):
    user_repo = UserRepo()

    existing = await user_repo.get_by_phone(current_user["phone"])
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please authenticate first.",
        )

    coordinates = None
    location_name = data.location_name

    if data.latitude and data.longitude:
        coordinates = [data.longitude, data.latitude]
    elif data.location_name:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(data.location_name)
        if coords:
            coordinates = list(coords)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not geocode location: {data.location_name}",
            )

    update_data = {
        "name": data.name,
        "resources": [r.value for r in data.resources],
        "blood_group": data.blood_group.value if data.blood_group else None,
        "is_volunteer": True,
        "location_name": location_name,
    }

    if coordinates:
        update_data["location"] = {
            "type": "Point",
            "coordinates": coordinates,
        }

    updated = await user_repo.update(str(existing["_id"]), update_data)
    return user_to_response(updated)


@router.get("/me", response_model=UserResponse)
async def get_volunteer_profile(
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("is_volunteer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not registered as a volunteer",
        )
    return user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_volunteer_profile(
    data: VolunteerUpdate,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("is_volunteer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not registered as a volunteer",
        )

    user_repo = UserRepo()
    update_data = {}

    if data.name is not None:
        update_data["name"] = data.name
    if data.resources is not None:
        update_data["resources"] = [r.value for r in data.resources]
    if data.blood_group is not None:
        update_data["blood_group"] = data.blood_group.value
    if data.location_name is not None:
        update_data["location_name"] = data.location_name

    if data.latitude is not None and data.longitude is not None:
        update_data["location"] = {
            "type": "Point",
            "coordinates": [data.longitude, data.latitude],
        }
    elif data.location_name and "location" not in update_data:
        geocoder = GeocoderService()
        coords = await geocoder.geocode(data.location_name)
        if coords:
            update_data["location"] = {
                "type": "Point",
                "coordinates": list(coords),
            }

    updated = await user_repo.update(str(current_user["_id"]), update_data)
    return user_to_response(updated)


@router.put("/me/location", response_model=UserResponse)
async def update_volunteer_location(
    latitude: float,
    longitude: float,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("is_volunteer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not registered as a volunteer",
        )

    from app.services.distance import distance_service
    result = await distance_service.update_volunteer_location(
        volunteer_phone=current_user["phone"],
        latitude=latitude,
        longitude=longitude,
    )

    updated = await UserRepo().get_by_phone(current_user["phone"])
    return user_to_response(updated)