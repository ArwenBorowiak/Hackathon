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
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

function collectIntakeForm() {
  return {
    compound: document.getElementById('i-compound').value,
    synonyms: null,
    title: document.getElementById('i-title').value,
    source_database: document.getElementById('i-source_database').value,
    source_url: document.getElementById('i-source_url').value || null,
    authors: document.getElementById('i-authors').value || null,
    journal: document.getElementById('i-journal').value || null,
    publication_year: toInt(document.getElementById('i-publication_year').value),
    doi: document.getElementById('i-doi').value || null,
    pmid: document.getElementById('i-pmid').value || null,
    nct_id: document.getElementById('i-nct_id').value || null,
    fda_identifier: document.getElementById('i-fda_identifier').value || null,
    pubchem_cid: document.getElementById('i-pubchem_cid').value || null,
    smiles: document.getElementById('i-smiles').value || null,
    ich_m7_relevance: document.getElementById('i-ich_m7_relevance').value || null,
    glp_compliant: document.getElementById('i-glp_compliant').checked,
    study_type: document.getElementById('i-study_type').value || null,
    species: document.getElementById('i-species').value || null,
    route_of_administration: document.getElementById('i-route_of_administration').value || null,
    dosage: document.getElementById('i-dosage').value || null,
    exposure_duration: document.getElementById('i-exposure_duration').value || null,
    toxicology_endpoint: document.getElementById('i-toxicology_endpoint').value || null,
    noael: document.getElementById('i-noael').value || null,
    loel: document.getElementById('i-loel').value || null,
    key_findings: document.getElementById('i-key_findings').value || null,
    data_quality_score: toInt(document.getElementById('i-data_quality_score').value),
    data_quality_rationale: document.getElementById('i-data_quality_rationale').value || null,
    reference_grade: document.getElementById('i-reference_grade').value || null,
    reviewer_name: document.getElementById('i-reviewer_name').value || null,
    extraction_notes: document.getElementById('i-extraction_notes').value || null,
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
  resultsEl.innerHTML = data.results.map((item, idx) => `
    <div class="result-card border rounded-3 p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between gap-2">
        <div>
          <div class="fw-semibold">${item.title || 'Untitled'}</div>
          <div class="text-muted">${item.source_database || ''}${item.publication_year ? ' · ' + item.publication_year : ''}</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick='prefillIntake(${JSON.stringify(item)}, ${JSON.stringify(compound)})'>Use in intake</button>
      </div>
      <div class="mt-2"><strong>Authors:</strong> ${item.authors || '-'}</div>
      <div><strong>Journal/Source:</strong> ${item.journal || '-'}</div>
      <div><strong>Identifiers:</strong> DOI ${item.doi || '-'} | PMID ${item.pmid || '-'} | NCT ${item.nct_id || '-'} | CID ${item.pubchem_cid || '-'}</div>
      <div class="mt-2">${item.snippet || ''}</div>
      ${item.source_url ? `<div class="mt-2"><a href="${item.source_url}" target="_blank">Open source</a></div>` : ''}
    </div>
  `).join('');
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
    alert('Failed to save intake');
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

window.prefillIntake = prefillIntake;
window.deleteIntake = deleteIntake;
document.getElementById('search-form').addEventListener('submit', runSearch);
document.getElementById('intake-form').addEventListener('submit', saveIntake);
fetchSources();
loadIntakes();
