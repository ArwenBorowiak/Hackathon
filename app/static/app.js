const SOURCE_OPTIONS = [
  { key: 'pubmed', label: 'PubMed' },
  { key: 'openalex', label: 'OpenAlex' },
  { key: 'crossref', label: 'Crossref' },
  { key: 'clinicaltrials.gov', label: 'ClinicalTrials.gov' },
  { key: 'openfda', label: 'openFDA' },
  { key: 'pubchem', label: 'PubChem' },
  { key: 'google-web', label: 'Google Web Search' },
  { key: 'fda-official', label: 'FDA Official' },
  { key: 'ema-emea', label: 'EMA / EMEA' },
  { key: 'echa-reach', label: 'ECHA / REACH' },
  { key: 'harvard-studies', label: 'Harvard Studies' },
  { key: 'nih', label: 'NIH' },
  { key: 'who', label: 'WHO' },
  { key: 'ncbi-bookshelf', label: 'NCBI Bookshelf' },
  { key: 'europe-pmc', label: 'Europe PMC' },
  { key: 'medrxiv', label: 'medRxiv' },
  { key: 'bioRxiv', label: 'bioRxiv' },
  { key: 'university-studies', label: 'University Studies' },
  { key: 'medical-institutions', label: 'Medical Institutions' },
  { key: 'clinical-guidelines', label: 'Clinical Guidelines' },
  { key: 'competitor-databases', label: 'Competitor / Regulatory Databases' },
  { key: 'hubble', label: 'Hubble' },
  { key: 'tox-literature', label: 'Toxicology Literature' },
  { key: 'ich-guidance', label: 'ICH Guidance' },
  { key: 'patents-google', label: 'Google Patents' },
  { key: 'manual-reference', label: 'Manual Reference' },
];

let selectedArticles = [];
let lastSearchResults = [];

function escapeHtml(text) {
  return (text || '').replace(/[&<>"']/g, function(m) {
    return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'})[m];
  });
}

function renderSources() {
  const box = document.getElementById('sources-box');
  box.innerHTML = SOURCE_OPTIONS.map(src => `
    <div class="form-check">
      <input class="form-check-input source-check" type="checkbox" value="${src.key}" id="src-${src.key}" ${['pubmed','openalex','crossref','clinicaltrials.gov','openfda','pubchem','fda-official','harvard-studies','google-web'].includes(src.key) ? 'checked' : ''}>
      <label class="form-check-label" for="src-${src.key}">${src.label}</label>
    </div>
  `).join('');
}

function getSelectedSources() {
  return Array.from(document.querySelectorAll('.source-check:checked')).map(el => el.value);
}

function getKeywords() {
  return document.getElementById('keywords').value.split(',').map(v => v.trim()).filter(Boolean);
}

function articleId(item) {
  return [item.source_database || '', item.title || '', item.source_url || '', item.doi || '', item.pmid || '', item.nct_id || ''].join('||');
}

function addToSelection(item) {
  const id = articleId(item);
  if (!selectedArticles.some(a => articleId(a) === id)) {
    selectedArticles.push(item);
  }
  renderSelectedArticles();
}

function removeFromSelection(id) {
  selectedArticles = selectedArticles.filter(a => articleId(a) !== id);
  renderSelectedArticles();
}

function clearSelection() {
  selectedArticles = [];
  renderSelectedArticles();
  document.getElementById('summary-output').value = '';
}

