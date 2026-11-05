import re
import math
from typing import Any

from app.services.research_data import (
    get_literature_records,
    get_concentration_records,
    get_dataset_summary,
)


STOP_WORDS = {
    "what", "which", "when", "where", "how", "does", "do",
    "the", "and", "for", "with", "from", "are", "can",
    "could", "would", "about", "tell", "me", "show",
    "give", "explain", "compare", "is", "in", "on",
    "of", "to", "a", "an", "this", "that", "these",
    "those", "it", "its", "their", "they", "be", "was",
    "were", "has", "have", "had", "by", "as", "at",
    "between", "into", "through", "during", "after",
    "before", "using", "used", "use", "based", "studies",
    "study", "research", "paper", "papers", "involving",
    "involve", "associated", "known",
}

SYNONYM_GROUPS = [
    {"lead", "pb"},
    {"biosorption", "biosorb"},
    {"bioaccumulation", "accumulation"},
    {"bioimmobilization", "immobilization", "immobilisation"},
    {"biomineralization", "biomineralisation"},
    {"bioremediation", "microbial remediation"},
    {"soil", "soil matrix"},
    {"ph", "acidity", "alkalinity"},
    {"temperature", "thermal condition"},
    {"consortium", "mixed culture", "mixed consortia"},
    {"bacteria", "bacterial", "bacterium"},
    {"fungi", "fungal", "fungus"},
    {"removal efficiency", "remediation efficiency"},
    {"leaching", "leachability"},
    {"bioavailable", "bioavailability"},
]

FIELD_WEIGHTS = {
    "title": 5.0,
    "organism": 5.0,
    "microorganism": 5.0,
    "remediation_method": 5.0,
    "bioremediation_mechanism": 5.0,
    "contamination_source": 3.0,
    "lead_contamination_source": 3.0,
    "initial_pb_concentration": 3.0,
    "final_pb_concentration": 3.0,
    "concentration_units": 2.5,
    "efficacy_percent": 3.0,
    "removal_efficiency": 3.0,
    "ph": 4.0,
    "temp_c": 4.0,
    "temperature_c": 4.0,
    "treatment_duration": 4.0,
    "soil_type": 3.0,
    "doi": 1.0,
    "primary_paper_doi_reference": 1.0,
    "authors": 1.5,
    "journal": 1.5,
    "year": 0.5,
}

INTENT_FIELDS = {
    "ph": {"ph"},
    "temperature": {"temp_c", "temperature_c"},
    "duration": {"treatment_duration"},
    "concentration": {
        "initial_pb_concentration",
        "final_pb_concentration",
        "concentration_units",
    },
    "efficiency": {"efficacy_percent", "removal_efficiency"},
    "mechanism": {"remediation_method", "bioremediation_mechanism"},
    "organism": {"organism", "microorganism"},
    "soil": {"soil_type", "contamination_source", "lead_contamination_source"},
}

