// ===== FIXED VERSION (HARDCODED SOURCES) =====

function fetchSources() {
  const box = document.getElementById('sources-box');

  const sources = [
    "pubmed",
    "openalex",
    "crossref",
    "clinicaltrials.gov",
    "openfda",
    "pubchem",
    "manual-reference"
  ];

  box.innerHTML = sources.map(src => `
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

async function runSearch(evt) {
  evt.preventDefault();

  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = "Searching...";

  const compound = document.getElementById('compound').value.trim();
  const keywords = document.getElementById('keywords').value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const payload = {
    compound,
    keywords,
    sources: getSelectedSources(),
    limit_per_source: parseInt(document.getElementById('limit').value, 10) || 5
  };

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.results || !data.results.length) {
      resultsEl.innerHTML = '<div class="text-muted">No results found.</div>';
      return;
    }

    resultsEl.innerHTML = data.results.map(item => `
      <div class="border rounded p-3 mb-2 bg-white">
        <div class="fw-semibold">${item.title || 'Untitled'}</div>
        <div class="text-muted">${item.source_database || ''}</div>
        <div class="mt-1 small">${item.snippet || ''}</div>

        <button class="btn btn-sm btn-primary mt-2"
          onclick='useResult(${JSON.stringify(item)})'>
          Use in intake
        </button>
      </div>
    `).join('');

  } catch (err) {
    resultsEl.innerHTML = `<div class="text-danger">Search failed: ${err}</div>`;
  }
}

function useResult(item) {
  document.getElementById('i-title').value = item.title || '';
  document.getElementById('i-source_database').value = item.source_database || '';
  document.getElementById('i-authors').value = item.authors || '';
  document.getElementById('i-journal').value = item.journal || '';
}

async function loadIntakes() {
  const el = document.getElementById('intakes');

  try {
    const res = await fetch('/api/intakes');
    const data = await res.json();

    if (!data.length) {
      el.innerHTML = '<div class="text-muted">No saved intakes yet.</div>';
      return;
    }

    el.innerHTML = data.map(item => `
      <div class="border rounded p-2 mb-2">
        <div><b>${item.title}</b></div>
        <div class="small">${item.source_database}</div>
      </div>
    `).join('');

  } catch (err) {
    el.innerHTML = `<div class="text-danger">Failed to load intakes</div>`;
  }
}

async function saveIntake(evt) {
  evt.preventDefault();

  const payload = {
    compound: document.getElementById('i-compound').value,
    title: document.getElementById('i-title').value,
    source_database: document.getElementById('i-source_database').value
  };

  const res = await fetch('/api/intakes', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    alert("Save failed: " + txt);
    return;
  }

  alert("Saved");
  loadIntakes();
}

// ===== INIT =====

document.getElementById('search-form').addEventListener('submit', runSearch);
document.getElementById('intake-form').addEventListener('submit', saveIntake);

fetchSources();
loadIntakes();
