
import pandas as pd
import numpy as np

from app.services.research_data import get_concentration_records


def analyze_prediction_readiness() -> dict:
    """
    Assess whether the existing concentration dataset is suitable
    for predictive modelling.

    This function does not fabricate future measurements.
    """

    records = get_concentration_records()

    if not records:
        return {
            "ready": False,
            "message": "No concentration records are available.",
            "total_records": 0,
        }

    df = pd.DataFrame(records)

    required = [
        "Initial Pb Concentration",
        "Final Pb Concentration",
        "Concentration Units",
        "Verification Status",
    ]

    missing_columns = [
        column for column in required
        if column not in df.columns
    ]

    if missing_columns:
        return {
            "ready": False,
            "message": "Required dataset columns are missing.",
            "missing_columns": missing_columns,
        }

    df["Initial Pb Concentration"] = pd.to_numeric(
        df["Initial Pb Concentration"],
        errors="coerce",
    )

    df["Final Pb Concentration"] = pd.to_numeric(
        df["Final Pb Concentration"],
        errors="coerce",
    )

    df["Verification Status"] = (
        df["Verification Status"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
    )

    valid = df.dropna(
        subset=[
            "Initial Pb Concentration",
            "Final Pb Concentration",
            "Concentration Units",
        ]
    ).copy()

    valid = valid[
        (valid["Initial Pb Concentration"] > 0)
        & (valid["Final Pb Concentration"] >= 0)
    ]

    valid["Concentration Units"] = (
        valid["Concentration Units"]
        .fillna("Unknown")
        .astype(str)
        .str.strip()
    )

    unit_summary = (
        valid["Concentration Units"]
        .value_counts()
        .to_dict()
    )

    verified_labels = {
        "verified",
        "verified primary study",
        "primary study verified",
    }

    verified = valid[
        valid["Verification Status"].isin(verified_labels)
    ].copy()

    if len(verified) < 10:
        return {
            "ready": False,
            "total_records": len(records),
            "numeric_records": len(valid),
            "verified_records": len(verified),
            "unit_distribution": unit_summary,
            "message": (
                "Insufficient verified concentration records for "
                "a defensible predictive model. The available records "
                "can be explored descriptively, but a reliable "
                "long-term forecast cannot currently be established."
            ),
            "recommendation": (
                "Collect verified primary-study measurements with "
                "consistent units, soil matrix, treatment conditions "
                "and observation times."
            ),
        }

    return {
        "ready": False,
        "total_records": len(records),
        "numeric_records": len(valid),
        "verified_records": len(verified),
        "unit_distribution": unit_summary,
        "message": (
            "Some verified numerical records are available, but "
            "additional checks for comparable matrices, endpoints, "
            "study independence and time-series coverage are required "
            "before training a prediction model."
        ),
        "recommendation": (
            "Do not use a ten-year forecast until study-level "
            "validation and temporal data requirements are satisfied."
        ),
    }


def calculate_observed_reduction() -> dict:
    """
    Calculate descriptive concentration differences by unit.

    These values are not automatically equivalent to total soil Pb
    removal. The endpoint and matrix must be verified independently.
    """

    records = get_concentration_records()

    if not records:
        return {
            "total_records": 0,
            "groups": [],
        }

    df = pd.DataFrame(records)

    required = [
        "Initial Pb Concentration",
        "Final Pb Concentration",
        "Concentration Units",
    ]

    if any(column not in df.columns for column in required):
        return {
            "error": "Required concentration columns are missing."
        }

    df["Initial Pb Concentration"] = pd.to_numeric(
        df["Initial Pb Concentration"],
        errors="coerce",
    )

    df["Final Pb Concentration"] = pd.to_numeric(
        df["Final Pb Concentration"],
        errors="coerce",
    )

    df = df.dropna(subset=required)

    df = df[
        (df["Initial Pb Concentration"] > 0)
        & (df["Final Pb Concentration"] >= 0)
    ].copy()

    df["Observed concentration difference (%)"] = (
        (
            df["Initial Pb Concentration"]
            - df["Final Pb Concentration"]
        )
        / df["Initial Pb Concentration"]
    ) * 100

    groups = []

    for unit, group in df.groupby("Concentration Units"):
        groups.append({
            "unit": str(unit),
            "records": int(len(group)),
            "mean_observed_difference_percent": round(
                float(
                    group[
                        "Observed concentration difference (%)"
                    ].mean()
                ),
                2,
            ),
            "median_observed_difference_percent": round(
                float(
                    group[
                        "Observed concentration difference (%)"
                    ].median()
                ),
                2,
            ),
        })

    return {
        "total_numeric_records": int(len(df)),
        "groups": groups,
        "interpretation": (
            "Descriptive concentration differences only. They are "
            "not a validated prediction of future lead removal. "
            "Different matrices and endpoints must remain separate."
        ),
    }


def predict_soil_health() -> dict:
    """
    Soil-health prediction is unavailable unless measured soil-health
    indicators and suitable longitudinal data are supplied.
    """

    return {
        "ready": False,
        "message": (
            "The current concentration dataset alone does not establish "
            "soil-health trends."
        ),
        "required_measurements": [
            "Soil pH",
            "Electrical conductivity",
            "Organic carbon",
            "Available nitrogen",
            "Available phosphorus",
            "Available potassium",
            "Microbial biomass",
            "Soil enzyme activity",
            "Soil respiration",
            "Total lead concentration",
            "Extractable or leachable lead concentration",
        ],
        "recommendation": (
            "Collect repeated soil measurements before and after treatment "
            "to assess changes in soil health."
        ),
    }
