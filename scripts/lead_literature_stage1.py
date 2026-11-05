"""
LEAD REMEDIATION LITERATURE PIPELINE — STAGE 1
Collects candidate literature metadata, checks existing DOI records, and creates
an auditable bibliography for screening. It DOES NOT invent experimental values.

Run from the project folder:
    python lead_literature_stage1.py

Requires internet access on the user's computer:
    pip install pandas requests matplotlib openpyxl
"""
from pathlib import Path
import re
import time
import requests
import pandas as pd
import matplotlib.pyplot as plt

PROJECT = Path(__file__).resolve().parent
INPUT_CANDIDATES = [
    PROJECT / "lead_bioremediation_soil_research_papers(1).csv",
    PROJECT / "lead_bioremediation_soil_research_papers.csv",
    PROJECT / "data" / "raw" / "lead_bioremediation_100_papers_full.xls",
    PROJECT / "data" / "raw" / "lead_bioremediation_with_concentrations.xlsx",
]
OUT = PROJECT / "outputs" / "literature_stage1"
OUT.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "LeadRemediationLiteratureReview/1.0 (academic screening)"}
OPENALEX_URL = "https://api.openalex.org/works"
CROSSREF_URL = "https://api.crossref.org/works/"

SEARCHES = [
    ("biological", '("lead" OR "Pb") AND (soil OR sediment) AND (bioremediation OR bacteria OR fungi OR microbial OR bioimmobilization OR biosorption)'),
    ("physical", '("lead" OR "Pb") AND (soil OR sediment) AND ("soil washing" OR excavation OR separation OR "physical remediation")'),
    ("chemical", '("lead" OR "Pb") AND (soil OR sediment) AND (stabilization OR immobilization OR phosphate OR "chemical extraction" OR leaching OR amendment)'),
    ("combined", '("lead" OR "Pb") AND (soil OR sediment) AND (combined OR integrated) AND (remediation OR immobilization OR extraction)'),
    ("plant_based", '("lead" OR "Pb") AND soil AND (phytoremediation OR phytoextraction OR rhizoremediation)'),
]

def first_existing(paths):
    for path in paths:
        if path.exists():
            return path
    return None

def clean_doi(value):
    if pd.isna(value):
        return ""
    doi = str(value).strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.I)
    return doi.strip().rstrip(" .;")

def load_existing():
    frames = []
    for path in INPUT_CANDIDATES:
        if not path.exists():
            continue
        try:
            if path.suffix.lower() == ".csv":
                df = pd.read_csv(path, dtype=str)
            else:
                df = pd.read_excel(path, dtype=str)
            df["source_file"] = str(path.relative_to(PROJECT))
            # Normalize likely metadata fields without discarding original columns.
            rename = {}
            for col in df.columns:
                key = re.sub(r"[^a-z0-9]", "", str(col).lower())
                if key in {"doi", "digitalobjectidentifier"}: rename[col] = "DOI"
                elif key in {"title", "papertitle", "articletitle"}: rename[col] = "Title"
                elif key in {"year", "publicationyear", "publishedyear"}: rename[col] = "Year"
                elif key in {"authors", "author"}: rename[col] = "Authors"
                elif key in {"journal", "source", "publication", "journalname"}: rename[col] = "Journal"
            df = df.rename(columns=rename)
            for col in ["DOI", "Title", "Year", "Authors", "Journal"]:
                if col not in df.columns:
                    df[col] = ""
            frames.append(df)
            print(f"Loaded {len(df)} rows from {path}")
        except Exception as exc:
            print(f"Could not read {path.name}: {exc}")
    if not frames:
        return pd.DataFrame(columns=["DOI", "Title", "Year", "Authors", "Journal", "source_file"])
    return pd.concat(frames, ignore_index=True, sort=False)

