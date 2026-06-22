from typing import Any
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    compound: str = Field(..., description="Primary compound or API name")
    keywords: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    limit_per_source: int = Field(default=5, ge=1, le=25)


class SearchResult(BaseModel):
    title: str
    source_database: str
    source_url: str | None = None
    authors: str | None = None
    journal: str | None = None
    publication_year: int | None = None
    doi: str | None = None
    pmid: str | None = None
    nct_id: str | None = None
    fda_identifier: str | None = None
    pubchem_cid: str | None = None
    smiles: str | None = None
    study_type: str | None = None
    snippet: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


class StudyIntakeCreate(BaseModel):
    compound: str
    synonyms: str | None = None
    title: str
    source_database: str
    source_url: str | None = None
    authors: str | None = None
    journal: str | None = None
    publication_year: int | None = None
    doi: str | None = None
    pmid: str | None = None
    nct_id: str | None = None
    fda_identifier: str | None = None
    pubchem_cid: str | None = None
    smiles: str | None = None
    ich_m7_relevance: str | None = None
    glp_compliant: bool = False
    study_type: str | None = None
    species: str | None = None
    route_of_administration: str | None = None
    dosage: str | None = None
    exposure_duration: str | None = None
    toxicology_endpoint: str | None = None
    noael: str | None = None
    loel: str | None = None
    key_findings: str | None = None
    data_quality_score: int | None = None
    data_quality_rationale: str | None = None
    reference_grade: str | None = None
    reviewer_name: str | None = None
    extraction_notes: str | None = None
    source_bundle: str | None = None
    status: str = "draft"


class StudyIntakeResponse(StudyIntakeCreate):
    id: int

    class Config:
        from_attributes = True


class SummaryRequest(BaseModel):
    compound: str
    keywords: list[str] = Field(default_factory=list)
    selected_articles: list[SearchResult] = Field(default_factory=list)
    user_notes: str | None = None


class SummaryResponse(BaseModel):
    report_markdown: str
