async function fetchSources() {
  const res = await fetch('/api/sources');
  const data = await res.json();
  const box = document.getElementById('sources-box');
  box.innerHTML = data.sources.map(src => `
    <div class="form-check">
      <input class="form-check-input source-check" type="checkbox" value="${src}" id="src-${src}" checked>
      <label class="form-check-label" for="src-${src}">${src}</label>
    </div>
  `).join('');
}

function getSelectedSources() {
  return Array.from(document.querySelectorAll('.source-check:checked')).map(el => el.value);
}

function toInt(val) {
  const raw = (val || '').toString().trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function appendSourceBundle(item) {
  const el = document.getElementById('i-source_bundle');
  const line = [item.source_database || '', item.title || '', item.source_url || '', item.authors || ''].join(' | ');
  const current = (el.value || '').trim();
  const lines = current ? current.split('
') : [];
  if (!lines.includes(line)) {
    el.value = current ? current + '
' + line : line;
  }
}

function collectIntakeForm() {
  return {
    compound: document.getElementById('i-compound').value.trim(),
    synonyms: null,
    title: document.getElementById('i-title').value.trim(),
    source_database: document.getElementById('i-source_database').value.trim(),
    source_url: document.getElementById('i-source_url').value.trim() || null,
    authors: document.getElementById('i-authors').value.trim() || null,
    journal: document.getElementById('i-journal').value.trim() || null,
    publication_year: toInt(document.getElementById('i-publication_year').value),
    doi: document.getElementById('i-doi').value.trim() || null,
    pmid: document.getElementById('i-pmid').value.trim() || null,
    nct_id: document.getElementById('i-nct_id').value.trim() || null,
    fda_identifier: document.getElementById('i-fda_identifier').value.trim() || null,
    pubchem_cid: document.getElementById('i-pubchem_cid').value.trim() || null,
    smiles: document.getElementById('i-smiles').value.trim() || null,
    ich_m7_relevance: document.getElementById('i-ich_m7_relevance').value.trim() || null,
    glp_compliant: document.getElementById('i-glp_compliant').checked,
    study_type: document.getElementById('i-study_type').value.trim() || null,
    species: document.getElementById('i-species').value.trim() || null,
    route_of_administration: document.getElementById('i-route_of_administration').value.trim() || null,
    dosage: document.getElementById('i-dosage').value.trim() || null,
    exposure_duration: document.getElementById('i-exposure_duration').value.trim() || null,
    toxicology_endpoint: document.getElementById('i-toxicology_endpoint').value.trim() || null,
    noael: document.getElementById('i-noael').value.trim() || null,
    loel: document.getElementById('i-loel').value.trim() || null,
    key_findings: document.getElementById('i-key_findings').value.trim() || null,
    data_quality_score: toInt(document.getElementById('i-data_quality_score').value),
    data_quality_rationale: document.getElementById('i-data_quality_rationale').value.trim() || null,
    reference_grade: document.getElementById('i-reference_grade').value.trim() || null,
    reviewer_name: document.getElementById('i-reviewer_name').value.trim() || null,
    source_bundle: document.getElementById('i-source_bundle').value.trim() || null,
    extraction_notes: document.getElementById('i-extraction_notes').value.trim() || null,
    status: document.getElementById('i-status').value || 'draft'
  };
}

function prefillIntake(item, compound) {
  document.getElementById('i-compound').value = compound || '';
  document.getElementById('i-title').value = item.title || '';
  document.getElementById('i-source_database').value = item.source_database || '';
  document.getElementById('i-source_url').value = item.source_url || '';
  document.getElementById('i-authors').value = item.authors || '';
  document.getElementById('i-journal').value = item.journal || '';
  document.getElementById('i-publication_year').value = item.publication_year || '';
  document.getElementById('i-doi').value = item.doi || '';
  document.getElementById('i-pmid').value = item.pmid || '';
  document.getElementById('i-nct_id').value = item.nct_id || '';
  document.getElementById('i-fda_identifier').value = item.fda_identifier || '';
  document.getElementById('i-pubchem_cid').value = item.pubchem_cid || '';
  document.getElementById('i-smiles').value = item.smiles || '';
  document.getElementById('i-study_type').value = item.study_type || '';
  document.getElementById('i-key_findings').value = item.snippet || '';
  appendSourceBundle(item);
  window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
}

function prefillEncoded(payload, compound) {
  prefillIntake(JSON.parse(decodeURIComponent(payload)), decodeURIComponent(compound));
}

async function runSearch(evt) {
  evt.preventDefault();
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = 'Searching...';
  const compound = document.getElementById('compound').value.trim();
  const keywords = document.getElementById('keywords').value.split(',').map(v => v.trim()).filter(Boolean);
  const payload = {
    compound,
    keywords,
    sources: getSelectedSources(),
    limit_per_source: parseInt(document.getElementById('limit').value, 10) || 5
  };
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.results || !data.results.length) {
    resultsEl.innerHTML = '<div class="text-muted">No results found.</div>';
    return;
  }
  resultsEl.innerHTML = data.results.map(item => {
    const payload = encodeURIComponent(JSON.stringify(item));
    const compoundEnc = encodeURIComponent(compound);
    return `
      <div class="result-card border rounded-3 p-3 mb-3 bg-white">
        <div class="d-flex justify-content-between gap-2">
          <div>
            <div class="fw-semibold">${item.title || 'Untitled'}</div>
            <div class="text-muted">${item.source_database || ''}${item.publication_year ? ' · ' + item.publication_year : ''}</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="prefillEncoded('${payload}','${compoundEnc}')">Use in intake</button>
        </div>
        <div class="mt-2"><strong>Authors:</strong> ${item.authors || '-'}</div>
        <div><strong>Journal/Source:</strong> ${item.journal || '-'}</div>
        <div><strong>Identifiers:</strong> DOI ${item.doi || '-'} | PMID ${item.pmid || '-'} | NCT ${item.nct_id || '-'} | CID ${item.pubchem_cid || '-'}</div>
        <div class="mt-2">${item.snippet || ''}</div>
        ${item.source_url ? `<div class="mt-2"><a href="${item.source_url}" target="_blank">Open source</a></div>` : ''}
      </div>
    `;
  }).join('');
}

async function loadIntakes() {
  const el = document.getElementById('intakes');
  const res = await fetch('/api/intakes');
  const data = await res.json();
  if (!data.length) {
    el.innerHTML = '<div class="text-muted">No saved intakes yet.</div>';
    return;
  }
  el.innerHTML = data.map(item => `
    <div class="border rounded-3 p-3 mb-2 bg-white">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div class="fw-semibold">${item.compound}: ${item.title}</div>
          <div class="text-muted">${item.source_database} · ${item.reference_grade || '-'} · quality ${item.data_quality_score ?? '-'}</div>
          <div class="small">${item.key_findings || ''}</div>
          ${item.source_bundle ? `<div class="small mt-1"><strong>Bundle:</strong><pre class="small mb-0">${item.source_bundle}</pre></div>` : ''}
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteIntake(${item.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

async function saveIntake(evt) {
  evt.preventDefault();
  const payload = collectIntakeForm();
  const id = document.getElementById('intake-id').value;
  const res = await fetch(id ? `/api/intakes/${id}` : '/api/intakes', {
    method: id ? 'PUT' : 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let message = 'Failed to save intake';
    try {
      const data = await res.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      message = await res.text();
    }
    alert(`Failed to save intake: ${message}`);
    return;
  }
  document.getElementById('intake-id').value = '';
  await loadIntakes();
  alert('Intake saved');
}

async function deleteIntake(id) {
  await fetch(`/api/intakes/${id}`, {method: 'DELETE'});
  await loadIntakes();
}

window.prefillEncoded = prefillEncoded;
window.deleteIntake = deleteIntake;
document.getElementById('search-form').addEventListener('submit', runSearch);
document.getElementById('intake-form').addEventListener('submit', saveIntake);
fetchSources();
loadIntakes();
