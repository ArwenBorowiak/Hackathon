import csv
import io
import zipfile
from typing import List
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.connectors.registry import CONNECTORS
from app.db.session import get_db
from app.models.study_intake import StudyIntake
from app.schemas.common import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    StudyIntakeCreate,
    StudyIntakeResponse,
    SummaryRequest,
    SummaryResponse,
)
from app.services.scoring import (
    suggest_data_quality_score,
    suggest_reference_grade,
)

router = APIRouter(prefix="/api", tags=["api"])

JUMPOFF_SOURCES = {
    "google-web",
    "manual-reference",
    "harvard-studies",
    "ema-emea",
    "echa-reach",
    "nih",
    "who",
    "university-studies",
    "medical-institutions",
    "tox-literature",
    "ich-guidance",
    "fda-official",
    "europe-pmc",
    "ncbi-bookshelf",
    "patents-google",
}


def build_citation(article: SearchResult) -> str:
    citation = f'{article.authors or "Unknown author"}. "{article.title}". {article.journal or article.source_database}'
    if article.publication_year:
        citation += f", {article.publication_year}"
    if article.doi:
        citation += f". DOI: {article.doi}"
    elif article.pmid:
        citation += f". PMID: {article.pmid}"
    elif article.nct_id:
        citation += f". NCT ID: {article.nct_id}"
    if article.source_url:
        citation += f". URL: {article.source_url}"
    return citation


def build_report_text(payload: SummaryRequest) -> str:
    articles = [
        a for a in payload.selected_articles if a.source_database not in JUMPOFF_SOURCES
    ]

    if not articles:
        raise HTTPException(
            status_code=400,
            detail="Select at least one real article (not Google/manual search links)",
        )

    refs = []
    article_sections = []
    comparison = []

    for i, a in enumerate(articles, 1):
        citation = build_citation(a)
        refs.append(f"{i}. {citation}")

        snippet = a.snippet or "No snippet available"

        article_sections.append(f"### Article {i}: {a.title}")
        article_sections.append(f"- Citation: {citation}")
        article_sections.append(f"- Evidence: {snippet}")
        article_sections.append("")

        if any(w in snippet.lower() for w in ["no effect", "failed", "not"]):
            comparison.append(f"- {citation} suggests weak or negative findings")
        else:
            comparison.append(f"- {citation} appears supportive (snippet-based only)")

    lines = [
        f"# Evidence Summary: {payload.compound}",
        "",
        "## Executive Summary",
        f"{len(articles)} articles reviewed for {payload.compound}",
        "",
        "## Articles",
        "",
    ]

    lines.extend(refs)
    lines.append("")
    lines.append("## Article Details")
    lines.append("")
    lines.extend(article_sections)

    lines.append("## Comparison")
    lines.append("")
    lines.extend(comparison)

    lines.append("")
    lines.append("## Notes")
    lines.append(payload.user_notes or "None")

    return "\n".join(lines)


def build_docx(text: str) -> bytes:
    paragraphs = [
        f'<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>'
        for line in text.split("\n")
    ]

    doc_xml = f"""
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        {''.join(paragraphs)}
      </w:body>
    </w:document>
    """

    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as z:
        z.writestr("word/document.xml", doc_xml)
        z.writestr("[Content_Types].xml", "")
    bio.seek(0)
    return bio.getvalue()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
async def search(payload: SearchRequest):
    results = []
    for src in payload.sources or CONNECTORS.keys():
        c = CONNECTORS.get(src)
        if not c:
            continue
        try:
            results.extend(
                await c.search(
                    payload.compound,
                    payload.keywords,
                    payload.limit_per_source,
                )
            )
        except Exception as e:
            results.append(
                SearchResult(
                    title="Error",
                    source_database=src,
                    snippet=str(e),
                    raw={},
                )
            )
    return SearchResponse(query=payload.compound, results=results)


@router.post("/create-summary", response_model=SummaryResponse)
def create_summary(payload: SummaryRequest):
    return SummaryResponse(report_markdown=build_report_text(payload))


@router.post("/create-summary-docx")
def create_docx(payload: SummaryRequest):
    text = build_report_text(payload)
    file = build_docx(text)
    return StreamingResponse(
        io.BytesIO(file),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.post("/intakes", response_model=StudyIntakeResponse)
def create_intake(payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    row = StudyIntake(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)):
    rows = db.query(StudyIntake).all()
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["compound", "title", "source_database"])

    for r in rows:
        writer.writerow([r.compound, r.title, r.source_database])

    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
