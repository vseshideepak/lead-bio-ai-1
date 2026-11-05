
import json
import re
from functools import lru_cache
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.services.telangana_soil import get_districts
from app.services.soil_health_card import get_soil_health_filters


def normalize_district_name(name: str) -> str:
    """Normalize district names for matching."""
    return re.sub(r"[^a-z0-9]", "", name.casefold())


@lru_cache(maxsize=500)
def reverse_geocode(latitude: float, longitude: float):
    """
    Resolve coordinates through OpenStreetMap Nominatim.
    Coordinates are rounded before caching to avoid duplicate requests.
    """
    params = urlencode({
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 10,
    })

    url = f"https://nominatim.openstreetmap.org/reverse?{params}"

    request = Request(
        url,
        headers={
            "User-Agent": "LeadResearchExplorer/2.1 (research application)"
        },
    )

    with urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def detect_location(latitude: float, longitude: float):
    """Identify a Telangana district and check Soil Health Card coverage."""

    try:
        result = reverse_geocode(
            round(latitude, 4),
            round(longitude, 4),
        )
    except Exception as error:
        raise RuntimeError(
            f"Location lookup failed: {str(error)}"
        ) from error

    address = result.get("address", {})

    state = address.get("state", "")

    if normalize_district_name(state) not in {
        "telangana",
        "telangana state",
    }:
        return {
            "location_detected": True,
            "state": state or None,
            "district": None,
            "district_id": None,
            "district_matched": False,
            "soil_health_card_available": False,
            "message": "The detected location is outside Telangana.",
        }

    # Prioritize administrative district fields over city/locality names.
    candidates = [
        address.get("state_district"),
        address.get("county"),
        address.get("district"),
        address.get("city_district"),
        address.get("municipality"),
        address.get("city"),
        address.get("town"),
    ]

    registered_districts = get_districts()

    matched_district = None

    for candidate in candidates:
        if not candidate:
            continue

        normalized = normalize_district_name(candidate)

        matched_district = next(
            (
                district
                for district in registered_districts
                if normalize_district_name(district["name"]) == normalized
                or district["id"].replace("-", "") == normalized
            ),
            None,
        )

        if matched_district:
            break

    if not matched_district:
        return {
            "location_detected": True,
            "state": state,
            "district": None,
            "district_id": None,
            "district_matched": False,
            "soil_health_card_available": False,
            "message": (
                "Your location was detected, but the district "
                "could not be matched to the Telangana district registry."
            ),
        }

    try:
        available_districts = get_soil_health_filters()["districts"]
    except Exception:
        available_districts = []

    normalized_available = {
        normalize_district_name(name): name
        for name in available_districts
    }

    dataset_name = normalized_available.get(
        normalize_district_name(matched_district["name"])
    )

    available = dataset_name is not None

    return {
        "location_detected": True,
        "state": state,
        "district": matched_district["name"],
        "district_id": matched_district["id"],
        "district_matched": True,
        "soil_health_card_available": available,
        "dataset_district_name": dataset_name,
        "latitude": latitude,
        "longitude": longitude,
        "message": (
            "Soil Health Card records are available for this district."
            if available
            else (
                "The district was identified, but the current "
                "Soil Health Card dataset has no records for it."
            )
        ),
    }
