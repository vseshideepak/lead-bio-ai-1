from functools import lru_cache
from pathlib import Path

import pandas as pd


# Project root:
# Lead_Research_Explorer/
PROJECT_ROOT = Path(__file__).resolve().parents[3]

CSV_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "soil_health_card"
    / "six_districts_soil_health_card.csv"
)

REQUIRED_COLUMNS = [
    "_id",
    "id",
    "year",
    "state_name",
    "state_code",
    "district_name",
    "district_code",
    "block_name",
    "block_code",
    "village_name",
    "village_code",
    "nutrient_type",
    "nutrient_name",
    "nutrient_level",
    "value",
]


@lru_cache(maxsize=1)
def load_soil_health_data():
    """
    Load the official Soil Health Card CSV.
    Cached to avoid reading the file on every API request.
    """

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Soil Health Card dataset not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Dataset is missing required columns: {missing_columns}"
        )

    # Clean text fields without changing the original classifications.
    text_columns = [
        "year",
        "state_name",
        "district_name",
        "block_name",
        "village_name",
        "nutrient_type",
        "nutrient_name",
        "nutrient_level",
    ]

    for column in text_columns:
        df[column] = df[column].astype("string").str.strip()

    # Ensure the reported value is numeric.
    df["value"] = pd.to_numeric(
        df["value"],
        errors="raise",
    )

    return df


def _matches(series, requested_value):
    """Case-insensitive exact matching for optional filters."""

    if not requested_value:
        return pd.Series(True, index=series.index)

    return (
        series.astype(str).str.casefold()
        == requested_value.strip().casefold()
    )


def get_soil_health_summary():
    df = load_soil_health_data()

    districts = (
        df.groupby("district_name")
        .size()
        .sort_index()
        .to_dict()
    )

    nutrients = sorted(
        df["nutrient_name"].dropna().unique().tolist()
    )

    nutrient_types = sorted(
        df["nutrient_type"].dropna().unique().tolist()
    )

    nutrient_levels = sorted(
        df["nutrient_level"].dropna().unique().tolist()
    )

    return {
        "dataset": "Soil Health Card",
        "state": "Telangana",
        "reporting_years": sorted(
            df["year"].dropna().unique().tolist()
        ),
        "total_records": int(len(df)),
        "total_districts": int(df["district_name"].nunique()),
        "total_blocks": int(df["block_name"].nunique()),
        "total_villages": int(df["village_name"].nunique()),
        "districts": [
            {
                "name": district,
                "records": int(count),
            }
            for district, count in districts.items()
        ],
        "nutrient_names": nutrients,
        "nutrient_types": nutrient_types,
        "nutrient_levels": nutrient_levels,
        "value_definition": (
            "Source-reported value. Its measurement definition "
            "and units have not yet been independently established."
        ),
        "source_file": CSV_PATH.name,
    }


def get_soil_health_filters(
    district_name=None,
    block_name=None,
):
    df = load_soil_health_data()

    filtered = df.copy()

    if district_name:
        filtered = filtered[
            _matches(filtered["district_name"], district_name)
        ]

    if block_name:
        filtered = filtered[
            _matches(filtered["block_name"], block_name)
        ]

    districts = sorted(
        df["district_name"].dropna().unique().tolist()
    )

    blocks = sorted(
        filtered["block_name"].dropna().unique().tolist()
    )

    villages = sorted(
        filtered["village_name"].dropna().unique().tolist()
    )

    return {
        "districts": districts,
        "blocks": blocks,
        "villages": villages,
        "nutrient_names": sorted(
            filtered["nutrient_name"].dropna().unique().tolist()
        ),
        "nutrient_types": sorted(
            filtered["nutrient_type"].dropna().unique().tolist()
        ),
        "nutrient_levels": sorted(
            filtered["nutrient_level"].dropna().unique().tolist()
        ),
    }


def get_soil_health_records(
    district_name=None,
    block_name=None,
    village_name=None,
    nutrient_name=None,
    nutrient_type=None,
):
    df = load_soil_health_data()

    filters = [
        ("district_name", district_name),
        ("block_name", block_name),
        ("village_name", village_name),
        ("nutrient_name", nutrient_name),
        ("nutrient_type", nutrient_type),
    ]

    filtered = df

    for column, requested_value in filters:
        if requested_value:
            filtered = filtered[
                _matches(filtered[column], requested_value)
            ]

    # Convert records to JSON-safe native Python values.
    records = filtered.to_json(
        orient="records",
        force_ascii=False,
    )

    import json

    records = json.loads(records)

    return {
        "total": len(records),
        "records": records,
        "filters_applied": {
            "district_name": district_name,
            "block_name": block_name,
            "village_name": village_name,
            "nutrient_name": nutrient_name,
            "nutrient_type": nutrient_type,
        },
    }