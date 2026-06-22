from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class StudyIntake(Base):
    __tablename__ = "study_intakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compound: Mapped[str] = mapped_column(String(255), index=True)
    synonyms: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(1000))
    source_database: Mapped[str] = mapped_column(String(100))
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authors: Mapped[str | None] = mapped_column(Text, nullable=True)
    journal: Mapped[str | None] = mapped_column(String(500), nullable=True)
    publication_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    doi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pmid: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nct_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fda_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pubchem_cid: Mapped[str | None] = mapped_column(String(50), nullable=True)
    smiles: Mapped[str | None] = mapped_column(Text, nullable=True)
    ich_m7_relevance: Mapped[str | None] = mapped_column(String(255), nullable=True)
    glp_compliant: Mapped[bool] = mapped_column(Boolean, default=False)
    study_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    species: Mapped[str | None] = mapped_column(String(255), nullable=True)
    route_of_administration: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dosage: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exposure_duration: Mapped[str | None] = mapped_column(String(255), nullable=True)
    toxicology_endpoint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    noael: Mapped[str | None] = mapped_column(String(255), nullable=True)
    loel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    key_findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    data_quality_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reviewer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extraction_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
