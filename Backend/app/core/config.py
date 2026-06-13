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
        "unstructured emergency messages. Return ONLY valid JSON with NO markdown "
        "formatting or code fences. Output raw JSON only. "
        "Fields: resource (blood|transport|medicines|food|shelter), "
        "blood_group (A+|A-|B+|B-|AB+|AB-|O+|O-|null if not blood), "
        "location_name (extracted place name or locality, e.g. 'Anna Nagar, Chennai'), "
        "urgency (high|low). Classify as 'high' if the message suggests life-threatening, "
        "time-critical, or serious emergency. Classify as 'low' if the need is non-urgent, "
        "can wait, or is a minor inconvenience. "
        "If a field cannot be determined, set it to null."
    )

    AI_INSTRUCTION_PROMPT: str = (
        "You are an emergency first-aid advisor. Given the emergency type and details below, "
        "provide 2-3 short, practical instructions on what the person should do RIGHT NOW "
        "to stay safe and handle the situation while waiting for help. "
        "Keep it brief, clear, and actionable. No more than 3 sentences total. "
        "Return ONLY plain text, no formatting, no bullets, no numbers."
    )

    SMS_GATE_BASE_URL: str = "https://api.sms-gate.app/3rdparty/v1"
    SMS_GATE_USERNAME: str = ""
    SMS_GATE_PASSWORD: str = ""
    SMS_GATE_SIGNING_KEY: str = ""
    SMS_GATE_DEVICE_ID: Optional[str] = None
    BLOCKED_PHONE_NUMBERS: str = "+917725827021"

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

    @property
    def blocked_numbers_list(self) -> list:
        return [n.strip() for n in self.BLOCKED_PHONE_NUMBERS.split(",") if n.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()