def openalex_search(category, query, per_page=100):
    results = []
    cursor = "*"
    # Fetch at most 2 pages per query; increase later if needed.
    for _ in range(2):
        params = {
            "search": query,
            "per-page": per_page,
            "cursor": cursor,
            "select": "id,doi,title,publication_year,authorships,primary_location,authorships,abstract_inverted_index,type,cited_by_count",
        }
        try:
            response = requests.get(OPENALEX_URL, params=params, headers=HEADERS, timeout=40)
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            print(f"OpenAlex query failed ({category}): {exc}")
            break
        for item in payload.get("results", []):
            doi = clean_doi(item.get("doi", ""))
            authors = "; ".join(
                (a.get("author", {}) or {}).get("display_name", "")
                for a in (item.get("authorships") or [])[:5]
            )
            location = item.get("primary_location") or {}
            source = (location.get("source") or {}).get("display_name", "")
            abstract = ""
            inv = item.get("abstract_inverted_index") or {}
            if inv:
                words = {}
                for word, positions in inv.items():
                    for pos in positions:
                        words[pos] = word
                abstract = " ".join(words[i] for i in sorted(words))
            results.append({
                "DOI": doi, "Title": item.get("title", ""),
                "Year": item.get("publication_year", ""),
                "Authors": authors, "Journal": source,
                "OpenAlex_ID": item.get("id", ""),
                "Work_Type": item.get("type", ""),
                "Cited_By_OpenAlex": item.get("cited_by_count", ""),
                "Search_Category": category, "Abstract": abstract,
                "Metadata_Source": "OpenAlex",
                "Candidate_Only": True,
            })
        cursor = payload.get("meta", {}).get("next_cursor")
        if not cursor:
            break
        time.sleep(0.2)
    return results

def verify_crossref(doi):
    if not doi:
        return {"Crossref_Status": "NO_DOI", "Crossref_Title": "", "Crossref_Year": "", "Crossref_Journal": ""}
    try:
        response = requests.get(CROSSREF_URL + requests.utils.quote(doi, safe=""), headers=HEADERS, timeout=20)
        if response.status_code == 404:
            return {"Crossref_Status": "DOI_NOT_FOUND_IN_CROSSREF", "Crossref_Title": "", "Crossref_Year": "", "Crossref_Journal": ""}
        response.raise_for_status()
        msg = response.json().get("message", {})
        title = (msg.get("title") or [""])[0]
        journal = (msg.get("container-title") or [""])[0]
        date_parts = (msg.get("published-print") or msg.get("published-online") or msg.get("created") or {}).get("date-parts", [[]])
        year = date_parts[0][0] if date_parts and date_parts[0] else ""
        return {"Crossref_Status": "DOI_FOUND_TITLE_REVIEW_REQUIRED", "Crossref_Title": title,
                "Crossref_Year": year, "Crossref_Journal": journal}
    except Exception as exc:
        return {"Crossref_Status": "CHECK_ERROR: " + str(exc)[:120], "Crossref_Title": "", "Crossref_Year": "", "Crossref_Journal": ""}

def classify_method(row):
    text = " ".join(str(row.get(k, "")) for k in ["Title", "Abstract", "Primary Mechanism", "Search_Category"]).lower()
    hits = []
    rules = {
        "Biological": ["bacter", "microb", "fung", "biosorption", "bioimmobil", "bioremed", "phytoremed", "phytoextract", "rhizoremed", "bacillus", "pseudomonas"],
        "Physical": ["soil washing", "excavation", "separation", "electrokinetic", "vitrification", "physical remediation"],
        "Chemical": ["phosphate", "chemical extraction", "leaching", "stabilization", "immobilization", "biochar", "lime amendment", "chemical remediation"],
        "Combined": ["combined", "integrated", "microbial-assisted", "biochar and bacteria", "bacteria and phosphate"],
    }
    for label, terms in rules.items():
        if any(term in text for term in terms):
            hits.append(label)
    if not hits:
        return "Needs manual classification"
    return "; ".join(hits)

