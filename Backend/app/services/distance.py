from app.repositories.repositories import RequestRepo, UserRepo
from app.services.matching import haversine_km


class DistanceService:
    def __init__(self):
        self.request_repo = RequestRepo()
        self.user_repo = UserRepo()

    async def get_distance(self, request_id: str, volunteer_phone: str) -> dict:
        request = await self.request_repo.get_by_id(request_id)
        if not request or not request.get("location"):
            return {"distance_km": None}

        volunteer = await self.user_repo.get_by_phone(volunteer_phone)
        if not volunteer or not volunteer.get("location"):
            return {"distance_km": None}

        req_coords = request["location"]["coordinates"]
        vol_coords = volunteer["location"]["coordinates"]

        distance = haversine_km(
            lat1=req_coords[1], lon1=req_coords[0],
            lat2=vol_coords[1], lon2=vol_coords[0],
        )

        return {
            "request_id": request_id,
            "volunteer_phone": volunteer_phone,
            "distance_km": round(distance, 2),
        }

    async def update_volunteer_location(self, volunteer_phone: str, latitude: float, longitude: float) -> dict:
        location = {
            "type": "Point",
            "coordinates": [longitude, latitude],
        }
        from app.services.geocoder import GeocoderService
        geocoder = GeocoderService()
        location_name = await geocoder.reverse_geocode(latitude, longitude)

        await self.user_repo.update_location(volunteer_phone, location, location_name)

        volunteer = await self.user_repo.get_by_phone(volunteer_phone)
        return {
            "phone": volunteer_phone,
            "location": location,
            "location_name": location_name,
        }


distance_service = DistanceService()