import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.connectors.registry import CONNECTORS
from app.db.session import get_db
from app.models.study_intake import StudyIntake
from app.schemas.common import SearchRequest, SearchResponse, SearchResult, StudyIntakeCreate, StudyIntakeResponse
from app.services.scoring import suggest_data_quality_score, suggest_reference_grade

router = APIRouter(prefix="/api", tags=["api"])

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/sources")
def sources():
    return {"sources": sorted(CONNECTORS.keys())}

@router.post("/search", response_model=SearchResponse)
async def search(payload: SearchRequest):
    requested = payload.sources or list(CONNECTORS.keys())
    results: list[SearchResult] = []
    query = " ".join([payload.compound] + payload.keywords).strip()
    for source in requested:
        connector = CONNECTORS.get(source)
        if not connector:
            continue
        try:
            results.extend(await connector.search(payload.compound, payload.keywords, payload.limit_per_source))
        except Exception as exc:
            results.append(SearchResult(title=f"Connector error for {source}", source_database=source, snippet=str(exc), raw={}))
    return SearchResponse(query=query, results=results)

@router.get("/intakes", response_model=list[StudyIntakeResponse])
def list_intakes(db: Session = Depends(get_db)):
    return db.query(StudyIntake).order_by(StudyIntake.updated_at.desc()).all()

@router.post("/intakes", response_model=StudyIntakeResponse)
def create_intake(payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    try:
        score = payload.data_quality_score
        if score is None:
            score = suggest_data_quality_score(
                glp_compliant=payload.glp_compliant,
                doi=payload.doi,
                source_database=payload.source_database,
                has_identifier=bool(payload.pmid or payload.nct_id or payload.fda_identifier or payload.pubchem_cid),
            )
        grade = payload.reference_grade or suggest_reference_grade(score)
        row = StudyIntake(**payload.model_dump(), data_quality_score=score, reference_grade=grade)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(exc)}")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Save failed: {str(exc)}")

@router.put("/intakes/{intake_id}", response_model=StudyIntakeResponse)
def update_intake(intake_id: int, payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    row = db.query(StudyIntake).filter(StudyIntake.id == intake_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Intake not found")
    try:
        for key, value in payload.model_dump().items():
            setattr(row, key, value)
        if row.data_quality_score is None:
            row.data_quality_score = suggest_data_quality_score(
                glp_compliant=row.glp_compliant,
                doi=row.doi,
                source_database=row.source_database,
                has_identifier=bool(row.pmid or row.nct_id or row.fda_identifier or row.pubchem_cid),
            )
        if not row.reference_grade:
            row.reference_grade = suggest_reference_grade(row.data_quality_score)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(exc)}")

@router.delete("/intakes/{intake_id}", response_class=PlainTextResponse)
def delete_intake(intake_id: int, db: Session = Depends(get_db)):
    row = db.query(StudyIntake).filter(StudyIntake.id == intake_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Intake not found")
    db.delete(row)
    db.commit()
    return "deleted"

@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)):
    rows = db.query(StudyIntake).all()
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "id", "compound", "title", "source_database", "source_url", "authors", "journal", "publication_year",
        "doi", "pmid", "nct_id", "fda_identifier", "pubchem_cid", "smiles", "ich_m7_relevance", "glp_compliant",
        "study_type", "species", "route_of_administration", "dosage", "exposure_duration", "toxicology_endpoint",
        "noael", "loel", "key_findings", "data_quality_score", "data_quality_rationale", "reference_grade",
        "reviewer_name", "source_bundle", "extraction_notes", "status", "created_at", "updated_at"
    ]
    writer.writerow(headers)
    for r in rows:
        writer.writerow([getattr(r, h) for h in headers])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=intakes.csv"})
