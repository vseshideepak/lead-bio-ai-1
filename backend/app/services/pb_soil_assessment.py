
from pathlib import Path
import json
import sqlite3
from datetime import datetime, timezone


# ==========================================================
# DATABASE CONFIGURATION
# ==========================================================

DATABASE_PATH = Path(
    r"C:\Users\DELL\.leadbio\database\leadbio.sqlite3"
)

TABLE_NAME = "pb_soil_assessments"


# ==========================================================
# SUPPORTED SOIL MEASUREMENTS
# ==========================================================

MEASUREMENT_FIELDS = {
    "soil_ph": {
        "label": "Soil pH",
        "default_unit": "pH",
        "maximum": 14,
    },
    "electrical_conductivity": {
        "label": "Electrical conductivity",
        "default_unit": "dS/m",
    },
    "organic_carbon": {
        "label": "Organic carbon",
        "default_unit": "%",
    },
    "available_nitrogen": {
        "label": "Available nitrogen",
        "default_unit": "mg/kg",
    },
    "available_phosphorus": {
        "label": "Available phosphorus",
        "default_unit": "mg/kg",
    },
    "available_potassium": {
        "label": "Available potassium",
        "default_unit": "mg/kg",
    },
    "microbial_biomass": {
        "label": "Microbial biomass",
        "default_unit": None,
    },
    "enzyme_activity": {
        "label": "Soil enzyme activity",
        "default_unit": None,
    },
    "soil_respiration": {
        "label": "Soil respiration",
        "default_unit": None,
    },
    "total_pb": {
        "label": "Total lead",
        "default_unit": "mg/kg",
    },
    "extractable_pb": {
        "label": "Extractable lead",
        "default_unit": "mg/kg",
    },
    "leachable_pb": {
        "label": "Leachable lead",
        "default_unit": "mg/kg",
    },
}


# ==========================================================
# DATABASE INITIALIZATION
# ==========================================================

def get_connection():
    DATABASE_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=30,
    )

    connection.row_factory = sqlite3.Row

    return connection


