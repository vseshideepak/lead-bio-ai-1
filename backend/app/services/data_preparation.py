
from pathlib import Path
import re

import numpy as np
import pandas as pd

from app.services.research_data import load_research_data


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_DATA_FOLDER = PROJECT_ROOT / "data" / "processed"

TARGET_COLUMN = "Removal Efficiency (%)"
TEMPERATURE_COLUMN = "Temperature_C"

REQUIRED_COLUMNS = [
    "Microorganism",
    "Bioremediation Mechanism",
    "Soil Type",
    "Lead Contamination Source",
    "Initial Pb Concentration",
    "Final Pb Concentration",
    "Concentration Units",
    "pH",
    "Treatment Duration",
    TARGET_COLUMN,
    "Primary-Paper DOI / Reference",
    "Verification Status",
]


def parse_duration_days(value):
    """Convert treatment duration into days."""

    if pd.isna(value):
        return np.nan

    text = str(value).strip().lower()
    match = re.search(r"(\d+(?:\.\d+)?)", text)

    if not match:
        return np.nan

    number = float(match.group(1))

    if "hour" in text or "hr" in text:
        return number / 24

    if "week" in text:
        return number * 7

    if "month" in text:
        return number * 30

    if "year" in text:
        return number * 365

    return number


def find_temperature_column(columns):
    """Find the temperature column without relying on ° encoding."""

    candidates = [
        column
        for column in columns
        if str(column).strip().lower().startswith("temperature")
    ]

    if len(candidates) != 1:
        raise ValueError(
            "Expected exactly one temperature column. "
            f"Found: {candidates}"
        )

    return candidates[0]


def normalize_unit(value):
    """Normalize concentration units without mixing their meanings."""

    if pd.isna(value):
        return None

    text = str(value).strip().lower()
    text = text.replace(" ", "")

    aliases = {
        "mg/kg": "mg/kg",
        "mgkg-1": "mg/kg",
        "mgkg⁻¹": "mg/kg",
        "mg/l": "mg/l",
        "mgl-1": "mg/l",
        "mgl⁻¹": "mg/l",
    }

    return aliases.get(text)


