
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.in_silico_model import run_simulation


router = APIRouter(
    prefix="/api/in-silico-lead-simulator",
    tags=["In-Silico Lead Simulator"],
)


DISTRICTS = [
    "Adilabad",
    "Bhadradri Kothagudem",
    "Hanumakonda",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Khammam",
    "Kumuram Bheem Asifabad",
    "Mahabubabad",
    "Mahabubnagar",
    "Mancherial",
    "Medak",
    "Medchal-Malkajgiri",
    "Mulugu",
    "Nagarkurnool",
    "Nalgonda",
    "Narayanpet",
    "Nirmal",
    "Nizamabad",
    "Peddapalli",
    "Rajanna Sircilla",
    "Rangareddy",
    "Sangareddy",
    "Siddipet",
    "Suryapet",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Yadadri Bhuvanagiri",
]


class SimulationRequest(BaseModel):
    district: str = "Medchal-Malkajgiri"

    # Initial lead concentrations (mg/kg dry soil)
    initial_total_pb_mg_kg: float = Field(ge=0)
    initial_extractable_pb_mg_kg: float = Field(ge=0)
    initial_leachable_pb_mg_kg: Optional[float] = Field(
        default=None, ge=0
    )

    # Kinetic scenario
    rate_constant_per_year: float = Field(ge=0, le=5)
    horizon_years: int = Field(default=25, ge=1, le=25)
    treatment: str = "Microbial immobilization scenario"

    # Optional soil characteristics
    soil_ph: Optional[float] = Field(default=None, ge=0, le=14)
    organic_carbon_percent: Optional[float] = Field(
        default=None, ge=0
    )
    clay_percent: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    soil_temperature_c: Optional[float] = None
    soil_moisture_percent: Optional[float] = Field(
        default=None, ge=0, le=100
    )

    # Optional equilibrium partition parameters
    kd_l_kg: Optional[float] = Field(default=None, ge=0)
    soil_water_l_kg: Optional[float] = Field(default=None, ge=0)


@router.get("/health")
def simulator_health():
    return {
        "status": "healthy",
        "service": "In-Silico Lead Simulator",
        "model_status": "scenario_only_not_validated",
    }


@router.get("/districts")
def get_districts():
    return {
        "count": len(DISTRICTS),
        "districts": DISTRICTS,
    }


@router.post("/simulate")
def simulate(request: SimulationRequest):
    payload = request.model_dump()

    if payload["district"] not in DISTRICTS:
        raise HTTPException(
            status_code=422,
            detail="Please select a valid Telangana district.",
        )

    try:
        return run_simulation(payload)

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except (KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Simulator configuration error: {exc}",
        ) from exc
