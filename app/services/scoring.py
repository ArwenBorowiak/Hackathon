from typing import Optional


def suggest_data_quality_score(glp_compliant: bool, doi: Optional[str], source_database: str, has_identifier: bool) -> int:
    score = 0
    if glp_compliant:
        score += 3
    if doi:
        score += 2
    if source_database.lower() in {"pubmed", "clinicaltrials.gov", "openfda", "pubchem", "crossref", "openalex"}:
        score += 2
    if has_identifier:
        score += 1
    return min(score, 8)


def suggest_reference_grade(score: int) -> str:
    if score >= 7:
        return "A"
    if score >= 5:
        return "B"
    if score >= 3:
        return "C"
    return "D"
