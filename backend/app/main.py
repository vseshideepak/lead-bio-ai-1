
from pathlib import Path
from importlib import import_module
import sqlite3
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException, Query  # type: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[reportMissingImports]
from pydantic import BaseModel, Field  # type: ignore[reportMissingImports]
try:
    in_silico_simulator_router = import_module(
        "app.routers.in_silico_simulator"
    ).router
except ModuleNotFoundError as exc:
    if exc.name != "app.routers.in_silico_simulator":
        raise
    in_silico_simulator_router = None

from .services.research_data import (
    get_dataset_summary,
    get_literature_records,
    get_concentration_records,
)

from .services.ai_engine import (
    search_research,
    get_research_insights,
    compare_microorganisms,
    analyze_microorganism_performance,
)
from .services.soil_health_card import (
    get_soil_health_summary,
    get_soil_health_filters,
    get_soil_health_records,
)
from .services.location import detect_location
from .services.pb_soil_assessment import (
    save_pb_assessment,
    get_pb_assessment_records,
    get_pb_assessment_summary,
    compare_pb_treatment,
    get_multi_treatment_analysis,
)


def classify_organism(name):
    normalized = name.lower()

    # Mixed microbial communities
    if any(term in normalized for term in [
        "mixed consortia",
        "consortium",
        "microbiome",
        "mixed culture",
    ]):
        return "communities"

    # Multiple named organisms
    if "/" in name:
        return "multi_organism"

    # Unspecified strains
    if "strain" in normalized or "strains" in normalized:
        return "strain_groups"

    # Functional microbial groups
    if any(term in normalized for term in [
        "sulfate-reducing",
        "phosphate-solubilizing",
        "pgpr",
        "bacteria",
        "bacterial group",
    ]):
        return "functional_groups"

    # Specifically named organisms
    return "individuals"


from .services.prediction import (
    analyze_prediction_readiness,
    calculate_observed_reduction,
    predict_soil_health,
)

from .services.soil_monitoring import (
    save_reading,
    get_latest_reading,
    get_reading_history,
    get_monitoring_status,
    get_district_reading_summary,
)


app = FastAPI(
    title="Lead Research Explorer API",
    description="Evidence-based lead bioremediation research platform",
    version="2.0.0",
)

if in_silico_simulator_router is not None:
    app.include_router(in_silico_simulator_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lead-bio-ai-1-2.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_PATH = Path(
    r"C:\Users\DELL\.leadbio\database\leadbio.sqlite3"
)


class ResearchQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class SoilReading(BaseModel):
    source: str = "manual"

    # Location
    district_id: str | None = None
    district_name: str | None = None
    mandal: str | None = None
    village: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    # Soil measurements
    moisture: float | None = Field(default=None, ge=0, le=100)
    ph: float | None = Field(default=None, ge=0, le=14)
    temperature: float | None = None
    ec: float | None = Field(default=None, ge=0)
    lead_mg_kg: float | None = Field(default=None, ge=0)
    other_metals: str | None = None
    microorganisms: str | None = None
    notes: str | None = None

@app.get("/")
def root():
    return {
        "application": "Lead Research Explorer",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "message": "Backend API is working",
    }


@app.get("/api/database/status")
def database_status():

    if not DATABASE_PATH.exists():
        return {
            "connected": False,
            "message": "Existing database was not found",
            "database_path": str(DATABASE_PATH),
        }

    try:
        connection = sqlite3.connect(
            DATABASE_PATH.as_uri() + "?mode=ro",
            uri=True,
        )

        tables = connection.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' ORDER BY name"
        ).fetchall()

        table_info = {}

        for (table_name,) in tables:
            safe_name = table_name.replace('"', '""')

            count = connection.execute(
                f'SELECT COUNT(*) FROM "{safe_name}"'
            ).fetchone()[0]

            table_info[table_name] = {"rows": count}

        connection.close()

        return {
            "connected": True,
            "database_path": str(DATABASE_PATH),
            "tables": table_info,
        }

    except Exception as error:
        return {
            "connected": False,
            "error": str(error),
        }


@app.get("/api/research/summary")
def research_summary():
    try:
        return get_dataset_summary()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/research/organisms")