def main():
    print("Project folder:", PROJECT)
    existing = load_existing()
    if not existing.empty:
        existing["DOI_Clean"] = existing["DOI"].map(clean_doi)
        existing["Metadata_Source"] = existing.get("Metadata_Source", "Existing project file")
        existing["Candidate_Only"] = True

    found = []
    for category, query in SEARCHES:
        print(f"Searching OpenAlex: {category} ...")
        found.extend(openalex_search(category, query))
        time.sleep(0.3)
    searched = pd.DataFrame(found)
    if searched.empty:
        searched = pd.DataFrame(columns=["DOI", "Title", "Year", "Authors", "Journal", "Search_Category", "Abstract"])
    if "DOI" not in searched:
        searched["DOI"] = ""
    searched["DOI_Clean"] = searched["DOI"].map(clean_doi)

    if not existing.empty:
        existing["DOI_Clean"] = existing["DOI"].map(clean_doi)
        combined = pd.concat([existing, searched], ignore_index=True, sort=False)
    else:
        combined = searched.copy()

    combined["Title_Normalized"] = combined["Title"].fillna("").astype(str).str.lower().str.replace(r"[^a-z0-9]+", " ", regex=True).str.strip()
    combined["dedupe_key"] = combined["DOI_Clean"].where(combined["DOI_Clean"].ne(""), combined["Title_Normalized"])
    combined = combined.drop_duplicates("dedupe_key", keep="first").drop(columns=["dedupe_key"])
    combined["Suggested_Method_Category"] = combined.apply(classify_method, axis=1)
    combined["Title_Year_DOI_Check"] = "NOT YET VERIFIED"
    combined["Full_Text_Experimental_Data"] = "NOT EXTRACTED"
    combined["Eligible_For_Efficacy_Graph"] = False

    # Verify DOI metadata for up to 200 records per run to keep the run practical.
    doi_rows = combined.index[combined["DOI_Clean"].fillna("").ne("")].tolist()[:200]
    crossref_records = {}
    print(f"Crossref-checking {len(doi_rows)} DOI records (metadata check only)...")
    for count, idx in enumerate(doi_rows, start=1):
        doi = combined.at[idx, "DOI_Clean"]
        cr = verify_crossref(doi)
        crossref_records[idx] = cr
        if count % 20 == 0:
            print(f"  Checked {count}/{len(doi_rows)}")
        time.sleep(0.12)
    for idx, values in crossref_records.items():
        for key, value in values.items():
            combined.loc[idx, key] = value
        # Keep DOI validity separate from title matching and full-text evidence.
        combined.loc[idx, "Title_Year_DOI_Check"] = values["Crossref_Status"]

    # Save auditable data and descriptive graphs (counts only; no efficacy fabricated).
    combined.to_csv(OUT / "candidate_literature_screening.csv", index=False)
    combined[combined["DOI_Clean"].fillna("").ne("")].to_csv(OUT / "doi_records_for_manual_title_check.csv", index=False)

    category_counts = combined["Suggested_Method_Category"].value_counts().rename_axis("Method_Category").reset_index(name="Candidate_Record_Count")
    category_counts.to_csv(OUT / "candidate_counts_by_method.csv", index=False)
    if not category_counts.empty:
        ax = category_counts.plot(kind="bar", x="Method_Category", y="Candidate_Record_Count", legend=False, figsize=(10, 5))
        ax.set_title("Candidate literature records by suggested method category")
        ax.set_ylabel("Records (not verified experimental datasets)")
        ax.set_xlabel("")
        plt.xticks(rotation=25, ha="right")
        plt.tight_layout()
        plt.savefig(OUT / "01_candidate_counts_by_method.png", dpi=180)
        plt.close()

    year_col = pd.to_numeric(combined["Year"], errors="coerce") if "Year" in combined else pd.Series(dtype=float)
    year_counts = year_col.dropna().astype(int).value_counts().sort_index()
    if not year_counts.empty:
        year_counts.to_csv(OUT / "candidate_publications_by_year.csv", header=["Record_Count"])
        ax = year_counts.plot(kind="bar", figsize=(12, 5))
        ax.set_title("Candidate publication records by year")
        ax.set_xlabel("Publication year")
        ax.set_ylabel("Records (not verified experimental datasets)")
        plt.tight_layout()
        plt.savefig(OUT / "02_candidate_publications_by_year.png", dpi=180)
        plt.close()

    report = pd.DataFrame([{
        "Existing_input_rows": len(existing),
        "OpenAlex_candidates_retrieved": len(searched),
        "Unique_records_after_deduplication": len(combined),
        "Rows_with_DOI": int(combined["DOI_Clean"].fillna("").ne("").sum()),
        "Crossref_DOI_found_title_review_required": int(combined.get("Crossref_Status", pd.Series(dtype=str)).eq("DOI_FOUND_TITLE_REVIEW_REQUIRED").sum()),
        "Crossref_DOI_not_found": int(combined.get("Crossref_Status", pd.Series(dtype=str)).eq("DOI_NOT_FOUND_IN_CROSSREF").sum()),
        "Eligible_for_efficacy_graph_at_stage1": 0,
        "Important_note": "Metadata discovery/verification only. No record is eligible for efficacy graphs until the primary paper and its numeric endpoint are checked."
    }])
    report.to_csv(OUT / "stage1_quality_report.csv", index=False)
    print("\nSTAGE 1 COMPLETE")
    print(report.to_string(index=False))
    print("Outputs saved to:", OUT)
    print("Next: review candidate_literature_screening.csv, screen full texts, and enter verified experimental endpoints into a separate evidence table.")

if __name__ == "__main__":
    main()
