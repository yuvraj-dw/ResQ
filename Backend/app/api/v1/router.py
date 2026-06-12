from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.requests import router as requests_router
from app.api.v1.volunteers import router as volunteers_router
from app.api.v1.sms import router as sms_router
from app.api.v1.tracking import router as tracking_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.websocket import router as websocket_router


router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(requests_router)
router.include_router(volunteers_router)
router.include_router(sms_router)
router.include_router(tracking_router)
router.include_router(notifications_router)

ws_router = APIRouter()
ws_router.include_router(websocket_router)