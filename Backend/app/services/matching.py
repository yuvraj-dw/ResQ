from typing import List, Optional
from math import radians, sin, cos, asin, sqrt
from app.repositories.repositories import UserRepo, RequestRepo, NotificationRepo
from app.models.models import ResourceType, BloodGroup, RequestStatus, NotificationStatus
from app.core.config import settings


class MatchingService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.request_repo = RequestRepo()
        self.notification_repo = NotificationRepo()
        self.initial_radius = settings.MATCHING_INITIAL_RADIUS_KM
        self.max_radius = settings.MATCHING_MAX_RADIUS_KM
        self.radius_step = settings.MATCHING_RADIUS_STEP_KM

    async def find_matching_volunteers(
        self,
        request_id: str,
        coordinates: List[float],
        resource: ResourceType,
        blood_group: Optional[BloodGroup] = None,
        radius_km: float = None,
    ) -> List[dict]:
        radius_km = radius_km or self.initial_radius
        radius_meters = radius_km * 1000

        volunteers = await self.user_repo.find_nearby_volunteers(
            coordinates=coordinates,
            resource=resource,
            radius_meters=radius_meters,
            blood_group=blood_group if resource == ResourceType.BLOOD else None,
        )
        return volunteers

    async def expand_radius(self, request_id: str) -> Optional[List[dict]]:
        request = await self.request_repo.get_by_id(request_id)
        if not request:
            return None

        if request["status"] not in (RequestStatus.OPEN.value, RequestStatus.MATCHED.value):
            return None

        current_radius = request.get("current_radius_km", self.initial_radius)

        if current_radius >= self.max_radius:
            return None

        new_radius = current_radius + self.radius_step
        await self.request_repo.update(request_id, {"current_radius_km": new_radius})

        resource = ResourceType(request["resource"])
        blood_group = None
        if request.get("blood_group"):
            blood_group = BloodGroup(request["blood_group"])

        coordinates = request["location"]["coordinates"]

        volunteers = await self.find_matching_volunteers(
            request_id=request_id,
            coordinates=coordinates,
            resource=resource,
            blood_group=blood_group,
            radius_km=new_radius,
        )

        already_notified_phones = set()
        existing_notifications = await self.notification_repo.get_by_request(request_id)
        for n in existing_notifications:
            already_notified_phones.add(n.get("volunteer_phone"))

        new_volunteers = [
            v for v in volunteers if v["phone"] not in already_notified_phones
        ]

        return new_volunteers


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return 6371 * c