INTENT_TERMS = {
    "ph": {"ph", "acidity", "alkalinity"},
    "temperature": {"temperature", "thermal"},
    "duration": {"duration", "days", "hours", "time"},
    "concentration": {
        "concentration", "initial", "final", "mg", "kg", "ppm",
    },
    "efficiency": {"efficiency", "removal", "percentage", "percent"},
    "mechanism": {
        "biosorption", "bioaccumulation", "bioimmobilization",
        "immobilization", "biomineralization", "mechanism",
    },
    "organism": {
        "microorganism", "organism", "bacteria", "bacterial",
        "fungi", "fungal", "microbe", "microbial",
    },
    "soil": {"soil", "matrix", "contamination"},
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""

    try:
        if isinstance(value, float) and math.isnan(value):
            return ""
    except (TypeError, ValueError):
        pass

    text = str(value).strip()

    if text.lower() in {"nan", "none", "null", "nat"}:
        return ""

    return text


def normalize_key(value: Any) -> str:
    return re.sub(
        r"[^a-z0-9]+",
        "_",
        clean_text(value).lower()
    ).strip("_")


def tokenize(value: str) -> list[str]:
    return re.findall(
        r"[a-z0-9]+(?:[.+-][a-z0-9]+)*",
        value.lower()
    )


def get_query_intents(question: str) -> set[str]:
    tokens = set(tokenize(question))
    intents = set()

    for intent, terms in INTENT_TERMS.items():
        if tokens.intersection(terms):
            intents.add(intent)

    return intents


def expand_query_terms(question: str):
    original = list(dict.fromkeys(
        word for word in tokenize(question)
        if word not in STOP_WORDS and len(word) > 1
    ))

    expanded = set(original)
    normalized_question = " ".join(tokenize(question))

    for group in SYNONYM_GROUPS:
        group_matches = False

        for phrase in group:
            phrase_tokens = tokenize(phrase)
            normalized_phrase = " ".join(phrase_tokens)

            if normalized_phrase and (
                normalized_phrase in normalized_question
                or all(token in original for token in phrase_tokens)
            ):
                group_matches = True
                break

        if group_matches:
            for phrase in group:
                expanded.update(tokenize(phrase))

    expanded.difference_update(STOP_WORDS)

    return original, sorted(expanded)


def score_record(record, original_terms, expanded_terms, intents):
    searchable_fields = {}

    for key, value in record.items():
        text = clean_text(value)

        if text:
            field = normalize_key(key)
            searchable_fields[field] = {
                "text": text.lower(),
                "tokens": set(tokenize(text)),
            }

    score = 0.0
    matched_terms = set()
    matched_fields = set()

    for field, data in searchable_fields.items():
        text = data["text"]
        field_tokens = data["tokens"]
        weight = FIELD_WEIGHTS.get(field, 1.0)

        for term in original_terms:
            if term in field_tokens:
                score += weight * 1.5
                matched_terms.add(term)
                matched_fields.add(field)

            elif len(term) >= 4 and term in text:
                score += weight
                matched_terms.add(term)
                matched_fields.add(field)

        for term in expanded_terms:
            if term in original_terms:
                continue

            if term in field_tokens:
                score += weight * 0.35
                matched_terms.add(term)
                matched_fields.add(field)

    # Experimental-condition questions must match the actual field.
    intent_hits = set()

    for intent in intents:
        expected_fields = INTENT_FIELDS[intent]
        fields_present = expected_fields.intersection(searchable_fields)

        if fields_present:
            intent_hits.add(intent)

            if fields_present.intersection(matched_fields):
                score += 5.0
            else:
                # A condition field alone does not establish relevance.
                score += 0.0

    # Penalize records that fail to match the main research topic.
    if not matched_terms:
        score = 0.0

    return (
        round(score, 2),
        sorted(matched_terms),
        sorted(matched_fields),
        sorted(intent_hits),
    )


def search_research(question: str, limit: int = 8) -> dict:
    question = clean_text(question)

    if not question:
        return {
            "answer": "Please enter a research question.",
            "question": "",
            "keywords": [],
            "evidence_count": 0,
            "matches": [],
            "disclaimer": "No search was performed.",
        }

    original_terms, expanded_terms = expand_query_terms(question)
    intents = get_query_intents(question)

    if not original_terms:
        return {
            "answer": "Please enter a specific scientific research question.",
            "question": question,
            "keywords": [],
            "evidence_count": 0,
            "matches": [],
            "disclaimer": "Evidence retrieval only.",
        }

    papers = get_literature_records()
    concentrations = get_concentration_records()

    candidates = []

    for record in papers:
        score, terms, fields, intent_hits = score_record(
            record, original_terms, expanded_terms, intents
        )

        if score >= 3.0:
            candidates.append({
                "type": "literature",
                "score": score,
                "matched_terms": terms,
                "matched_fields": fields,
                "matched_intents": intent_hits,
                "record": record,
            })

    for record in concentrations:
        score, terms, fields, intent_hits = score_record(
            record, original_terms, expanded_terms, intents
        )

        if score >= 3.0:
            candidates.append({
                "type": "concentration",
                "score": score,
                "matched_terms": terms,
                "matched_fields": fields,
                "matched_intents": intent_hits,
                "record": record,
            })

    # Prefer structured experimental data for numerical questions.
    numerical_intents = {"ph", "temperature", "duration", "concentration", "efficiency"}

    for item in candidates:
        if (
            item["type"] == "concentration"
            and intents.intersection(numerical_intents)
        ):
            item["score"] += 3.0

    # Sort by relevance, then by data type preference.
    candidates.sort(
        key=lambda item: (
            item["score"],
            item["type"] == "concentration"
            and bool(intents.intersection(numerical_intents)),
        ),
        reverse=True,
    )

    # Keep only the best matches.
    limit = max(1, min(int(limit), 25))
    matches = candidates[:limit]

    if not matches:
        answer = (
            "No sufficiently relevant records were found. "
            "Try a more specific organism, mechanism, experimental "
            "condition or concentration term."
        )
    else:
        types_found = {
            item["type"] for item in matches
        }

        if types_found == {"concentration"}:
            source_description = "structured concentration records"
        elif types_found == {"literature"}:
            source_description = "literature records"
        else:
            source_description = "literature and concentration records"

        answer = (
            f"The search identified {len(matches)} relevant records "
            f"from {source_description}. Results are ranked by "
            f"field-weighted relevance. Matched fields are displayed "
            f"for each record. These results are evidence retrieval, "
            f"not independently verified scientific conclusions."
        )

    return {
        "answer": answer,
        "question": question,
        "keywords": original_terms,
        "evidence_count": len(matches),
        "matches": matches,
        "disclaimer": (
            "This is a local keyword-based evidence retrieval system, "
            "not a generative AI model or validated prediction model. "
            "Dataset verification labels are not independent proof of "
            "source verification. Experimental endpoints and matrices "
            "must be assessed separately. mg/L and mg/kg values must "
            "never be combined as equivalent measurements."
        ),
    }


def get_research_insights() -> dict:
    summary = get_dataset_summary()

    return {
        "summary": summary,
        "insights": [
            {
                "topic": "Lead remediation",
                "finding": (
                    "Lead is an element and cannot be biodegraded. "
                    "Microorganisms can bind, accumulate, immobilize "
                    "or precipitate lead."
                ),
            },
            {
                "topic": "Experimental comparability",
                "finding": (
                    "Results from different matrices, units and endpoints "
                    "must not be directly compared."
                ),
            },
            {
                "topic": "Prediction readiness",
                "finding": (
                    "Long-term prediction requires independently verified, "
                    "comparable experimental measurements and validation."
                ),
            },
        ],
    }


def compare_microorganisms() -> dict:
    papers = get_literature_records()
    results = {}

    for paper in papers:
        organism = clean_text(paper.get("Organism"))

        if not organism:
            continue

        if organism not in results:
            results[organism] = {
                "organism": organism,
                "record_count": 0,
                "methods": set(),
                "sources": set(),
            }

        results[organism]["record_count"] += 1

        method = clean_text(paper.get("Remediation_Method"))
        source = clean_text(paper.get("Contamination_Source"))

        if method:
            results[organism]["methods"].add(method)

        if source:
            results[organism]["sources"].add(source)

    output = []

    for data in results.values():
        output.append({
            "organism": data["organism"],
            "record_count": data["record_count"],
            "methods": sorted(data["methods"]),
            "contamination_sources": sorted(data["sources"]),
        })

    output.sort(
        key=lambda item: item["record_count"],
        reverse=True,
    )

    return {
        "total_organisms": len(output),
        "records": output,
        "warning": (
            "Record frequency is not evidence of superior remediation "
            "performance. Organisms have not been ranked by efficacy."
        ),
    }

# ==========================================================
# MICROORGANISM PERFORMANCE ANALYSIS
# ==========================================================

def analyze_microorganism_performance(unit: str | None = None) -> dict:
    """
    Analyze measured Pb removal efficiency by microorganism.

    Results are separated by:
    - Concentration unit
    - Organism category
    - Organism label

    Review-labelled records are excluded from performance
    rankings and reported separately.
    """

    from collections import defaultdict
    from statistics import mean, median

    records = get_concentration_records()

    def numeric_value(value):
        text = clean_text(value)

        if not text:
            return None

        text = text.replace("%", "").replace(",", "").strip()

        try:
            return float(text)
        except (TypeError, ValueError):
            return None

    def classify_organism(name):
        normalized = name.lower()

        if any(term in normalized for term in [
            "mixed consortia",
            "consortium",
            "microbiome",
            "mixed culture",
        ]):
            return "communities"

        if "/" in name:
            return "multi_organism"

        if "strain" in normalized:
            return "strain_groups"

        if any(term in normalized for term in [
            "sulfate-reducing",
            "phosphate-solubilizing",
            "pgpr",
            "bacteria",
            "bacterial group",
        ]):
            return "functional_groups"

        return "individuals"

    def is_review_record(record):
        mechanism = clean_text(
            record.get("Bioremediation Mechanism")
        ).lower()

        return "review" in mechanism

    grouped = defaultdict(list)

    excluded_reviews = 0
    excluded_invalid = 0

    for record in records:

        organism = clean_text(
            record.get("Microorganism")
        )

        concentration_unit = clean_text(
            record.get("Concentration Units")
        ).lower()

        efficiency = numeric_value(
            record.get("Removal Efficiency (%)")
        )

        if not organism or not concentration_unit:
            excluded_invalid += 1
            continue

        if unit and concentration_unit != unit.strip().lower():
            continue

        if is_review_record(record):
            excluded_reviews += 1
            continue

        if efficiency is None or not 0 <= efficiency <= 100:
            excluded_invalid += 1
            continue

        category = classify_organism(organism)

        grouped[
            (concentration_unit, category, organism)
        ].append(record)

    results_by_unit = defaultdict(
        lambda: defaultdict(list)
    )

    for (concentration_unit, category, organism), items in grouped.items():

        efficiencies = [
            numeric_value(item.get("Removal Efficiency (%)"))
            for item in items
        ]

        efficiencies = [
            value for value in efficiencies
            if value is not None
        ]

        ph_values = [
            numeric_value(item.get("pH"))
            for item in items
        ]

        temperature_values = [
            numeric_value(item.get("Temperature (°C)"))
            for item in items
        ]

        ph_values = [
            value for value in ph_values
            if value is not None
        ]

        temperature_values = [
            value for value in temperature_values
            if value is not None
        ]

        mechanisms = sorted({
            clean_text(item.get("Bioremediation Mechanism"))
            for item in items
            if clean_text(item.get("Bioremediation Mechanism"))
        })

        soil_types = sorted({
            clean_text(item.get("Soil Type"))
            for item in items
            if clean_text(item.get("Soil Type"))
        })

        result = {
            "organism": organism,
            "category": category,
            "sample_count": len(efficiencies),
            "mean_removal_efficiency": round(
                mean(efficiencies), 2
            ),
            "median_removal_efficiency": round(
                median(efficiencies), 2
            ),
            "minimum_removal_efficiency": round(
                min(efficiencies), 2
            ),
            "maximum_removal_efficiency": round(
                max(efficiencies), 2
            ),
            "mean_ph": round(mean(ph_values), 2)
            if ph_values else None,
            "mean_temperature_c": round(
                mean(temperature_values), 2
            ) if temperature_values else None,
            "mechanisms": mechanisms,
            "soil_types": soil_types,
            "evidence_level": (
    "Better represented in this dataset"
    if len(efficiencies) >= 5
    else "Limited observations"
    if len(efficiencies) >= 3
    else "Very limited observations"
),
        }

        results_by_unit[concentration_unit][category].append(result)

    rankings = {}

    for concentration_unit, categories in results_by_unit.items():

        rankings[concentration_unit] = {}

        for category, organism_results in categories.items():

            mean_ranked = sorted(
                organism_results,
                key=lambda item: (
                    item["mean_removal_efficiency"],
                    item["sample_count"],
                ),
                reverse=True,
            )

            median_ranked = sorted(
                organism_results,
                key=lambda item: (
                    item["median_removal_efficiency"],
                    item["sample_count"],
                ),
                reverse=True,
            )

            rankings[concentration_unit][category] = {
                "organism_count": len(organism_results),
                "mean_ranked": mean_ranked,
                "median_ranked": median_ranked,
            }

    total_analyzed = sum(
        len(items)
        for items in grouped.values()
    )

    return {
        "analysis": "Microorganism Pb removal performance",
        "total_records_analyzed": total_analyzed,
        "excluded_review_records": excluded_reviews,
        "excluded_invalid_records": excluded_invalid,
        "units_analyzed": sorted(rankings.keys()),
        "rankings": rankings,
        "ranking_method": (
            "Separate descending rankings by mean and median "
            "reported removal efficiency. Sample count is shown "
            "for every organism."
        ),
        "scientific_notes": [
            "mg/L and mg/kg results are analyzed separately.",
            "Mixed communities are not classified as individual species.",
            "Multi-organism labels are retained separately.",
            "Review-labelled records are excluded from performance rankings.",
            "A higher removal percentage does not necessarily mean "
            "greater long-term soil restoration.",
            "Removal efficiency does not establish whether lead was "
            "removed from the soil or immobilized within it.",
            "The dataset verification label is not independent proof "
            "that every reported measurement has been source-validated.",
        ],
    }

