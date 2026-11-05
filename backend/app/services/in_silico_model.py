"""
In-Silico Lead Soil Simulator
Scenario model, not a validated long-term prediction.

The kinetic component represents transfer from an extractable Pb pool
to an assumed immobilized pool. Total Pb is conserved.

The partition component estimates aqueous Pb only when the user supplies
a measured Kd and soil-water content.
"""

from math import exp, isfinite
from typing import Optional


TELANGANA_DISTRICTS = [
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


def _finite_nonnegative(name: str, value: float) -> float:
    if not isfinite(value) or value < 0:
        raise ValueError(f"{name} must be a finite, non-negative number.")
    return value


def run_simulation(data: dict) -> dict:
    total_pb = _finite_nonnegative(
        "Initial total Pb", data["initial_total_pb_mg_kg"]
    )
    extractable_pb = _finite_nonnegative(
        "Initial extractable Pb", data["initial_extractable_pb_mg_kg"]
    )
    k = _finite_nonnegative(
        "Kinetic rate constant", data["rate_constant_per_year"]
    )

    if extractable_pb > total_pb:
        raise ValueError(
            "Extractable Pb cannot exceed total Pb when both are "
            "reported on the same dry-soil mg/kg basis."
        )

    horizon = int(data.get("horizon_years", 25))
    if horizon < 1 or horizon > 25:
        raise ValueError("Forecast horizon must be between 1 and 25 years.")

    initial_leachable = data.get("initial_leachable_pb_mg_kg")
    if initial_leachable is not None:
        initial_leachable = _finite_nonnegative(
            "Initial leachable Pb", initial_leachable
        )
        if initial_leachable > total_pb:
            raise ValueError("Leachable Pb cannot exceed total Pb.")

    trajectory = []

    for year in range(horizon + 1):
        # First-order scenario:
        # extractable(t) = extractable(0) * exp(-k*t)
        remaining_extractable = extractable_pb * exp(-k * year)

        # This is a modelled transfer, not destruction of Pb.
        transferred_to_immobilized = (
            extractable_pb - remaining_extractable
        )

        # Total Pb is conserved in this closed-system scenario.
        remaining_total = total_pb

        # This endpoint is not inferred from extractable Pb.
        # It is only shown as a separate field if an initial measurement
        # was supplied. No leaching rate is assumed.
        leachable_value = initial_leachable if year == 0 else None

        trajectory.append({
            "year": year,
            "total_pb_mg_kg": round(remaining_total, 6),
            "extractable_pb_mg_kg": round(remaining_extractable, 6),
            "modelled_immobilized_pool_mg_kg": round(
                transferred_to_immobilized, 6
            ),
            "leachable_pb_mg_kg": (
                round(leachable_value, 6)
                if leachable_value is not None else None
            ),
        })

    # Optional equilibrium partition estimate.
    # Kd: L/kg; soil water: L/kg dry soil.
    # Aqueous fraction = water / (Kd + water).
    partition = None
    kd = data.get("kd_l_kg")
    water = data.get("soil_water_l_kg")

    if kd is not None or water is not None:
        if kd is None or water is None:
            raise ValueError(
                "Enter both Kd and soil water content for the "
                "partition model, or leave both blank."
            )

        kd = _finite_nonnegative("Kd", kd)
        water = _finite_nonnegative("Soil water content", water)

        if kd + water <= 0:
            raise ValueError("Kd and soil water content cannot both be zero.")

        aqueous_fraction = water / (kd + water)

        partition = {
            "kd_l_kg": kd,
            "soil_water_l_kg": water,
            "estimated_aqueous_fraction": round(aqueous_fraction, 8),
            "estimated_aqueous_pb_mg_kg_soil": round(
                total_pb * aqueous_fraction, 6
            ),
            "interpretation": (
                "Equilibrium screening estimate using the supplied Kd "
                "and soil-water content. It is not a measured porewater "
                "concentration and does not replace leaching tests."
            ),
        }

    final = trajectory[-1]

    return {
        "project": "Lead Research Explorer",
        "model_name": "Kinetic + optional equilibrium partition model",
        "district": data.get("district"),
        "horizon_years": horizon,
        "treatment": data.get("treatment", "Unspecified scenario"),
        "inputs": data,
        "summary": {
            "initial_total_pb_mg_kg": round(total_pb, 6),
            "final_total_pb_mg_kg": final["total_pb_mg_kg"],
            "initial_extractable_pb_mg_kg": round(extractable_pb, 6),
            "final_extractable_pb_mg_kg": final[
                "extractable_pb_mg_kg"
            ],
            "modelled_transfer_to_immobilized_pool_mg_kg": final[
                "modelled_immobilized_pool_mg_kg"
            ],
            "extractable_pool_change_percent": round(
                (
                    (extractable_pb - final["extractable_pb_mg_kg"])
                    / extractable_pb * 100
                ) if extractable_pb > 0 else 0,
                4,
            ),
        },
        "trajectory": trajectory,
        "partition_model": partition,
        "ml_model": {
            "status": "not_ready",
            "reason": (
                "No validated, comparable longitudinal soil dataset "
                "has been connected for ML training."
            ),
        },
        "validation": {
            "status": "scenario_only",
            "mass_balance": "Total Pb is conserved in the kinetic model.",
            "limitations": [
                "The rate constant is an input, not an automatically "
                "validated biological parameter.",
                "The immobilized pool is a modelled transfer pool.",
                "No total Pb removal is assumed.",
                "Leachable Pb is not forecast from extractable Pb.",
                "The model does not account for erosion, runoff, "
                "plant uptake, excavation, or external Pb inputs.",
                "Long-term projections require repeated field or "
                "laboratory measurements for calibration and validation.",
            ],
        },
    }