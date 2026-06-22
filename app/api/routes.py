import csv
import zipfileimport io
from typing import List
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
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
from app.services.scoring import suggest_data_quality_score, suggest_reference_grade

router = APIRouter(prefix="/api", tags=["api"])


def fetch_public_page_text(url: str, limit: int = 12000) -> str:
    """
    Best-effort fetch for public HTML/text pages.
    It will not reliably work for paywalled sites, logged-in content, blocked bots, or many PDFs.
    """
    if not url:
        return ""

    try:
        req = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; DossierIntakeBot/1.0)"
            },
        )
        with urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read(limit).decode("utf-8", errors="ignore")

        # only attempt HTML/text cleanup
        if "html" in content_type or "text" in content_type or content_type == "":
            raw = re.sub(r"(?is)<script.*?>.*?</script>", " ", raw)
            raw = re.sub(r"(?is)<style.*?>.*?</style>", " ", raw)
            raw = re.sub(r"(?s)<[^>]+>", " ", raw)
            raw = re.sub(r"\s+", " ", raw).strip()
            return raw[:limit]

        return ""
    except (URLError, HTTPError, ValueError, TimeoutError):
        return ""
    except Exception:
        return ""


def sentence_split(text: str) -> List[str]:
    parts = re.split(r'(?<=[.!?])\s+', text or "")
    return [p.strip() for p in parts if p.strip()]


def extract_relevant_sentences(text: str, compound: str, keywords: List[str], max_sentences: int = 6) -> List[str]:
    if not text:
        return []

    compound_l = (compound or "").lower()
    keywords_l = [k.lower() for k in (keywords or [])]

    sents = sentence_split(text)

    ranked = []
    for s in sents:
        sl = s.lower()
        score = 0
        if compound_l and compound_l in sl:
            score += 3
        for k in keywords_l:
            if k and k in sl:
                score += 1
        if score > 0:
            ranked.append((score, s))

    ranked.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in ranked[:max_sentences]]


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
    articles = payload.selected_articles
    if not articles:
        raise HTTPException(status_code=400, detail="Select at least one article first.")

    refs: List[str] = []
    article_sections: List[str] = []
    comparison_lines: List[str] = []

    supportive = 0
    limited = 0

    for idx, article in enumerate(articles, start=1):
        citation = build_citation(article)
        refs.append(f"{idx}. {citation}")

        fetched_text = fetch_public_page_text(article.source_url or "")
        relevant_sentences = extract_relevant_sentences(
            fetched_text,
            payload.compound,
            payload.keywords,
            max_sentences=6,
        )

        if relevant_sentences:
            evidence_summary = " ".join(relevant_sentences)
        else:
            evidence_summary = article.snippet or "No retrievable public text was available from the selected URL, so the report falls back to stored snippet/metadata only."

        article_sections.extend([
            f"### Article {idx}: {article.title}",
            f"- Citation: {citation}",
            f"- Source relevance to query: The article was selected for the compound/API {payload.compound}" +
            (f" with the query terms {', '.join(payload.keywords)}." if payload.keywords else "."),
            f"- Retrieved evidence summary: {evidence_summary}",
            ""
        ])

        low = evidence_summary.lower()
        if any(term in low for term in ["no effect", "did not", "negative", "lack", "failed", "not significant"]):
            limited += 1
            comparison_lines.append(
                f"- {citation} includes wording that may indicate limited, negative, or non-supportive findings based on the retrieved text/snippet."
            )
        else:
            supportive += 1
            comparison_lines.append(
                f"- {citation} appears potentially supportive or descriptive for the query based on the retrieved text/snippet, pending full expert review."
            )

    lines = [
        f"# Evidence Summary Draft: {payload.compound}",
        "",
        "## Executive Summary",
        f"This report compiles {len(articles)} selected source records for the compound/API {payload.compound}" +
        (f" using the query terms {', '.join(payload.keywords)}." if payload.keywords else "."),
        "The report attempts to read each selected public URL directly. If a selected page cannot be read because it is blocked, unavailable, or not publicly accessible, the report falls back to stored snippet/metadata only.",
        f"Based on the retrieved content, {supportive} article(s) appeared potentially supportive/descriptive and {limited} article(s) appeared limited or potentially non-supportive, using simple keyword-based interpretation of retrieved text rather than a final scientific judgment.",
        "",
        "## Search Overview",
        f"- Compound / API searched: {payload.compound}",
        f"- Keywords: {', '.join(payload.keywords) if payload.keywords else 'None provided'}",
        f"- Number of selected sources: {len(articles)}",
        "",
        "## Included Articles",
        "",
    ]

    lines.extend([f"- {r}" for r in refs])

    lines.extend([
        "",
        "## Article-by-Article Review",
        "",
    ])
    lines.extend(article_sections)

    lines.extend([
        "## Cross-Article Comparison",
        "",
    ])
    lines.extend(comparison_lines)

    lines.extend([
        "",
        "## Reviewer Notes",
        payload.user_notes or "No reviewer notes added.",
        "",
        "## References",
        "",
    ])
    lines.extend(refs)

    return "\n".join(lines)


