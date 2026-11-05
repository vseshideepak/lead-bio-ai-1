from pathlib import Path
from datetime import datetime, timezone
import sqlite3

DATABASE_PATH = (
    Path.home()
    / ".leadbio"
    / "monitoring"
    / "soil_monitoring.sqlite3"
)


def get_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row

    connection.execute("""
        CREATE TABLE IF NOT EXISTS soil_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recorded_at TEXT NOT NULL,
            source TEXT NOT NULL,
            moisture REAL,
            ph REAL,
            temperature REAL,
            ec REAL,
            lead_mg_kg REAL,
            other_metals TEXT,
            microorganisms TEXT,
            notes TEXT,
            district_id TEXT,
            district_name TEXT,
            mandal TEXT,
            village TEXT,
            latitude REAL,
            longitude REAL
        )
    """)

    # Safe migration: add only columns that are missing.
    existing_columns = {
        row["name"]
        for row in connection.execute(
            "PRAGMA table_info(soil_readings)"
        ).fetchall()
    }

    new_columns = {
        "district_id": "TEXT",
        "district_name": "TEXT",
        "mandal": "TEXT",
        "village": "TEXT",
        "latitude": "REAL",
        "longitude": "REAL",
    }

    for column, data_type in new_columns.items():
        if column not in existing_columns:
            connection.execute(
                f"ALTER TABLE soil_readings ADD COLUMN {column} {data_type}"
            )

    connection.commit()
    return connection


def save_reading(data: dict):
    recorded_at = datetime.now(timezone.utc).isoformat()
    connection = get_connection()

    try:
        cursor = connection.execute("""
            INSERT INTO soil_readings (
                recorded_at, source, moisture, ph,
                temperature, ec, lead_mg_kg,
                other_metals, microorganisms, notes,
                district_id, district_name, mandal,
                village, latitude, longitude
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            recorded_at,
            data.get("source", "manual"),
            data.get("moisture"),
            data.get("ph"),
            data.get("temperature"),
            data.get("ec"),
            data.get("lead_mg_kg"),
            data.get("other_metals"),
            data.get("microorganisms"),
            data.get("notes"),
            data.get("district_id"),
            data.get("district_name"),
            data.get("mandal"),
            data.get("village"),
            data.get("latitude"),
            data.get("longitude"),
        ))

        connection.commit()

        return {
            "success": True,
            "id": cursor.lastrowid,
            "recorded_at": recorded_at,
            "source": data.get("source", "manual"),
            "district_id": data.get("district_id"),
            "district_name": data.get("district_name"),
        }

    finally:
        connection.close()


def get_latest_reading(district_id: str | None = None):
    connection = get_connection()

    try:
        if district_id:
            row = connection.execute("""
                SELECT * FROM soil_readings
                WHERE district_id = ?
                ORDER BY id DESC LIMIT 1
            """, (district_id,)).fetchone()
        else:
            row = connection.execute("""
                SELECT * FROM soil_readings
                ORDER BY id DESC LIMIT 1
            """).fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


def get_reading_history(
    limit: int = 100,
    district_id: str | None = None,
):
    connection = get_connection()

    try:
        if district_id:
            rows = connection.execute("""
                SELECT * FROM soil_readings
                WHERE district_id = ?
                ORDER BY id DESC LIMIT ?
            """, (district_id, limit)).fetchall()
        else:
            rows = connection.execute("""
                SELECT * FROM soil_readings
                ORDER BY id DESC LIMIT ?
            """, (limit,)).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


def get_district_reading_summary(district_id: str):
    connection = get_connection()

    try:
        count = connection.execute("""
            SELECT COUNT(*) FROM soil_readings
            WHERE district_id = ?
        """, (district_id,)).fetchone()[0]

        latest = connection.execute("""
            SELECT * FROM soil_readings
            WHERE district_id = ?
            ORDER BY id DESC LIMIT 1
        """, (district_id,)).fetchone()

        return {
            "district_id": district_id,
            "total_readings": count,
            "latest_reading": dict(latest) if latest else None,
        }

    finally:
        connection.close()


def get_monitoring_status():
    connection = get_connection()

    try:
        count = connection.execute(
            "SELECT COUNT(*) FROM soil_readings"
        ).fetchone()[0]

        latest = connection.execute("""
            SELECT recorded_at, source, district_name
            FROM soil_readings
            ORDER BY id DESC LIMIT 1
        """).fetchone()

        return {
            "database_connected": True,
            "total_readings": count,
            "latest_reading": dict(latest) if latest else None,
            "automatic_sensor_connection": False,
            "message": (
                "Waiting for sensor or laboratory data"
                if count == 0
                else "Monitoring database is receiving stored readings"
            ),
        }

    finally:
        connection.close()