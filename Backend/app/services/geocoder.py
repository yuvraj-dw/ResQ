import httpx
from typing import Optional, Tuple
from app.core.config import settings


class GeocoderService:
    def __init__(self):
        self.base_url = settings.NOMINATIM_BASE_URL
        self.headers = {"User-Agent": "EmergencyResponsePlatform/1.0"}

    async def geocode(self, location_name: str) -> Optional[Tuple[float, float]]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            params = {
                "q": location_name,
                "format": "json",
                "limit": 1,
            }
            response = await client.get(
                f"{self.base_url}/search",
                params=params,
                headers=self.headers,
            )

        if response.status_code != 200:
            return None

        results = response.json()
        if not results:
            return None

        lat = float(results[0]["lat"])
        lon = float(results[0]["lon"])
        return (lon, lat)

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            params = {
                "lat": lat,
                "lon": lon,
                "format": "json",
            }
            response = await client.get(
                f"{self.base_url}/reverse",
                params=params,
                headers=self.headers,
            )

        if response.status_code != 200:
            return None

        data = response.json()
        return data.get("display_name", "")