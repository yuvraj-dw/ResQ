import httpx
import json
import logging
from typing import Optional
from app.core.config import settings
from app.schemas.schemas import AIParsedRequest


logger = logging.getLogger(__name__)


class AIParserService:
    def __init__(self):
        self.api_key = settings.DEEPINFRA_API_KEY
        self.model = settings.DEEPINFRA_MODEL
        self.base_url = settings.DEEPINFRA_BASE_URL
        self.system_prompt = settings.AI_SYSTEM_PROMPT

    async def parse_emergency_message(self, message: str) -> Optional[AIParsedRequest]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": message},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.1,
                    },
                )

            if response.status_code != 200:
                logger.warning(f"DeepInfra API error: {response.status_code} {response.text[:200]}")
                return None

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            parsed = json.loads(content)
            return AIParsedRequest(
                resource=parsed.get("resource"),
                blood_group=parsed.get("blood_group"),
                location_name=parsed.get("location_name"),
                urgency=parsed.get("urgency"),
            )
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse AI response: {e}")
            return None
        except Exception as e:
            logger.error(f"DeepInfra API call failed: {e}")
            return None