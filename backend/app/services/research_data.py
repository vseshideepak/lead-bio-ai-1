
from pathlib import Path
import pandas as pd

# Project root: Lead_Research_Explorer
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_FOLDER = PROJECT_ROOT / "data" / "raw"

CSV_FILE = DATA_FOLDER / "lead_bioremediation_100_papers_full.csv"
EXCEL_FILE = DATA_FOLDER / "lead_bioremediation_with_concentrations.xlsx"


def process_concentration_data(concentrations):
    """
    Clean concentration data and calculate removal efficiency
    only when the original efficiency value is missing.

    Existing reported efficiency values are preserved.
    """

    concentrations = concentrations.copy()

    numeric_columns = [
        "Initial Pb Concentration",
        "Final Pb Concentration",
        "pH",
        "Temperature (°C)",
    ]

    for column in numeric_columns:
        concentrations[column] = pd.to_numeric(
            concentrations[column],
            errors="coerce"
        )

    # Clean percentage strings such as 91.2%
    efficiency_column = "Removal Efficiency (%)"

    concentrations[efficiency_column] = (
        concentrations[efficiency_column]
        .astype("string")
        .str.replace("%", "", regex=False)
        .str.strip()
        .replace("", pd.NA)
    )

    concentrations[efficiency_column] = pd.to_numeric(
        concentrations[efficiency_column],
        errors="coerce"
    )

    # Calculate only missing efficiency values.
    initial = concentrations["Initial Pb Concentration"]
    final = concentrations["Final Pb Concentration"]

    valid = (
        initial.notna()
        & final.notna()
        & (initial > 0)
    )

    missing_efficiency = (
        concentrations[efficiency_column].isna()
        & valid
    )

    concentrations.loc[
        missing_efficiency,
        efficiency_column
    ] = (
        (initial[missing_efficiency] - final[missing_efficiency])
        / initial[missing_efficiency]
    ) * 100

    # Normalize concentration units without mixing them.
    concentrations["Concentration Units"] = (
        concentrations["Concentration Units"]
        .fillna("Unknown")
        .astype(str)
        .str.strip()
        .str.lower()
    )

    return concentrations


def load_research_data():
    """Load and process the literature CSV and concentration Excel."""

    if not CSV_FILE.exists():
        raise FileNotFoundError(
            f"CSV dataset not found: {CSV_FILE}"
        )

    if not EXCEL_FILE.exists():
        raise FileNotFoundError(
            f"Excel dataset not found: {EXCEL_FILE}"
        )

    papers = pd.read_csv(CSV_FILE)
    concentrations = pd.read_excel(EXCEL_FILE)

    concentrations = process_concentration_data(
        concentrations
    )

    return papers, concentrations


def get_dataset_summary():
    """Return dataset information for the dashboard."""

    papers, concentrations = load_research_data()

    units = (
        concentrations["Concentration Units"]
        .fillna("Unknown")
        .value_counts()
        .to_dict()
    )

    methods = (
        papers["Remediation_Method"]
        .fillna("Not specified")
        .value_counts()
        .to_dict()
    )

    organisms = (
        papers["Organism"]
        .fillna("Not specified")
        .value_counts()
        .to_dict()
    )

    return {
        "literature_records": int(len(papers)),
        "concentration_records": int(len(concentrations)),
        "csv_columns": list(papers.columns),
        "excel_columns": list(concentrations.columns),
        "concentration_units": {
            str(key): int(value) for key, value in units.items()
        },
        "remediation_methods": {
            str(key): int(value) for key, value in methods.items()
        },
        "organisms": {
            str(key): int(value) for key, value in organisms.items()
        },
        "verification_labels": {
            str(key): int(value)
            for key, value in concentrations[
                "Verification Status"
            ].fillna("Not specified").value_counts().items()
        }
    }


def get_literature_records():
    """Return literature records for the study evidence section."""

    papers, _ = load_research_data()

    papers = papers.where(pd.notna(papers), None)

    return papers.to_dict(orient="records")


def get_concentration_records(unit=None):
    """Return concentration records, optionally filtered by unit."""

    _, concentrations = load_research_data()

    if unit:
        concentrations = concentrations[
            concentrations["Concentration Units"].astype(str).str.lower()
            == unit.lower()
        ]

    concentrations = concentrations.where(
        pd.notna(concentrations), None
    )

    return concentrations.to_dict(orient="records")
