from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.in_silico_model import (
    TELANGANA_DISTRICTS,
    run_simulation,
)

router = APIRouter(
    prefix="/api/in-silico-lead-simulator",
    tags=["In-Silico Lead Simulator"],
)


class SimulationRequest(BaseModel):
    district: Optional[str] = None

    initial_total_pb_mg_kg: float = Field(ge=0)
    initial_extractable_pb_mg_kg: float = Field(ge=0)
    initial_leachable_pb_mg_kg: Optional[float] = Field(
        default=None, ge=0
    )

    rate_constant_per_year: float = Field(ge=0)
    horizon_years: int = Field(default=25, ge=1, le=25)
    treatment: str = "Unspecified scenario"

    soil_ph: Optional[float] = Field(default=None, ge=0, le=14)
    organic_carbon_percent: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    clay_percent: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    soil_temperature_c: Optional[float] = None
    soil_moisture_percent: Optional[float] = Field(
        default=None, ge=0, le=100
    )

    kd_l_kg: Optional[float] = Field(default=None, ge=0)
    soil_water_l_kg: Optional[float] = Field(default=None, ge=0)


@router.get("/districts")
def get_districts():
    return {
        "state": "Telangana",
        "district_count": len(TELANGANA_DISTRICTS),
        "districts": TELANGANA_DISTRICTS,
        "soil_measurement_status": (
            "District names are available; laboratory Pb and soil "
            "measurements must be supplied or imported from verified data."
        ),
    }


@router.get("/health")
def simulator_health():
    return {
        "status": "available",
        "model": "kinetic + optional partition",
        "maximum_horizon_years": 25,
        "ml_status": "not_ready",
    }


@router.post("/simulate")
def simulate(request: SimulationRequest):
    payload = request.model_dump()

    if payload.get("district"):
        if payload["district"] not in TELANGANA_DISTRICTS:
            raise HTTPException(
                status_code=422,
                detail="Select a valid Telangana district.",
            )

    try:
        return run_simulation(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc