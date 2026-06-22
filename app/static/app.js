const SOURCE_OPTIONS = [
  { key: "pubmed", label: "PubMed", checked: true },
  { key: "clinicaltrials.gov", label: "ClinicalTrials.gov", checked: true },
  { key: "pubchem", label: "PubChem", checked: true },

  // jump-off / helper sources
  { key: "fda", label: "FDA", checked: true },
  { key: "who", label: "WHO", checked: true },
  { key: "ema", label: "EMA", checked: false },
  { key: "nih", label: "NIH", checked: false },
  { key: "europe-pmc", label: "Europe PMC", checked: false },
  { key: "harvard", label: "Harvard Studies", checked: false },
  { key: "university", label: "University Studies", checked: false }
];

let allResults = [];
let filteredResults = [];
let displayLimit = 10;
let selectedArticles = [];

// ---------- helpers ----------
function escapeHtml(text) {
  return (text || "").replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[m];
  });
}

function articleId(item) {
  return [
    item.source_database || "",
    item.title || "",
    item.source_url || ""
  ].join("||");
}

function getSelectedSources() {
  return [...document.querySelectorAll(".source-check:checked")].map(x => x.value);
}

function getKeywords() {
  return document.getElementById("keywords").value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function buildJumpLink(source, compound, keywords) {
  const query = `${compound} ${keywords}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query + " " + source)}`;
}

function renderSources() {
  const box = document.getElementById("sources-box");
  box.innerHTML = SOURCE_OPTIONS.map(src => `
    <div class="form-check">
      <input
        class="form-check-input source-check"
        type="checkbox"
        value="${src.key}"
        id="src-${src.key}"
        ${src.checked ? "checked" : ""}
      >
      <label class="form-check-label" for="src-${src.key}">${src.label}</label>
    </div>
  `).join("");
}

function updateSourceFilterOptions() {
  const select = document.getElementById("result-source-filter");
  const current = select.value || "all";

  const uniqueSources = [...new Set(allResults.map(r => r.source_database).filter(Boolean))].sort();

  select.innerHTML =
    `<option value="all">All sources</option>` +
    uniqueSources.map(src => `<option value="${src}">${src}</option>`).join("");

  if (current === "all" || uniqueSources.includes(current)) {
    select.value = current;
  } else {
    select.value = "all";
  }
}

function applyResultFilter() {
  const source = document.getElementById("result-source-filter").value;

  filteredResults = source === "all"
    ? [...allResults]
    : allResults.filter(r => r.source_database === source);

  renderResults();
}

// ---------- search / results ----------
async function runSearch(e) {
  e.preventDefault();

  const compound = document.getElementById("compound").value.trim();
  const keywords = document.getElementById("keywords").value.trim();
  const selectedSources = getSelectedSources();

  if (!compound) {
    alert("Enter a compound/API first.");
    return;
  }

  displayLimit = 10;

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      compound,
      keywords: keywords ? keywords.split(",").map(x => x.trim()) : [],
      sources: ["pubmed", "clinicaltrials.gov", "pubchem"],
      limit_per_source: 5
    })
  });

  const data = await res.json();

  allResults = data.results || [];

  // add jump-off sources from the UI selection
  selectedSources.forEach(src => {
    if (!["pubmed","clinicaltrials.gov","pubchem"].includes(src)) {
      allResults.push({
        title: `Search ${src} for ${compound}`,
        source_database: src,
        snippet: "Jump-off link",
        source_url: buildJumpLink(src, compound, keywords)
      });
    }
  });

  updateSourceFilterOptions();
  applyResultFilter();
}

function renderResults() {
  const container = document.getElementById("results");
  const meta = document.getElementById("result-meta");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const visible = filteredResults.slice(0, displayLimit);

  meta.textContent = filteredResults.length
    ? `${filteredResults.length} result(s)`
    : "No search run yet.";

  if (!filteredResults.length) {
    container.innerHTML = `<div class="text-muted">Run a search to retrieve source links.</div>`;
    loadMoreBtn.style.display = "none";
    return;
  }

  container.innerHTML = visible.map(item => {
    const payload = encodeURIComponent(JSON.stringify(item));

    return `
      <div class="result-card border rounded-3 p-3 mb-3 bg-white">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div class="flex-grow-1">
            <div class="fw-semibold mb-1">${escapeHtml(item.title || "Untitled")}</div>
            <div class="small text-muted mb-1">${escapeHtml(item.source_database || "")}</div>
            <div class="small">${escapeHtml(item.snippet || "")}</div>
          </div>
          <div class="result-actions">
            <a class="btn btn-sm btn-outline-primary" href="${item.source_url}" target="_blank" rel="noopener noreferrer">
              Open article
            </a>
            <button
              class="btn btn-sm btn-primary"
              onclick="addToSelection(JSON.parse(decodeURIComponent('${payload}')))"
              type="button"
            >
              Save to intake
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  loadMoreBtn.style.display = filteredResults.length > displayLimit ? "inline-block" : "none";
}

// ---------- intake ----------
function addToSelection(item) {
  const id = articleId(item);

  if (!selectedArticles.some(a => articleId(a) === id)) {
    selectedArticles.push({
      title: item.title || "Untitled",
      source_database: item.source_database || "unknown",
      source_url: item.source_url || "",
      authors: item.authors || "",
      journal: item.journal || "",
      publication_year: item.publication_year || null,
      doi: item.doi || null,
      pmid: item.pmid || null,
      nct_id: item.nct_id || null,
      snippet: item.snippet || ""
    });
  }

  renderSelectedArticles();
}

function addManualLink() {
  const input = document.getElementById("manual-link");
  const url = input.value.trim();

  if (!url) {
    alert("Paste a URL first.");
    return;
  }

  const item = {
    title: "Manual article link",
    source_database: "manual-link",
    source_url: url,
    authors: "",
    journal: "",
    publication_year: null,
    doi: null,
    pmid: null,
    nct_id: null,
    snippet: "Manual URL added by reviewer"
  };

  const id = articleId(item);

  if (!selectedArticles.some(a => articleId(a) === id)) {
    selectedArticles.push(item);
  }

  input.value = "";
  renderSelectedArticles();
}

function removeFromSelection(id) {
  selectedArticles = selectedArticles.filter(a => articleId(a) !== id);
  renderSelectedArticles();
}

function clearSelection() {
  selectedArticles = [];
  renderSelectedArticles();
}

function renderSelectedArticles() {
  const box = document.getElementById("selected-articles");

  if (!selectedArticles.length) {
    box.innerHTML = `<div class="text-muted">No articles selected yet.</div>`;
    return;
  }

  box.innerHTML = selectedArticles.map((a, i) => {
    const id = encodeURIComponent(articleId(a));
    return `
      <div class="border rounded-3 p-2 mb-2 bg-white">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">Article ${i + 1}: ${escapeHtml(a.title)}</div>
            <div class="small text-muted">${escapeHtml(a.source_database)}</div>
            <div class="small">${escapeHtml(a.source_url)}</div>
          </div>
          <div class="result-actions">
            <a class="btn btn-sm btn-outline-primary" href="${a.source_url}" target="_blank" rel="noopener noreferrer">
              Open article
            </a>
            <button
              class="btn btn-sm btn-outline-danger"
              onclick="removeFromSelection(decodeURIComponent('${id}'))"
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- save / summary ----------
function buildSourceBundle() {
  return selectedArticles.map(a =>
    [a.source_database || "", a.title || "", a.source_url || "", a.authors || ""].join(" | ")
  ).join("\n");
}

async function saveIntake() {
  const compound = document.getElementById("compound").value.trim();
  const intakeTitle =
    document.getElementById("intake-title").value.trim() ||
    `${compound} evidence intake`;

  if (!selectedArticles.length) {
    alert("Select or add at least one article first.");
    return;
  }

  const commonPayload = {
    compound,
    ich_m7_relevance: document.getElementById("ich-m7")?.value.trim() || null,
    toxicology_endpoint: document.getElementById("tox-endpoint")?.value.trim() || null,
    noael: document.getElementById("noael")?.value.trim() || null,
    dosage: document.getElementById("dosage")?.value.trim() || null,
    reference_grade: document.getElementById("reference-grade")?.value.trim() || null,
    reviewer_name: document.getElementById("reviewer-name")?.value.trim() || null,
    key_findings: document.getElementById("reviewer-notes")?.value.trim() || null,
    extraction_notes: document.getElementById("reviewer-notes")?.value.trim() || null,
    source_bundle: buildSourceBundle(),
    status: "draft"
  };

  try {
    for (const article of selectedArticles) {
      const payload = {
        ...commonPayload,
        title: article.title || intakeTitle,
        source_database: article.source_database || "mixed-sources",
        source_url: article.source_url || null,
        authors: article.authors || null,
        journal: article.journal || null,
        publication_year: article.publication_year || null,
        doi: article.doi || null,
        pmid: article.pmid || null,
        nct_id: article.nct_id || null,
        study_type: null
      };

      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Save failed: ${data.detail || JSON.stringify(data)}`);
        return;
      }
    }

    alert(`Saved ${selectedArticles.length} article(s) to intake.`);
    loadIntakes();
  } catch (err) {
    alert(`Save failed: ${err}`);
  }
}

async function createSummary() {
  if (!selectedArticles.length) {
    alert("Select or add at least one article first.");
    return;
  }

  const payload = {
    compound: document.getElementById("compound").value.trim(),
    keywords: getKeywords(),
    selected_articles: selectedArticles,
    user_notes: document.getElementById("reviewer-notes")?.value.trim() || null
  };

  const output = document.getElementById("summary-output");
  output.value = "Creating summary...";

  try {
    const res = await fetch("/api/create-summary", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      output.value = `Summary failed: ${data.detail || JSON.stringify(data)}`;
      return;
    }

    output.value = data.report_markdown || "";
  } catch (err) {
    output.value = `Summary failed: ${err}`;
  }
}

async function downloadWordReport() {
  if (!selectedArticles.length) {
    alert("Select or add at least one article first.");
    return;
  }

  const payload = {
    compound: document.getElementById("compound").value.trim(),
    keywords: getKeywords(),
    selected_articles: selectedArticles,
    user_notes: document.getElementById("reviewer-notes")?.value.trim() || null
  };

  try {
    const res = await fetch("/api/create-summary-docx", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      alert(`Word report failed: ${text}`);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.compound || "report"}-evidence-summary.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(`Word report failed: ${err}`);
  }
}

async function loadIntakes() {
  const el = document.getElementById("intakes");

  try {
    const res = await fetch("/api/intakes");
    const data = await res.json();

    if (!res.ok) {
      el.innerHTML = `<div class="text-danger">Failed to load intakes.</div>`;
      return;
    }

    if (!data.length) {
      el.innerHTML = `<div class="text-muted">No saved intakes yet.</div>`;
      return;
    }

    el.innerHTML = data.map(item => `
      <div class="border rounded-3 p-3 mb-2 bg-white">
        <div class="d-flex justify-content-between gap-2 align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(item.title)}</div>
            <div class="small text-muted">${escapeHtml(item.compound)} · ${escapeHtml(item.source_database || "")}</div>
            <div class="small mt-1">${escapeHtml(item.source_url || "")}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteIntake(${item.id})" type="button">Delete</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    el.innerHTML = `<div class="text-danger">Failed to load intakes.</div>`;
  }
}

async function deleteIntake(id) {
  await fetch(`/api/intakes/${id}`, { method: "DELETE" });
  loadIntakes();
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", () => {
  renderSources();
  renderSelectedArticles();
  loadIntakes();

  document.getElementById("search-form").addEventListener("submit", runSearch);
  document.getElementById("save-intake-btn").addEventListener("click", saveIntake);
  document.getElementById("create-summary-btn").addEventListener("click", createSummary);
  document.getElementById("download-word-btn").addEventListener("click", downloadWordReport);
  document.getElementById("clear-selection").addEventListener("click", clearSelection);
  document.getElementById("result-source-filter").addEventListener("change", applyResultFilter);
  document.getElementById("load-more-btn").addEventListener("click", () => {
    displayLimit += 10;
    renderResults();
  });
  document.getElementById("add-manual-link-btn").addEventListener("click", addManualLink);
});