def initialize_assessment_table():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS pb_soil_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_id TEXT NOT NULL,
                sample_id TEXT NOT NULL,
                sampling_stage TEXT NOT NULL,
                sample_date TEXT NOT NULL,
                district TEXT,
                location TEXT,
                treatment TEXT,
                replicate TEXT,
                soil_depth_cm REAL,
                measurements_json TEXT NOT NULL,
                units_json TEXT NOT NULL,
                methods_json TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_pb_assessment_experiment
            ON pb_soil_assessments(experiment_id)
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_pb_assessment_sample
            ON pb_soil_assessments(sample_id)
            """
        )


# ==========================================================
# INPUT VALIDATION
# ==========================================================

def validate_assessment(payload):
    measurements = payload.get("measurements", {})
    units = payload.get("units", {})

    if not isinstance(measurements, dict):
        raise ValueError("Measurements must be a dictionary.")

    if not isinstance(units, dict):
        raise ValueError("Units must be a dictionary.")

    unknown_fields = set(measurements) - set(MEASUREMENT_FIELDS)

    if unknown_fields:
        raise ValueError(
            f"Unsupported measurement fields: "
            f"{', '.join(sorted(unknown_fields))}"
        )

    if not measurements:
        raise ValueError(
            "At least one soil measurement is required."
        )

    for field, value in measurements.items():
        if value is None:
            continue

        if isinstance(value, bool) or not isinstance(
            value, (int, float)
        ):
            raise ValueError(
                f"{field} must be a numeric value."
            )

        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError(
                f"{field} must be a finite number."
            )

        if value < 0:
            raise ValueError(
                f"{field} cannot be negative."
            )

        maximum = MEASUREMENT_FIELDS[field].get("maximum")

        if maximum is not None and value > maximum:
            raise ValueError(
                f"{field} cannot exceed {maximum}."
            )

        if not units.get(field):
            raise ValueError(
                f"Please provide the measurement unit for {field}."
            )

    for field in units:
        if field not in MEASUREMENT_FIELDS:
            raise ValueError(
                f"Unsupported unit field: {field}"
            )

    return measurements, units


# ==========================================================
# SAVE EXPERIMENTAL SOIL ASSESSMENT
# ==========================================================

def save_pb_assessment(payload):
    initialize_assessment_table()

    experiment_id = str(
        payload.get("experiment_id", "")
    ).strip()

    sample_id = str(
        payload.get("sample_id", "")
    ).strip()

    sampling_stage = str(
        payload.get("sampling_stage", "")
    ).strip().lower()

    sample_date = str(
        payload.get("sample_date", "")
    ).strip()

    if not experiment_id or not sample_id:
        raise ValueError(
            "Experiment ID and sample ID are required."
        )

    allowed_stages = {
        "initial",
        "final",
        "intermediate",
        "control",
    }

    if sampling_stage not in allowed_stages:
        raise ValueError(
            "Sampling stage must be initial, final, "
            "intermediate, or control."
        )

    try:
        datetime.fromisoformat(sample_date)
    except ValueError:
        raise ValueError(
            "Sample date must use ISO format, "
            "for example 2026-11-02."
        )

    measurements, units = validate_assessment(payload)

    methods = payload.get("methods", {})

    if not isinstance(methods, dict):
        raise ValueError("Methods must be a dictionary.")

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO pb_soil_assessments (
                experiment_id,
                sample_id,
                sampling_stage,
                sample_date,
                district,
                location,
                treatment,
                replicate,
                soil_depth_cm,
                measurements_json,
                units_json,
                methods_json,
                notes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                experiment_id,
                sample_id,
                sampling_stage,
                sample_date,
                payload.get("district"),
                payload.get("location"),
                payload.get("treatment"),
                payload.get("replicate"),
                payload.get("soil_depth_cm"),
                json.dumps(measurements),
                json.dumps(units),
                json.dumps(methods),
                payload.get("notes"),
                created_at,
            ),
        )

        record_id = cursor.lastrowid

    return {
        "success": True,
        "record_id": record_id,
        "experiment_id": experiment_id,
        "sample_id": sample_id,
        "sampling_stage": sampling_stage,
        "message": "Soil assessment record saved successfully.",
    }


# ==========================================================
# RETRIEVE EXPERIMENTAL RECORDS
# ==========================================================

def get_pb_assessment_records(
    limit=100,
    experiment_id=None,
):
    initialize_assessment_table()

    if limit < 1 or limit > 1000:
        raise ValueError(
            "Limit must be between 1 and 1000."
        )

    query = """
        SELECT *
        FROM pb_soil_assessments
    """

    parameters = []

    if experiment_id:
        query += " WHERE experiment_id = ?"
        parameters.append(experiment_id)

    query += " ORDER BY sample_date DESC, id DESC LIMIT ?"
    parameters.append(limit)

    with get_connection() as connection:
        rows = connection.execute(
            query,
            parameters,
        ).fetchall()

    records = []

    for row in rows:
        record = dict(row)

        record["measurements"] = json.loads(
            record.pop("measurements_json")
        )

        record["units"] = json.loads(
            record.pop("units_json")
        )

        record["methods"] = json.loads(
            record.pop("methods_json")
        )

        records.append(record)

    return {
        "total": len(records),
        "records": records,
    }


# ==========================================================
# DATASET SUMMARY
# ==========================================================

def get_pb_assessment_summary():
    initialize_assessment_table()

    with get_connection() as connection:
        total = connection.execute(
            "SELECT COUNT(*) FROM pb_soil_assessments"
        ).fetchone()[0]

        experiments = connection.execute(
            """
            SELECT COUNT(DISTINCT experiment_id)
            FROM pb_soil_assessments
            """
        ).fetchone()[0]

        samples = connection.execute(
            """
            SELECT COUNT(DISTINCT sample_id)
            FROM pb_soil_assessments
            """
        ).fetchone()[0]

        stages = connection.execute(
            """
            SELECT sampling_stage, COUNT(*) AS count
            FROM pb_soil_assessments
            GROUP BY sampling_stage
            """
        ).fetchall()

    return {
        "total_records": total,
        "total_experiments": experiments,
        "total_samples": samples,
        "sampling_stages": {
            row["sampling_stage"]: row["count"]
            for row in stages
        },
        "supported_measurements": MEASUREMENT_FIELDS,
        "data_source": "User-entered experimental measurements",
        "scientific_note": (
            "Records are observational inputs. "
            "No treatment effectiveness or soil-health "
            "improvement is inferred from missing measurements."
        ),
    }
# ==========================================================
# BEFORE-AND-AFTER TREATMENT COMPARISON
# ==========================================================

def compare_pb_treatment(
    experiment_id,
    treatment=None,
):
    initialize_assessment_table()

    if not experiment_id or not str(experiment_id).strip():
        raise ValueError("Experiment ID is required.")

    query = """
        SELECT *
        FROM pb_soil_assessments
        WHERE experiment_id = ?
        ORDER BY sample_date, id
    """

    parameters = [experiment_id]

    with get_connection() as connection:
        rows = connection.execute(
            query,
            parameters,
        ).fetchall()

    records = [dict(row) for row in rows]

    if treatment is not None:
        records = [
            record for record in records
            if record["treatment"] == treatment
        ]

    # Pair records by treatment and replicate.
    # Replicate identifiers are required to avoid comparing
    # unrelated initial and final samples.
    groups = {}

    for record in records:
        replicate = record["replicate"]

        if not replicate:
            continue

        key = (
            record["treatment"] or "",
            replicate,
        )

        groups.setdefault(key, {
            "initial": [],
            "final": [],
        })

        stage = record["sampling_stage"]

        if stage in ("initial", "final"):
            record["measurements"] = json.loads(
                record.pop("measurements_json")
            )
            record["units"] = json.loads(
                record.pop("units_json")
            )
            record["methods"] = json.loads(
                record.pop("methods_json")
            )
            groups[key][stage].append(record)

    comparisons = []
    unmatched_initial = 0
    unmatched_final = 0

    for (treatment_name, replicate), stages in groups.items():
        initial_records = stages["initial"]
        final_records = stages["final"]

        unmatched_initial += max(
            0, len(initial_records) - len(final_records)
        )
        unmatched_final += max(
            0, len(final_records) - len(initial_records)
        )

        for initial, final in zip(
            initial_records,
            final_records,
        ):
            parameter_results = {}

            common_fields = (
                set(initial["measurements"])
                & set(final["measurements"])
            )

            for field in sorted(common_fields):
                initial_value = initial["measurements"][field]
                final_value = final["measurements"][field]

                if initial_value is None or final_value is None:
                    continue

                initial_unit = initial["units"].get(field)
                final_unit = final["units"].get(field)

                if not initial_unit or initial_unit != final_unit:
                    continue

                initial_method = initial["methods"].get(field)
                final_method = final["methods"].get(field)

                if (
                    initial_method
                    and final_method
                    and initial_method != final_method
                ):
                    continue

                absolute_change = final_value - initial_value

                percentage_change = None

                if initial_value != 0:
                    percentage_change = (
                        absolute_change / abs(initial_value)
                    ) * 100

                result = {
                    "label": MEASUREMENT_FIELDS[field]["label"],
                    "initial": initial_value,
                    "final": final_value,
                    "absolute_change": absolute_change,
                    "percentage_change": percentage_change,
                    "unit": initial_unit,
                }

                if field in {
                    "total_pb",
                    "extractable_pb",
                    "leachable_pb",
                }:
                    result["interpretation"] = (
                        "decrease"
                        if final_value < initial_value
                        else "increase"
                        if final_value > initial_value
                        else "no change"
                    )

                    result["reduction_percentage"] = (
                        (
                            (initial_value - final_value)
                            / initial_value
                        ) * 100
                        if initial_value > 0
                        else None
                    )

                elif field == "soil_ph":
                    result["interpretation"] = (
                        "pH change; assess against the study's "
                        "soil-specific target range"
                    )

                else:
                    result["interpretation"] = (
                        "measured change; biological or agronomic "
                        "benefit requires context-specific evaluation"
                    )

                parameter_results[field] = result

            comparisons.append({
                "experiment_id": experiment_id,
                "treatment": treatment_name or None,
                "replicate": replicate,
                "initial_sample_id": initial["sample_id"],
                "final_sample_id": final["sample_id"],
                "initial_date": initial["sample_date"],
                "final_date": final["sample_date"],
                "parameters": parameter_results,
            })

    return {
        "experiment_id": experiment_id,
        "treatment_filter": treatment,
        "matched_replicate_pairs": len(comparisons),
        "unmatched_initial_records": unmatched_initial,
        "unmatched_final_records": unmatched_final,
        "comparisons": comparisons,
        "scientific_note": (
            "Comparisons are paired by treatment and replicate. "
            "Parameters are compared only when units match and, "
            "when both are supplied, analytical methods match. "
            "A decrease in extractable or leachable Pb does not "
            "establish a decrease in total soil Pb. A decrease in "
            "total Pb alone does not prove net removal without "
            "appropriate soil-mass and mass-balance evidence."
        ),
    }
# ==========================================================
# MULTI-TREATMENT ANALYSIS
# ==========================================================

def get_multi_treatment_analysis(experiment_id):
    from statistics import mean, stdev

    initialize_assessment_table()

    if not experiment_id or not str(experiment_id).strip():
        raise ValueError("Experiment ID is required.")

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT DISTINCT treatment
            FROM pb_soil_assessments
            WHERE experiment_id = ?
            ORDER BY treatment
            """,
            (experiment_id,),
        ).fetchall()

    treatments = [
        row["treatment"]
        for row in rows
        if row["treatment"]
    ]

    treatment_results = []

    for treatment_name in treatments:
        comparison = compare_pb_treatment(
            experiment_id=experiment_id,
            treatment=treatment_name,
        )

        parameter_groups = {}

        for pair in comparison["comparisons"]:
            for field, result in pair["parameters"].items():
                parameter_groups.setdefault(field, {
                    "label": result["label"],
                    "unit": result["unit"],
                    "initial": [],
                    "final": [],
                    "changes": [],
                })

                group = parameter_groups[field]

                group["initial"].append(result["initial"])
                group["final"].append(result["final"])
                group["changes"].append(
                    result["absolute_change"]
                )

        parameter_summary = {}

        for field, group in parameter_groups.items():
            initial_mean = mean(group["initial"])
            final_mean = mean(group["final"])
            change_mean = mean(group["changes"])

            percentage_change = None

            if initial_mean != 0:
                percentage_change = (
                    change_mean / abs(initial_mean)
                ) * 100

            result = {
                "label": group["label"],
                "unit": group["unit"],
                "matched_replicates": len(group["changes"]),
                "mean_initial": initial_mean,
                "mean_final": final_mean,
                "mean_absolute_change": change_mean,
                "mean_percentage_change": percentage_change,
                "standard_deviation_of_paired_changes": (
                    stdev(group["changes"])
                    if len(group["changes"]) >= 2
                    else None
                ),
            }

            if field in {
                "total_pb",
                "extractable_pb",
                "leachable_pb",
            }:
                result["mean_reduction_percentage"] = (
                    (
                        (initial_mean - final_mean)
                        / initial_mean
                    ) * 100
                    if initial_mean > 0
                    else None
                )

                result["interpretation"] = {
                    "total_pb": (
                        "Total Pb concentration change; "
                        "net removal requires soil-mass "
                        "and mass-balance evidence."
                    ),
                    "extractable_pb": (
                        "Change in extractable Pb; does not "
                        "by itself establish total Pb removal."
                    ),
                    "leachable_pb": (
                        "Change in leachable Pb; interpret "
                        "using the specified leaching protocol."
                    ),
                }[field]

            parameter_summary[field] = result

        treatment_results.append({
            "treatment": treatment_name,
            "matched_replicate_pairs": (
                comparison["matched_replicate_pairs"]
            ),
            "unmatched_initial_records": (
                comparison["unmatched_initial_records"]
            ),
            "unmatched_final_records": (
                comparison["unmatched_final_records"]
            ),
            "parameters": parameter_summary,
        })

    return {
        "experiment_id": experiment_id,
        "treatment_groups_found": len(treatments),
        "treatments": treatment_results,
        "scientific_note": (
            "Treatment summaries use matched initial-final "
            "replicate pairs. Means are descriptive, not proof "
            "of treatment efficacy. Treatment groups should be "
            "compared with appropriate controls and adequate "
            "replication. Pb endpoints remain separate."
        ),
    }