
from math import exp, isfinite


def run_simulation(data: dict) -> dict:
    """
    Scenario-based lead partitioning and immobilization model.

    This is a mathematical scenario model, not a validated
    prediction of real-world microbial treatment performance.
    """

    total_pb = float(data["initial_total_pb"])
    extractable_pb = float(data["initial_extractable_pb"])
    leachable_pb = data.get("initial_leachable_pb")

    rate = float(data["rate_constant_per_year"])
    years = int(data["horizon_years"])

    if not all(isfinite(v) for v in (total_pb, extractable_pb, rate)):
        raise ValueError("All numerical inputs must be finite.")

    if total_pb < 0 or extractable_pb < 0 or rate < 0:
        raise ValueError("Lead concentrations and rate must be nonnegative.")

    if extractable_pb > total_pb:
        raise ValueError("Extractable Pb cannot exceed total Pb.")

    if years < 1 or years > 25:
        raise ValueError("Simulation horizon must be 1–25 years.")

    if leachable_pb is not None:
        leachable_pb = float(leachable_pb)
        if not isfinite(leachable_pb) or leachable_pb < 0:
            raise ValueError("Leachable Pb must be a nonnegative finite value.")

    trajectory = []

    for year in range(years + 1):
        remaining_extractable = extractable_pb * exp(-rate * year)

        modelled_immobilized = (
            extractable_pb - remaining_extractable
        )

        trajectory.append({
            "year": year,
            "total_pb_mg_kg": round(total_pb, 4),
            "extractable_pb_mg_kg": round(remaining_extractable, 4),
            "modelled_immobilized_pb_mg_kg": round(
                modelled_immobilized, 4
            ),
        })

    final = trajectory[-1]

    partition = None
    kd = data.get("kd_l_kg")
    water = data.get("soil_water_l_kg")

    if kd is not None and water is not None:
        kd = float(kd)
        water = float(water)

        if not isfinite(kd) or not isfinite(water):
            raise ValueError("Partition inputs must be finite.")

        if kd < 0 or water < 0:
            raise ValueError("Partition inputs must be nonnegative.")

        denominator = kd + water

        aqueous_fraction = (
            water / denominator if denominator > 0 else None
        )

        partition = {
            "kd_l_kg": kd,
            "soil_water_l_kg": water,
            "estimated_aqueous_fraction": (
                round(aqueous_fraction, 6)
                if aqueous_fraction is not None else None
            ),
            "interpretation": (
                "Screening partition estimate only; "
                "not a measured porewater Pb concentration."
            ),
        }

    return {
        "model_name": "First-order extractable lead scenario model",
        "district": data.get("district"),
        "treatment_label": data.get("treatment_label"),
        "horizon_years": years,
        "units": "mg/kg",
        "initial": {
            "total_pb_mg_kg": round(total_pb, 4),
            "extractable_pb_mg_kg": round(extractable_pb, 4),
            "leachable_pb_mg_kg": leachable_pb,
        },
        "final": {
            "total_pb_mg_kg": final["total_pb_mg_kg"],
            "extractable_pb_mg_kg": final["extractable_pb_mg_kg"],
            "modelled_immobilized_pb_mg_kg": (
                final["modelled_immobilized_pb_mg_kg"]
            ),
            "leachable_pb_mg_kg": None,
        },
        "trajectory": trajectory,
        "partition_screen": partition,
        "validation": {
            "status": "SCENARIO_ONLY_NOT_VALIDATED",
            "ml_prediction_ready": False,
            "limitations": [
                "The rate constant is a user-supplied scenario assumption.",
                "The model does not establish actual microbial treatment efficacy.",
                "Total lead remains constant in this closed-system model.",
                "Immobilized lead is a modelled pool, not a measured fraction.",
                "Future leachable lead is not predicted.",
                "No erosion, runoff, plant uptake, excavation, or external inputs are modelled.",
                "Real-world validation requires comparable longitudinal soil measurements."
            ],
        },
    }