def build_simple_docx(report_text: str) -> bytes:
    lines = report_text.split("\n")
    paragraphs: List[str] = []

    for line in lines:
        text = escape(line)
        if line.startswith("# "):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>{text[2:]}</w:t></w:r></w:p>')
        elif line.startswith("## "):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>{text[3:]}</w:t></w:r></w:p>')
        elif line.startswith("### "):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{text[4:]}</w:t></w:r></w:p>')
        elif line == "":
            paragraphs.append("<w:p/>")
        else:
            paragraphs.append(f'<w:p><w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>')

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 wp14">'
        '<w:body>' + "".join(paragraphs) +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        '</w:sectPr></w:body></w:document>'
    )

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '</Types>'
    )

    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>'
    )

    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
    bio.seek(0)
    return bio.getvalue()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/sources")
def sources():
    return {"sources": sorted(CONNECTORS.keys())}


@router.post("/search", response_model=SearchResponse)
async def search(payload: SearchRequest):
    requested = payload.sources or list(CONNECTORS.keys())
    results: List[SearchResult] = []

    for source in requested:
        connector = CONNECTORS.get(source)
        if not connector:
            continue

        try:
            results.extend(
                await connector.search(
                    payload.compound,
                    payload.keywords,
                    payload.limit_per_source,
                )
            )
        except Exception as exc:
            results.append(
                SearchResult(
                    title=f"Connector error for {source}",
                    source_database=source,
                    snippet=str(exc),
                    raw={},
                )
            )

    return SearchResponse(query=payload.compound, results=results)


@router.post("/create-summary", response_model=SummaryResponse)
def create_summary(payload: SummaryRequest):
    return SummaryResponse(report_markdown=build_report_text(payload))


@router.post("/create-summary-docx")
def create_summary_docx(payload: SummaryRequest):
    report_text = build_report_text(payload)
    data = build_simple_docx(report_text)
    filename = f"{payload.compound or 'report'}-evidence-summary.docx"

    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/intakes", response_model=list[StudyIntakeResponse])
def list_intakes(db: Session = Depends(get_db)):
    return db.query(StudyIntake).order_by(StudyIntake.updated_at.desc()).all()


@router.post("/intakes", response_model=StudyIntakeResponse)
def create_intake(payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    try:
        data = payload.model_dump()

        if data.get("data_quality_score") is None:
            data["data_quality_score"] = suggest_data_quality_score(
                glp_compliant=payload.glp_compliant,
                doi=payload.doi,
                source_database=payload.source_database,
                has_identifier=bool(
                    payload.pmid or payload.nct_id or payload.fda_identifier or payload.pubchem_cid
                ),
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
        "id",
        "compound",
        "title",
        "source_database",
        "source_url",
        "authors",
        "journal",
        "publication_year",
        "doi",
        "pmid",
        "nct_id",
        "fda_identifier",
        "pubchem_cid",
        "smiles",
        "ich_m7_relevance",
        "glp_compliant",
        "study_type",
        "species",
        "route_of_administration",
        "dosage",
        "exposure_duration",
        "toxicology_endpoint",
        "noael",
        "loel",
        "key_findings",
        "data_quality_score",
        "data_quality_rationale",
        "reference_grade",
        "reviewer_name",
        "source_bundle",
        "extraction_notes",
        "status",
        "created_at",
        "updated_at",
    ]

    writer.writerow(headers)

    for r in rows:
        writer.writerow([getattr(r, h) for h in headers])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=intakes.csv"},
    )
import re