def prepare_concentration_dataset(unit=None, return_audit=False):
    """
    Prepare experimental records for exploratory ML.

    Target:
        Removal Efficiency (%)

    Inputs:
        Microorganism, mechanism, soil type, contamination source,
        initial Pb concentration, pH, temperature and duration.

    Final Pb concentration is never a model input.

    mg/kg and mg/L datasets are kept separate.
    """

    _, concentrations = load_research_data()

    data = concentrations.copy()

    # Resolve temperature column despite Unicode encoding differences.
    original_temperature_column = find_temperature_column(data.columns)

    data = data.rename(
        columns={original_temperature_column: TEMPERATURE_COLUMN}
    )

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in data.columns
    ]

    if missing:
        raise ValueError(
            f"Missing required dataset columns: {missing}"
        )

    audit = {
        "original_records": int(len(data))
    }


    # Convert numeric fields.
    numeric_columns = [
        "Initial Pb Concentration",
        "Final Pb Concentration",
        "pH",
        TEMPERATURE_COLUMN,
        TARGET_COLUMN,
    ]
    for column in numeric_columns:
        data[column] = pd.to_numeric(
            data[column],
            errors="coerce"
        )

    data["Duration_Days"] = (
        data["Treatment Duration"].apply(parse_duration_days)
    )

    data["Concentration Units"] = (
        data["Concentration Units"].apply(normalize_unit)
    )

    data["DOI"] = (
        data["Primary-Paper DOI / Reference"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    categorical_columns = [
        "Microorganism",
        "Bioremediation Mechanism",
        "Soil Type",
        "Lead Contamination Source",
    ]

    for column in categorical_columns:
        data[column] = (
            data[column]
            .fillna("Unknown")
            .astype(str)
            .str.strip()
        )

    audit["valid_numeric_and_reference_records"] = int(
        data.dropna(
            subset=[
                "Initial Pb Concentration",
                "Final Pb Concentration",
                "pH",
                TEMPERATURE_COLUMN,
                "Duration_Days",
                TARGET_COLUMN,
            ]
        )["DOI"].ne("").sum()
    )

    # Remove records with unusable experimental values.
    data = data.dropna(
        subset=[
            "Initial Pb Concentration",
            "Final Pb Concentration",
            "pH",
            TEMPERATURE_COLUMN,
            "Duration_Days",
            TARGET_COLUMN,
        ]
    ).copy()

    data = data[data["DOI"].ne("")].copy()

    audit["after_missing_value_filter"] = int(len(data))

    # Apply physical and numerical validity checks.
    data = data[
        (data["Initial Pb Concentration"] > 0)
        & (data["Final Pb Concentration"] >= 0)
        & (data[TARGET_COLUMN] >= 0)
        & (data[TARGET_COLUMN] <= 100)
        & (data["pH"] >= 0)
        & (data["pH"] <= 14)
        & (data[TEMPERATURE_COLUMN] > 0)
        & (data["Duration_Days"] > 0)
    ].copy()

    audit["after_validity_filter"] = int(len(data))

    # Keep one record per study reference.
    data = data.drop_duplicates(
        subset=["DOI"],
        keep="first"
    ).copy()

    audit["after_duplicate_reference_filter"] = int(len(data))

    # Keep concentration units separate.
    if unit is not None:
        normalized_unit = normalize_unit(unit)

        if normalized_unit is None:
            raise ValueError(
                "Unit must be mg/kg or mg/L."
            )

        data = data[
            data["Concentration Units"] == normalized_unit
        ].copy()

    audit["after_unit_filter"] = int(len(data))

    if data.empty:
        if return_audit:
            return data, audit
        return data
    # Check reported efficiency against initial/final concentrations.
    calculated_efficiency = (
        (
            data["Initial Pb Concentration"]
            - data["Final Pb Concentration"]
        )
        / data["Initial Pb Concentration"]
    ) * 100

    data["Efficiency_Check_Difference"] = (
        data[TARGET_COLUMN] - calculated_efficiency
    ).abs()

    # Only pre-treatment variables are used as model inputs.
    feature_columns = [
        "Microorganism",
        "Bioremediation Mechanism",
        "Soil Type",
        "Lead Contamination Source",
        "Initial Pb Concentration",
        "pH",
        TEMPERATURE_COLUMN,
        "Duration_Days",
    ]

    result = data[
        feature_columns
        + [
            TARGET_COLUMN,
            "DOI",
            "Concentration Units",
            "Verification Status",
            "Efficiency_Check_Difference",
        ]
    ].copy()

    result = result.replace(
        [np.inf, -np.inf],
        np.nan
    ).dropna()

    audit["final_records"] = int(len(result))
    audit["unique_studies"] = int(result["DOI"].nunique())

    if return_audit:
        return result, audit

    return result


def get_ml_dataset_summary():
    """Return dataset counts and preparation audit information."""

    units = ["mg/kg", "mg/l"]
    unit_summaries = {}

    for unit in units:
        data, audit = prepare_concentration_dataset(
            unit,
            return_audit=True
        )

        unit_summaries[unit] = {
            "records": int(len(data)),
            "unique_studies": int(data["DOI"].nunique())
            if not data.empty else 0,
            "mean_efficiency": round(
                float(data[TARGET_COLUMN].mean()), 2
            ) if not data.empty else None,
            "mean_consistency_difference": round(
                float(data["Efficiency_Check_Difference"].mean()), 4
            ) if not data.empty else None,
            "audit": audit,
        }

    return {
        "dataset": "Lead bioremediation experimental records",
        "target": TARGET_COLUMN,
        "feature_count": 8,
        "features": [
            "Microorganism",
            "Bioremediation Mechanism",
            "Soil Type",
            "Lead Contamination Source",
            "Initial Pb Concentration",
            "pH",
            "Temperature_C",
            "Duration_Days",
        ],
        "excluded_from_features": [
            "Final Pb Concentration",
            TARGET_COLUMN,
            "DOI",
            "Verification Status",
        ],
        "unit_specific_datasets": unit_summaries,
        "scientific_status": (
            "Exploratory; source-level validation required"
        ),
    }