def research_organisms():
    try:
        records = get_literature_records()

        return {
            "total": len(records),
            "records": records,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/research/concentrations")
def research_concentrations():
    try:
        records = get_concentration_records()

        return {
            "total": len(records),
            "records": records,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ==========================================================
# AI RESEARCH ASSISTANT
# ==========================================================

@app.post("/api/ai/ask")
def ai_ask(payload: ResearchQuestion):
    try:
        return search_research(payload.question)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/ai/insights")
def ai_insights():
    try:
        return get_research_insights()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ==========================================================
# MICROORGANISM INTELLIGENCE
# ==========================================================

@app.get("/api/ai/microorganisms")
def ai_microorganisms():
    try:
        return compare_microorganisms()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
@app.get("/api/ai/microorganisms/performance")
def microorganism_performance(unit: str | None = None):
    try:
        return analyze_microorganism_performance(unit)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


def classify_organism(name):
    normalized = name.lower()

    # Mixed microbial communities
    if any(term in normalized for term in [
        "mixed consortia",
        "consortium",
        "microbiome",
        "mixed culture",
    ]):
        return "communities"

    # Multiple named organisms
    if "/" in name:
        return "multi_organism"

    # Unspecified strains
    if "strain" in normalized or "strains" in normalized:
        return "strain_groups"

    # Functional microbial groups
    if any(term in normalized for term in [
        "sulfate-reducing",
        "phosphate-solubilizing",
        "pgpr",
        "bacteria",
        "bacterial group",
    ]):
        return "functional_groups"

    # Specifically named organisms
    return "individuals"

# ==========================================================
# LEAD BIOREMEDIATION PREDICTION READINESS
# ==========================================================

@app.get("/api/ai/prediction/readiness")
def prediction_readiness():
    try:
        return analyze_prediction_readiness()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/ai/prediction/observed")
def prediction_observed():
    try:
        return calculate_observed_reduction()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ==========================================================
# SOIL HEALTH ANALYZER
# ==========================================================

@app.get("/api/ai/soil-health")
def soil_health():
    try:
        return predict_soil_health()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
# ==========================================================
# REAL-TIME SOIL MONITORING
# ==========================================================

@app.get("/api/monitoring/status")
def monitoring_status():
    try:
        return get_monitoring_status()
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/monitoring/readings")
def create_soil_reading(payload: SoilReading):
    try:
        return save_reading(payload.model_dump())
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/monitoring/latest")
def latest_soil_reading():
    try:
        return {
            "reading": get_latest_reading()
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/monitoring/history")
def soil_reading_history(limit: int = 100):
    try:
        if limit < 1 or limit > 1000:
            raise HTTPException(
                status_code=400,
                detail="Limit must be between 1 and 1000",
            )

        records = get_reading_history(limit)
        return {
            "total": len(records),
            "records": records,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

# TELANGANA_SOIL_DISTRICT_API
from .services.telangana_soil import (
    get_districts,
    get_district,
    get_soil_survey_projects,
)


@app.get("/api/telangana/districts")
def telangana_districts():
    districts = get_districts()
    return {
        "state": "Telangana",
        "total_districts": len(districts),
        "districts": districts,
    }


@app.get("/api/telangana/districts/{district_id}")
def telangana_district_detail(district_id: str):
    district = get_district(district_id.lower())

    if district is None:
        raise HTTPException(
            status_code=404,
            detail="District not found",
        )

    return district
@app.get("/api/monitoring/district/{district_id}")
def district_monitoring_summary(district_id: str):
    return get_district_reading_summary(district_id.lower())


@app.get("/api/monitoring/district/{district_id}/history")
def district_monitoring_history(
    district_id: str,
    limit: int = 100,
):
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 1000",
        )

    records = get_reading_history(
        limit=limit,
        district_id=district_id.lower(),
    )

    return {
        "district_id": district_id.lower(),
        "total": len(records),
        "records": records,
    }


@app.get("/api/telangana/soil-surveys")
def telangana_soil_surveys():
    projects = get_soil_survey_projects()

    return {
        "state": "Telangana",
        "total_projects": len(projects),
        "projects": projects,
    }
# ==========================================================
# OFFICIAL SOIL HEALTH CARD DATA — TELANGANA
# ==========================================================

@app.get("/api/soil-health-card/summary")
def soil_health_card_summary():
    try:
        return get_soil_health_summary()

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/soil-health-card/filters")
def soil_health_card_filters(
    district_name: str | None = None,
    block_name: str | None = None,
):
    try:
        return get_soil_health_filters(
            district_name=district_name,
            block_name=block_name,
        )

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/soil-health-card/records")
def soil_health_card_records(
    district_name: str | None = None,
    block_name: str | None = None,
    village_name: str | None = None,
    nutrient_name: str | None = None,
    nutrient_type: str | None = None,
):
    try:
        return get_soil_health_records(
            district_name=district_name,
            block_name=block_name,
            village_name=village_name,
            nutrient_name=nutrient_name,
            nutrient_type=nutrient_type,
        )

    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error))

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    # ==========================================================
# AUTOMATIC LOCATION DETECTION
# ==========================================================

@app.get("/api/location/detect")
def location_detect(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    try:
        return detect_location(latitude, longitude)

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
    # ==========================================================
# PB-CONTAMINATED SOIL HEALTH ASSESSMENT
# ==========================================================

@app.get("/api/pb-soil-assessment/summary")
def pb_soil_assessment_summary():
    try:
        return get_pb_assessment_summary()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.post("/api/pb-soil-assessment/records")
def create_pb_soil_assessment(payload: dict):
    try:
        return save_pb_assessment(payload)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@app.get("/api/pb-soil-assessment/records")
def read_pb_soil_assessment_records(
    limit: int = Query(100, ge=1, le=1000),
    experiment_id: str | None = None,
):
    try:
        return get_pb_assessment_records(
            limit=limit,
            experiment_id=experiment_id,
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
@app.get("/api/pb-soil-assessment/compare/{experiment_id}")
def compare_pb_assessment(
    experiment_id: str,
    treatment: str | None = None,
):
    try:
        return compare_pb_treatment(
            experiment_id=experiment_id,
            treatment=treatment,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
        # ==========================================================
# MULTI-TREATMENT ANALYSIS
# ==========================================================

@app.get("/api/pb-soil-assessment/treatments/{experiment_id}")
def pb_multi_treatment_analysis(experiment_id: str):
    try:
        return get_multi_treatment_analysis(experiment_id)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )