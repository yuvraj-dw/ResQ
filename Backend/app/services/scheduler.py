import asyncio
import logging
from datetime import datetime, timezone
from app.repositories.repositories import RequestRepo
from app.services.matching import MatchingService
from app.services.notification_service import notification_service
from app.services.sms_service import sms_service
from app.models.models import RequestStatus
from app.core.config import settings


logger = logging.getLogger(__name__)


class RadiusExpansionScheduler:
    def __init__(self):
        self.request_repo = RequestRepo()
        self.matching_service = MatchingService()
        self._task = None

    async def expand_open_requests(self):
        while True:
            try:
                await self._process_expansion()
            except Exception as e:
                logger.error(f"Radius expansion error: {e}")
            await asyncio.sleep(settings.MATCHING_EXPANSION_INTERVAL_SECONDS)

    async def _process_expansion(self):
        open_requests = await self.request_repo.collection.find(
            {
                "status": {"$in": [RequestStatus.OPEN.value, RequestStatus.MATCHED.value]},
                "current_radius_km": {"$lt": settings.MATCHING_MAX_RADIUS_KM},
            }
        ).to_list(length=100)

        if not open_requests:
            return

        logger.info(f"Processing radius expansion for {len(open_requests)} requests")

        for req in open_requests:
            try:
                await self._expand_single_request(req)
            except Exception as e:
                logger.error(f"Error expanding request {req['_id']}: {e}")

    async def _expand_single_request(self, req: dict):
        request_id = str(req["_id"])
        current_radius = req.get("current_radius_km", settings.MATCHING_INITIAL_RADIUS_KM)

        new_volunteers = await self.matching_service.expand_radius(request_id)
        if new_volunteers is None:
            return

        if not new_volunteers:
            await sms_service.send_search_expanded(
                phone=req["requester_phone"],
                radius_km=current_radius + settings.MATCHING_RADIUS_STEP_KM,
            )
            return

        resource = req.get("resource", "")
        urgency = req.get("urgency", "high")
        location_name = req.get("location_name", "unknown location")

        await notification_service.notify_volunteers(
            request_id=request_id,
            volunteers=new_volunteers,
            resource=resource,
            urgency=urgency,
            location_name=location_name,
        )

        await self.request_repo.update_status(request_id, RequestStatus.MATCHED)
        logger.info(
            f"Expanded request {request_id} from {current_radius}km, "
            f"found {len(new_volunteers)} new volunteers"
        )

    async def start(self):
        logger.info("Starting radius expansion scheduler")
        self._task = asyncio.create_task(self.expand_open_requests())

    async def stop(self):
        if self._task:
            self._task.cancel()
            logger.info("Radius expansion scheduler stopped")


scheduler = RadiusExpansionScheduler()