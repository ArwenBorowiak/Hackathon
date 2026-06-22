import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.connectors.registry import CONNECTORS
from app.db.session import get_db
from app.models.study_intake import StudyIntake
from app.schemas.common import SearchRequest, SearchResponse, SearchResult, StudyIntakeCreate, StudyIntakeResponse, SummaryRequest, SummaryResponse
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
            results.append(SearchResult(
                title=f"Connector error for {source}",
                source_database=source,
                snippet=str(exc),
                raw={},
            ))
    return SearchResponse(query=query, results=results)


@router.post("/create-summary", response_model=SummaryResponse)
def create_summary(payload: SummaryRequest):
    articles = payload.selected_articles
    if not articles:
        raise HTTPException(status_code=400, detail="Select at least one article")

    intro = [
        f"# Evidence Summary Draft: {payload.compound}",
        "",
        f"**Query focus:** {payload.compound}" + (f"; keywords: {', '.join(payload.keywords)}" if payload.keywords else ""),
        "",
        "> This draft is based on retrieved metadata and snippets available in the application. Validate all statements against the full source text before research, regulatory, or dossier use.",
        "",
        "## Included sources",
        "",
    ]

    refs = []
    evidence = []
    contradictions = []
    for idx, article in enumerate(articles, start=1):
        citation = f"{article.authors or 'Unknown author'}. "{article.title}". {article.journal or article.source_database}" + (f", {article.publication_year}" if article.publication_year else "")
        if article.doi:
            citation += f". DOI: {article.doi}"
        elif article.pmid:
            citation += f". PMID: {article.pmid}"
        elif article.nct_id:
            citation += f". NCT ID: {article.nct_id}"
        if article.source_url:
            citation += f". URL: {article.source_url}"
        refs.append(f"{idx}. {citation}")

        if article.snippet:
            evidence.append(
                f"Based on {citation}, the retrieved snippet indicates: {article.snippet}"
            )
        else:
            evidence.append(
                f"Based on {citation}, no snippet text was available in the current retrieval; the full source should be reviewed directly."
            )

        low = (article.snippet or "").lower()
        if any(term in low for term in ["no effect", "not", "lack", "failed", "negative", "did not"]):
            contradictions.append(citation)

    sections = intro + [f"- {r}" for r in refs] + ["", "## Narrative summary", ""]
    sections += [f"- {line}" for line in evidence]
    sections += ["", "## Consistency across retrieved sources", ""]

    if contradictions:
        sections.append("Some retrieved snippets may not align fully with one another or may indicate negative/limited findings. These should be compared in the full text before concluding consistency.")
        sections += [f"- Potentially divergent or limited wording retrieved from: {c}" for c in contradictions]
    else:
        sections.append("No explicit contradiction was identifiable from the retrieved snippets alone. This is not confirmation of agreement; it only reflects the available text retrieved in-app.")

    sections += ["", "## Research-use notes", ""]
    if payload.user_notes:
        sections.append(payload.user_notes)
    else:
        sections.append("Add reviewer interpretation, extraction decisions, and any manual findings from full-text review here.")

    sections += ["", "## References", ""] + refs

    return SummaryResponse(report_markdown="
".join(sections))


@router.get("/intakes", response_model=list[StudyIntakeResponse])
def list_intakes(db: Session = Depends(get_db)):
    rows = db.query(StudyIntake).order_by(StudyIntake.updated_at.desc()).all()
    return rows


@router.post("/intakes", response_model=StudyIntakeResponse)
def create_intake(payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    try:
        data = payload.model_dump()
        if data.get("data_quality_score") is None:
            data["data_quality_score"] = suggest_data_quality_score(
                glp_compliant=payload.glp_compliant,
                doi=payload.doi,
                source_database=payload.source_database,
                has_identifier=bool(payload.pmid or payload.nct_id or payload.fda_identifier or payload.pubchem_cid),
            )
        if not data.get("reference_grade"):
            data["reference_grade"] = suggest_reference_grade(data["data_quality_score"])
        row = StudyIntake(**data)
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
