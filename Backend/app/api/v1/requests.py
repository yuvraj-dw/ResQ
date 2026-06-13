from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from bson.errors import InvalidId
from bson import ObjectId
from app.api.deps import get_current_user, get_db
from app.schemas.schemas import (
    RequestCreate,
    RequestResponse,
    RequestListResponse,
    AcceptRequestResponse,
    LocationSchema,
    UserResponse,
)
from app.models.models import (
    ResourceType,
    BloodGroup,
    UrgencyLevel,
    RequestStatus,
)
from app.repositories.repositories import RequestRepo, UserRepo, NotificationRepo
from app.services.sms_service import sms_service
from app.services.notification_service import notification_service
from app.services.matching import MatchingService
from app.services.ai_parser import AIParserService
from app.models.models import AppNotificationType


router = APIRouter(prefix="/requests", tags=["Emergency Requests"])


def validate_object_id(oid: str):
    try:
        ObjectId(oid)
    except (InvalidId, ValueError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def request_to_response(req: dict) -> RequestResponse:
    location = None
    if req.get("location") and req["location"] is not None and "coordinates" in req["location"]:
        location = LocationSchema(
            type=req["location"]["type"],
            coordinates=req["location"]["coordinates"],
        )
    return RequestResponse(
        _id=str(req["_id"]),
        short_id=req.get("short_id"),
        requester_id=str(req.get("requester_id", "")) if req.get("requester_id") else None,
        requester_phone=req["requester_phone"],
        source=req["source"],
        resource=req["resource"],
        blood_group=req.get("blood_group"),
        urgency=req.get("urgency", "high"),
        location_name=req.get("location_name"),
        location=location,
        raw_message=req.get("raw_message"),
        status=req.get("status", "open"),
        assigned_volunteer=req.get("assigned_volunteer"),
        current_radius_km=req.get("current_radius_km", 5.0),
        created_at=req["created_at"],
        updated_at=req["updated_at"],
    )


async def process_matching(request_id: str, coordinates: list, resource: str, blood_group: str or None, location_name: str, urgency: str, requester_phone: str = None):
    matching_svc = MatchingService()
    resource_type = ResourceType(resource)
    bg = BloodGroup(blood_group) if blood_group else None

    req_repo = RequestRepo()
    req = await req_repo.get_by_id(request_id)
    short_id = req.get("short_id", request_id[-6:]) if req else request_id[-6:]

    volunteers = await matching_svc.find_matching_volunteers(
        request_id=request_id,
        coordinates=coordinates,
        resource=resource_type,
        blood_group=bg,
    )

    if volunteers:
        await notification_service.notify_volunteers(
            request_id=request_id,
            volunteers=volunteers,
            resource=resource,
            urgency=urgency,
            location_name=location_name or "unknown location",
            request_coordinates=coordinates,
            requester_phone=requester_phone,
            short_id=short_id,
        )
        if req and req["status"] == RequestStatus.OPEN.value:
            await req_repo.update_status(request_id, RequestStatus.MATCHED)


@router.post("/", response_model=RequestResponse)
async def create_request(
    request_data: RequestCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    req_repo = RequestRepo()

    if request_data.latitude and request_data.longitude:
        coordinates = [request_data.longitude, request_data.latitude]
    elif request_data.location_name:
        from app.services.geocoder import GeocoderService
        geocoder = GeocoderService()
        coords = await geocoder.geocode(request_data.location_name)
        if not coords:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not geocode location: {request_data.location_name}",
            )
        coordinates = list(coords)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either coordinates or location_name must be provided",
        )

    request_dict = {
        "requester_id": str(current_user["_id"]),
        "requester_phone": current_user["phone"],
        "source": "app",
        "resource": request_data.resource.value,
        "blood_group": request_data.blood_group.value if request_data.blood_group else None,
        "urgency": request_data.urgency.value,
        "location_name": request_data.location_name,
        "location": {
            "type": "Point",
            "coordinates": coordinates,
        },
        "raw_message": request_data.raw_message,
        "status": RequestStatus.OPEN.value,
        "assigned_volunteer": None,
        "current_radius_km": 5.0,
    }

    request_id = await req_repo.create(request_dict)
    created = await req_repo.get_by_id(request_id)

    ai_parser = AIParserService()
    advisory = await ai_parser.generate_instructions(
        request_data.resource.value, request_data.raw_message or ""
    )

    background_tasks.add_task(
        process_matching,
        request_id=request_id,
        coordinates=coordinates,
        resource=request_data.resource.value,
        blood_group=request_data.blood_group.value if request_data.blood_group else None,
        location_name=request_data.location_name or "unknown",
        urgency=request_data.urgency.value,
        requester_phone=current_user["phone"],
    )

    response = request_to_response(created)
    response.advisory = advisory
    return response


