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
from app.schemas.common import SearchRequest, SearchResponse, SearchResult, StudyIntakeCreate, StudyIntakeResponse, SummaryRequest, SummaryResponse
from app.services.scoring import suggest_data_quality_score, suggest_reference_grade

router = APIRouter(prefix="/api", tags=["api"])
JUMPOFF_SOURCES = {
    'google-web','manual-reference','harvard-studies','ema-emea','echa-reach','nih','who','university-studies','medical-institutions','tox-literature','ich-guidance','fda-official','europe-pmc','ncbi-bookshelf','patents-google'
}


def build_citation(article: SearchResult) -> str:
    citation = f'{article.authors or "Unknown author"}. "{article.title}". {article.journal or article.source_database}'
    if article.publication_year:
        citation += f', {article.publication_year}'
    if article.doi:
        citation += f'. DOI: {article.doi}'
    elif article.pmid:
        citation += f'. PMID: {article.pmid}'
    elif article.nct_id:
        citation += f'. NCT ID: {article.nct_id}'
    elif article.fda_identifier:
        citation += f'. FDA ID: {article.fda_identifier}'
    if article.source_url:
        citation += f'. URL: {article.source_url}'
    return citation


def build_report_text(payload: SummaryRequest) -> str:
    articles = [a for a in payload.selected_articles if a.source_database not in JUMPOFF_SOURCES]
    if not articles:
        raise HTTPException(status_code=400, detail='Select at least one actual article/public record. Jump-off search links are excluded from the report.')

    refs: List[str] = []
    article_sections: List[str] = []
    comparison_lines: List[str] = []

    for idx, article in enumerate(articles, start=1):
        citation = build_citation(article)
        refs.append(f'{idx}. {citation}')
        snippet = article.snippet or 'No snippet text was retrieved for this article; review the full source directly.'
        article_sections.extend([
            f'### Article {idx}: {article.title}',
            f'- Citation: {citation}',
            f'- Source relevance to query: The retrieved record is being considered for the query on {payload.compound}' + (f' with keywords {", ".join(payload.keywords)}.' if payload.keywords else '.'),
            f'- Retrieved evidence summary: {snippet}',
            ''
        ])
        low = (snippet or '').lower()
        if any(term in low for term in ['no effect', 'did not', 'negative', 'lack', 'failed']):
            comparison_lines.append(f'- {citation} includes wording that may indicate a limited, negative, or non-supportive finding based on the retrieved snippet.')
        else:
            comparison_lines.append(f'- {citation} appears potentially supportive or descriptive based on the retrieved snippet, but full-text review is required to confirm interpretation.')

    lines = [
        f'# Evidence Summary Draft: {payload.compound}',
        '',
        '## Executive summary',
        f'This report compiles {len(articles)} selected article-like/public records retrieved for the search focus on {payload.compound}' + (f' with the keywords {", ".join(payload.keywords)}.' if payload.keywords else '.'),
        'The draft below is based only on metadata, source links, and retrieved snippets available in the application. It should not be treated as a final scientific or regulatory interpretation until each full source has been reviewed manually.',
        '',
        '## Search overview',
        f'- Compound / API searched: {payload.compound}',
        f'- Keywords: {", ".join(payload.keywords) if payload.keywords else "None provided"}',
        f'- Number of article-like/public records included in report: {len(articles)}',
        '',
        '## Included articles',
        ''
    ]
    lines.extend([f'- {r}' for r in refs])
    lines.extend(['', '## Article-by-article review', ''])
    lines.extend(article_sections)
    lines.extend(['## Article comparison and consistency check', ''])
    lines.extend(comparison_lines)
    lines.extend(['', '## Reviewer notes', payload.user_notes or 'No reviewer notes added.', '', '## References', ''])
    lines.extend(refs)
    return '\n'.join(lines)


