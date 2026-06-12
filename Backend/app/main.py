import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import connect_to_database, disconnect_from_database
from app.core.logging_config import setup_logging, RequestLoggingMiddleware, print_banner
from app.core.middleware import RateLimitMiddleware
from app.api.v1.router import router as v1_router, ws_router
from app.services.scheduler import scheduler


setup_logging()
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print_banner()
    logger.info("Starting ResQ server...")
    await connect_to_database()
    logger.info("Connected to MongoDB")
    await scheduler.start()
    logger.info("Radius expansion scheduler started (5min intervals)")
    logger.info("Server ready - listening for requests")
    yield
    logger.info("Shutting down ResQ server...")
    await scheduler.stop()
    await disconnect_from_database()
    logger.info("Disconnected from MongoDB")


app = FastAPI(
    title="ResQ - Emergency Response Platform",
    description="AI-powered emergency resource response platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)
app.include_router(ws_router)


@app.get("/")
def root_endpoint():
    return {"message": "ResQ - Emergency Response Platform API", "status": "ok"}


@app.get("/health")
async def health_check():
    from app.core.database import db
    try:
        await db.database.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
    }