@router.get("/", response_model=RequestListResponse)
async def list_requests(
    current_user: dict = Depends(get_current_user),
):
    req_repo = RequestRepo()
    requests = await req_repo.list_by_phone(current_user["phone"])
    return RequestListResponse(
        requests=[request_to_response(r) for r in requests],
        total=len(requests),
    )


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    validate_object_id(request_id)
    req_repo = RequestRepo()
    req = await req_repo.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return request_to_response(req)


@router.post("/{request_id}/accept", response_model=AcceptRequestResponse)
async def accept_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    validate_object_id(request_id)
    req_repo = RequestRepo()

    req = await req_repo.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if req["status"] not in (RequestStatus.OPEN.value, RequestStatus.MATCHED.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request is already {req['status']}",
        )

    volunteer_id = str(current_user["_id"])

    await req_repo.update_status(
        request_id=request_id,
        status=RequestStatus.ASSIGNED,
        assigned_volunteer=volunteer_id,
    )

    await notification_service.mark_accepted(request_id, volunteer_id)

    volunteer = current_user
    distance_km = None
    if req.get("location") and volunteer.get("location"):
        from app.services.matching import haversine_km
        req_coords = req["location"]["coordinates"]
        vol_coords = volunteer["location"]["coordinates"]
        distance_km = haversine_km(
            lat1=req_coords[1], lon1=req_coords[0],
            lat2=vol_coords[1], lon2=vol_coords[0],
        )

    await sms_service.send_volunteer_found(
        phone=req["requester_phone"],
        volunteer_name=volunteer.get("name", "Volunteer"),
        volunteer_phone=volunteer["phone"],
        distance_km=distance_km or 0,
    )

    await notification_service.create_app_notification(
        user_phone=req["requester_phone"],
        notification_type=AppNotificationType.VOLUNTEER_FOUND,
        title="Volunteer found!",
        message=f"{volunteer.get('name', 'Volunteer')} is {distance_km:.1f} km away and has been assigned to your request.",
        request_id=request_id,
        data={"volunteer_phone": volunteer["phone"], "distance_km": round(distance_km, 1) if distance_km else None},
    )

    await notification_service.create_app_notification(
        user_phone=volunteer["phone"],
        notification_type=AppNotificationType.REQUEST_ASSIGNED,
        title="Request assigned to you",
        message=f"You have accepted the request for {req['resource']} near {req.get('location_name', 'unknown')}.",
        request_id=request_id,
    )

    return AcceptRequestResponse(
        request_id=request_id,
        status=RequestStatus.ASSIGNED.value,
        volunteer=UserResponse(
            _id=str(volunteer["_id"]),
            name=volunteer["name"],
            phone=volunteer["phone"],
            resources=volunteer.get("resources", []),
            blood_group=volunteer.get("blood_group"),
            location=None,
            location_name=volunteer.get("location_name"),
            is_volunteer=volunteer.get("is_volunteer", False),
            created_at=volunteer["created_at"],
            updated_at=volunteer["updated_at"],
        ),
    )


@router.patch("/{request_id}/status", response_model=RequestResponse)
async def update_request_status(
    request_id: str,
    status_query: str = Query(..., alias="status"),
    current_user: dict = Depends(get_current_user),
):
    validate_object_id(request_id)
    try:
        new_status = RequestStatus(status_query)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status_query}. Valid options: open, matched, assigned, completed, cancelled",
        )

    req_repo = RequestRepo()
    req = await req_repo.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if str(req.get("requester_id", "")) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this request",
        )

    await req_repo.update_status(request_id, new_status)
    updated = await req_repo.get_by_id(request_id)

    if new_status == RequestStatus.CANCELLED:
        await sms_service.send_sms(
            req["requester_phone"],
            f"Your emergency request has been cancelled.",
        )
        await notification_service.create_app_notification(
            user_phone=req["requester_phone"],
            notification_type=AppNotificationType.REQUEST_CANCELLED,
            title="Request cancelled",
            message=f"Your request for {req['resource']} has been cancelled.",
            request_id=request_id,
        )

        assigned_volunteer_id = req.get("assigned_volunteer")
        if assigned_volunteer_id:
            volunteer = await UserRepo().get_by_id(assigned_volunteer_id)
            if volunteer:
                await sms_service.send_sms(
                    volunteer["phone"],
                    f"The request for {req.get('resource', 'resources')} near {req.get('location_name', 'your area')} has been cancelled by the requester. No action needed.",
                )
                await notification_service.create_app_notification(
                    user_phone=volunteer["phone"],
                    notification_type=AppNotificationType.REQUEST_CANCELLED,
                    title="Request cancelled",
                    message=f"The request for {req.get('resource', 'resources')} near {req.get('location_name', 'your area')} has been cancelled.",
                    request_id=request_id,
                )

    return request_to_response(updated)