from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.schemas.schemas import DistanceResponse, LocationUpdate, LocationSchema
from app.services.distance import distance_service
from app.repositories.repositories import RequestRepo, UserRepo
from app.models.models import RequestStatus


router = APIRouter(prefix="/tracking", tags=["Distance Tracking"])


@router.post("/location", response_model=dict)
async def update_location(
    data: LocationUpdate,
    current_user: dict = Depends(get_current_user),
):
    result = await distance_service.update_volunteer_location(
        volunteer_phone=current_user["phone"],
        latitude=data.latitude,
        longitude=data.longitude,
    )
    return result


@router.get("/{request_id}/distance", response_model=DistanceResponse)
async def get_distance(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    req_repo = RequestRepo()
    req = await req_repo.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if req["status"] not in (RequestStatus.ASSIGNED.value, RequestStatus.MATCHED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not assigned yet",
        )

    result = await distance_service.get_distance(request_id, current_user["phone"])
    return DistanceResponse(**result)