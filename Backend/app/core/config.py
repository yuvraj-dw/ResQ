from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "emergency_response"

    DEEPINFRA_API_KEY: str = ""
    DEEPINFRA_MODEL: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"
    DEEPINFRA_BASE_URL: str = "https://api.deepinfra.com/v1/openai"
    AI_SYSTEM_PROMPT: str = (
        "You are an emergency request parser. Extract structured data from "
        "unstructured emergency messages. Return ONLY valid JSON. "
        "Fields: resource (blood|transport|medicines|food|shelter), "
        "blood_group (A+|A-|B+|B-|AB+|AB-|O+|O-|null if not blood), "
        "location_name (extracted place name), "
        "urgency (critical|high|medium|low). "
        "If a field cannot be determined, set it to null."
    )

    SMS_GATE_BASE_URL: str = "https://api.sms-gate.app/3rdparty/v1"
    SMS_GATE_USERNAME: str = ""
    SMS_GATE_PASSWORD: str = ""
    SMS_GATE_SIGNING_KEY: str = ""
    SMS_GATE_DEVICE_ID: Optional[str] = None

    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"

    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6

    MATCHING_INITIAL_RADIUS_KM: float = 5.0
    MATCHING_MAX_RADIUS_KM: float = 20.0
    MATCHING_RADIUS_STEP_KM: float = 5.0
    MATCHING_EXPANSION_INTERVAL_SECONDS: int = 300

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()