def build_simple_docx(report_text: str) -> bytes:
    lines = report_text.split('\n')
    paragraphs = []
    for line in lines:
        text = escape(line)
        if line.startswith('# '):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>{text[2:]}</w:t></w:r></w:p>')
        elif line.startswith('## '):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>{text[3:]}</w:t></w:r></w:p>')
        elif line.startswith('### '):
            paragraphs.append(f'<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{text[4:]}</w:t></w:r></w:p>')
        elif line == '':
            paragraphs.append('<w:p/>')
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
        '<w:body>' + ''.join(paragraphs) +
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
    with zipfile.ZipFile(bio, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types)
        zf.writestr('_rels/.rels', rels)
        zf.writestr('word/document.xml', document_xml)
    bio.seek(0)
    return bio.getvalue()


@router.get('/health')
def health():
    return {'status': 'ok'}


@router.get('/sources')
def sources():
    return {'sources': sorted(CONNECTORS.keys())}


@router.post('/search', response_model=SearchResponse)
async def search(payload: SearchRequest):
    requested = payload.sources or list(CONNECTORS.keys())
    results: list[SearchResult] = []
    query = ' '.join([payload.compound] + payload.keywords).strip()
    for source in requested:
        connector = CONNECTORS.get(source)
        if not connector:
            continue
        try:
            results.extend(await connector.search(payload.compound, payload.keywords, payload.limit_per_source))
        except Exception as exc:
            results.append(SearchResult(title=f'Connector error for {source}', source_database=source, snippet=str(exc), raw={}))
    return SearchResponse(query=query, results=results)


@router.post('/create-summary', response_model=SummaryResponse)
def create_summary(payload: SummaryRequest):
    return SummaryResponse(report_markdown=build_report_text(payload))


@router.post('/create-summary-docx')
def create_summary_docx(payload: SummaryRequest):
    report_text = build_report_text(payload)
    data = build_simple_docx(report_text)
    filename = f"{payload.compound or 'report'}-evidence-summary.docx"
    return StreamingResponse(io.BytesIO(data), media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@router.get('/intakes', response_model=list[StudyIntakeResponse])
def list_intakes(db: Session = Depends(get_db)):
    rows = db.query(StudyIntake).order_by(StudyIntake.updated_at.desc()).all()
    return rows


@router.post('/intakes', response_model=StudyIntakeResponse)
def create_intake(payload: StudyIntakeCreate, db: Session = Depends(get_db)):
    try:
        data = payload.model_dump()
        if data.get('data_quality_score') is None:
            data['data_quality_score'] = suggest_data_quality_score(
                glp_compliant=payload.glp_compliant,
                doi=payload.doi,
                source_database=payload.source_database,
                has_identifier=bool(payload.pmid or payload.nct_id or payload.fda_identifier or payload.pubchem_cid),
            )
        if not data.get('reference_grade'):
            data['reference_grade'] = suggest_reference_grade(data['data_quality_score'])
        row = StudyIntake(**data)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Database save failed: {str(exc)}')
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Save failed: {str(exc)}')


@router.delete('/intakes/{intake_id}', response_class=PlainTextResponse)
def delete_intake(intake_id: int, db: Session = Depends(get_db)):
    row = db.query(StudyIntake).filter(StudyIntake.id == intake_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Intake not found')
    db.delete(row)
    db.commit()
    return 'deleted'


@router.get('/export.csv')
def export_csv(db: Session = Depends(get_db)):
    rows = db.query(StudyIntake).all()
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        'id','compound','title','source_database','source_url','authors','journal','publication_year',
        'doi','pmid','nct_id','fda_identifier','pubchem_cid','smiles','ich_m7_relevance','glp_compliant',
        'study_type','species','route_of_administration','dosage','exposure_duration','toxicology_endpoint',
        'noael','loel','key_findings','data_quality_score','data_quality_rationale','reference_grade',
        'reviewer_name','source_bundle','extraction_notes','status','created_at','updated_at'
    ]
    writer.writerow(headers)
    for r in rows:
        writer.writerow([getattr(r, h) for h in headers])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=intakes.csv'})
