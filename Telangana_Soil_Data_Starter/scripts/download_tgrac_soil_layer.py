
import csv
import json
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

# --------------------------------------------------
# PROJECT PATH
# --------------------------------------------------

ROOT = Path(__file__).resolve().parents[2]

OUT = ROOT / "data" / "raw" / "telangana_soil" / "tgrac_soil_map"
OUT.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# TGRAC SOIL LAYER
# --------------------------------------------------

QUERY_URL = (
    "https://tgrac.telangana.gov.in/arcgis/rest/services/"
    "Agri2/Agriculture2_CropAnalysis_Layers/MapServer/20/query"
)

# Only fields required for soil classification
FIELDS = [
    "OBJECTID",
    "D_Name",
    "M_Name",
    "V_Name",
    "Soil_Type",
    "Soil_Code",
]

BATCH_SIZE = 100


# --------------------------------------------------
# ARCGIS REQUEST FUNCTION
# Uses POST to avoid excessively long query URLs.
# --------------------------------------------------

def arcgis_request(params):

    data = urllib.parse.urlencode(params).encode("utf-8")

    request = urllib.request.Request(
        QUERY_URL,
        data=data,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
    )

    for attempt in range(1, 4):

        try:
            with urllib.request.urlopen(
                request, timeout=90
            ) as response:
                result = json.loads(
                    response.read().decode("utf-8")
                )

            if "error" in result:
                raise RuntimeError(
                    f"ArcGIS error: {result['error']}"
                )

            return result

        except urllib.error.HTTPError as error:

            body = error.read().decode(
                "utf-8", errors="replace"
            )

            raise RuntimeError(
                f"HTTP {error.code}: {body[:1500]}"
            ) from error

        except (
            urllib.error.URLError,
            TimeoutError,
            ConnectionError,
            OSError,
        ) as error:

            print(f"Attempt {attempt}/3 failed: {error}")

            if attempt == 3:
                raise

            time.sleep(attempt * 5)


# --------------------------------------------------
# STEP 1: GET ONLY FEATURE IDS
# --------------------------------------------------

def get_feature_ids():

    print("\nGetting available soil record IDs...")

    result = arcgis_request({
        "where": "1=1",
        "returnIdsOnly": "true",
        "returnGeometry": "false",
        "f": "json",
    })

    ids = result.get("objectIds") or []

    if not ids:
        raise RuntimeError("No soil records returned by TGRAC.")

    print(f"Records available: {len(ids)}")

    return sorted(ids)


# --------------------------------------------------
# STEP 2: DOWNLOAD SELECTED FIELDS ONLY
# --------------------------------------------------

def download_required_data(ids):

    records = []

    total = len(ids)

    print("\nDownloading selected soil attributes...")

    for start in range(0, total, BATCH_SIZE):

        batch = ids[start:start + BATCH_SIZE]

        result = arcgis_request({
            "objectIds": ",".join(map(str, batch)),
            "outFields": ",".join(FIELDS),
            "returnGeometry": "false",
            "f": "json",
        })

        features = result.get("features", [])

        for feature in features:
            records.append(feature.get("attributes", {}))

        print(f"Downloaded {len(records)} / {total}")

        time.sleep(1)

    if not records:
        raise RuntimeError("No soil attribute records downloaded.")

    return records


# --------------------------------------------------
# STEP 3: SAVE ONLY THE REQUIRED CSV
# --------------------------------------------------

def save_csv(records):

    output_file = OUT / "tgrac_required_soil_data.csv"

    with output_file.open(
        "w",
        newline="",
        encoding="utf-8-sig",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=FIELDS,
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(records)

    print("\nCSV saved successfully:")
    print(output_file)


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print("=" * 50)
    print("TGRAC REQUIRED SOIL DATA DOWNLOADER")
    print("=" * 50)

    ids = get_feature_ids()

    records = download_required_data(ids)

    save_csv(records)

    districts = sorted({
        str(row.get("D_Name")).strip()
        for row in records
        if row.get("D_Name")
    })

    print("\nDOWNLOAD COMPLETED")
    print("Total records:", len(records))
    print("Districts present:", len(districts))
    print("District names:", ", ".join(districts))
    print("Output folder:", OUT)

    print(
        "\nNote: These records describe soil classifications, "
        "not measured lead concentrations or laboratory chemistry."
    )


if __name__ == "__main__":
    main()