function renderSelectedArticles() {
  const box = document.getElementById('selected-articles');
  if (!selectedArticles.length) {
    box.innerHTML = '<div class="text-muted">No articles selected yet.</div>';
    return;
  }
  box.innerHTML = selectedArticles.map((item, idx) => {
    const id = encodeURIComponent(articleId(item));
    const openBtn = item.source_url ? `<a class="btn btn-sm btn-outline-primary" href="${item.source_url}" target="_blank" rel="noopener noreferrer">Open article</a>` : '';
    return `
      <div class="border rounded-3 p-2 mb-2 bg-white">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">Article ${idx + 1}: ${escapeHtml(item.title || 'Untitled')}</div>
            <div class="small text-muted">${escapeHtml(item.source_database || '')}${item.publication_year ? ' · ' + item.publication_year : ''}</div>
            <div class="small">${escapeHtml(item.authors || '')}</div>
          </div>
          <div class="result-actions">
            ${openBtn}
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromSelection(decodeURIComponent('${id}'))">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderResults(results) {
  const container = document.getElementById('results');
  const meta = document.getElementById('result-meta');
  lastSearchResults = results || [];
  meta.textContent = `${lastSearchResults.length} result(s)`;
  if (!lastSearchResults.length) {
    container.innerHTML = '<div class="text-muted">No results found.</div>';
    return;
  }

  container.innerHTML = lastSearchResults.map(item => {
    const payload = encodeURIComponent(JSON.stringify(item));
    const openBtn = item.source_url
      ? `<a class="btn btn-sm btn-outline-primary" href="${item.source_url}" target="_blank" rel="noopener noreferrer">Open article</a>`
      : '';
    return `
      <div class="result-card border rounded-3 p-3 mb-3 bg-white">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="fw-semibold mb-1">${escapeHtml(item.title || 'Untitled')}</div>
            <div class="small text-muted mb-1">${escapeHtml(item.source_database || '')}${item.publication_year ? ' · ' + item.publication_year : ''}</div>
            <div class="small mb-1">${escapeHtml(item.authors || '')}</div>
            <div class="small mb-2">${escapeHtml(item.journal || '')}</div>
            <div class="small">${escapeHtml(item.snippet || '')}</div>
          </div>
          <div class="result-actions">
            ${openBtn}
            <button class="btn btn-sm btn-primary" onclick="addToSelection(JSON.parse(decodeURIComponent('${payload}')))" type="button">Save to intake</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function runSearch(evt) {
  evt.preventDefault();
  const container = document.getElementById('results');
  const meta = document.getElementById('result-meta');
  const compound = document.getElementById('compound').value.trim();
  const sources = getSelectedSources();
  if (!compound) {
    alert('Enter a Compound / API first.');
    return;
  }
  if (!sources.length) {
    alert('Select at least one source.');
    return;
  }

  container.innerHTML = '<div class="text-muted">Searching...</div>';
  meta.textContent = 'Searching...';

  const payload = {
    compound,
    keywords: getKeywords(),
    sources,
    limit_per_source: parseInt(document.getElementById('limit').value, 10) || 5
  };

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      container.innerHTML = `<div class="text-danger">Search failed: ${escapeHtml(data.detail || JSON.stringify(data))}</div>`;
      meta.textContent = 'Search failed';
      return;
    }
    renderResults(data.results || []);
  } catch (err) {
    container.innerHTML = `<div class="text-danger">Search failed: ${escapeHtml(String(err))}</div>`;
    meta.textContent = 'Search failed';
  }
}

function buildSourceBundle() {
  return selectedArticles.map(a => {
    return [a.source_database || '', a.title || '', a.source_url || '', a.authors || ''].join(' | ');
  }).join('
');
}

async function saveIntake() {
  const compound = document.getElementById('compound').value.trim();
  if (!selectedArticles.length) {
    alert('Select at least one article first.');
    return;
  }

  const title = document.getElementById('intake-title').value.trim() || `${compound} evidence intake`;
  const uniqueSources = [...new Set(selectedArticles.map(a => a.source_database).filter(Boolean))].join(', ');
  const primary = selectedArticles[0] || {};
  const payload = {
    compound,
    title,
    source_database: uniqueSources || primary.source_database || 'mixed-sources',
    source_url: primary.source_url || null,
    authors: primary.authors || null,
    journal: primary.journal || null,
    publication_year: primary.publication_year || null,
    doi: primary.doi || null,
    pmid: primary.pmid || null,
    nct_id: primary.nct_id || null,
    fda_identifier: primary.fda_identifier || null,
    pubchem_cid: primary.pubchem_cid || null,
    smiles: primary.smiles || null,
    ich_m7_relevance: document.getElementById('ich-m7').value.trim() || null,
    toxicology_endpoint: document.getElementById('tox-endpoint').value.trim() || null,
    noael: document.getElementById('noael').value.trim() || null,
    dosage: document.getElementById('dosage').value.trim() || null,
    reference_grade: document.getElementById('reference-grade').value.trim() || null,
    reviewer_name: document.getElementById('reviewer-name').value.trim() || null,
    key_findings: document.getElementById('reviewer-notes').value.trim() || null,
    extraction_notes: document.getElementById('reviewer-notes').value.trim() || null,
    source_bundle: buildSourceBundle(),
    status: 'draft'
  };

  try {
    const res = await fetch('/api/intakes', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Save failed: ${data.detail || JSON.stringify(data)}`);
      return;
    }
    alert('Intake saved');
    loadIntakes();
  } catch (err) {
    alert(`Save failed: ${err}`);
  }
}

async function createSummary() {
  const compound = document.getElementById('compound').value.trim();
  if (!selectedArticles.length) {
    alert('Select at least one article first.');
    return;
  }
  const payload = {
    compound,
    keywords: getKeywords(),
    selected_articles: selectedArticles,
    user_notes: document.getElementById('reviewer-notes').value.trim() || null,
  };
  const output = document.getElementById('summary-output');
  output.value = 'Creating summary...';
  try {
    const res = await fetch('/api/create-summary', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      output.value = `Summary failed: ${data.detail || JSON.stringify(data)}`;
      return;
    }
    output.value = data.report_markdown || '';
  } catch (err) {
    output.value = `Summary failed: ${err}`;
  }
}

async function loadIntakes() {
  const el = document.getElementById('intakes');
  try {
    const res = await fetch('/api/intakes');
    const data = await res.json();
    if (!res.ok) {
      el.innerHTML = '<div class="text-danger">Failed to load intakes.</div>';
      return;
    }
    if (!data.length) {
      el.innerHTML = '<div class="text-muted">No saved intakes yet.</div>';
      return;
    }
    el.innerHTML = data.map(item => `
      <div class="border rounded-3 p-3 mb-2 bg-white">
        <div class="d-flex justify-content-between gap-2 align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(item.title)}</div>
            <div class="small text-muted">${escapeHtml(item.compound)} · ${escapeHtml(item.source_database || '')}</div>
            <div class="small mt-1">${escapeHtml(item.key_findings || '')}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteIntake(${item.id})" type="button">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = '<div class="text-danger">Failed to load intakes.</div>';
  }
}

async function deleteIntake(id) {
  await fetch(`/api/intakes/${id}`, { method: 'DELETE' });
  loadIntakes();
}

document.getElementById('search-form').addEventListener('submit', runSearch);
document.getElementById('save-intake-btn').addEventListener('click', saveIntake);
document.getElementById('create-summary-btn').addEventListener('click', createSummary);
document.getElementById('clear-selection').addEventListener('click', clearSelection);

renderSources();
renderSelectedArticles();
loadIntakes();
