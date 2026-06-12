from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.repositories.repositories import NotificationRepo
from app.schemas.schemas import NotificationResponse


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: dict = Depends(get_current_user),
):
    notification_repo = NotificationRepo()
    notifications = await notification_repo.collection.find(
        {"volunteer_phone": current_user["phone"]}
    ).sort("created_at", -1).to_list(length=50)

    return [
        NotificationResponse(
            _id=str(n["_id"]),
            request_id=n["request_id"],
            volunteer_id=n.get("volunteer_id"),
            volunteer_phone=n["volunteer_phone"],
            status=n["status"],
            radius_km=n.get("radius_km", 5.0),
            created_at=n["created_at"],
        )
        for n in notifications
    ]