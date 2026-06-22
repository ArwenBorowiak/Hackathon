const SOURCE_OPTIONS = [
  { key: "pubmed", label: "PubMed", checked: true },
  { key: "clinicaltrials.gov", label: "ClinicalTrials.gov", checked: true },
  { key: "openalex", label: "OpenAlex", checked: true },
  { key: "crossref", label: "Crossref", checked: true },
  { key: "openfda", label: "OpenFDA", checked: true },
  { key: "pubchem", label: "PubChem", checked: false }
];

let allResults = [];
let filteredResults = [];
let displayLimit = 10;
let selectedArticles = [];

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
      <label class="form-check-label" for="src-${src.key}">
        ${src.label}
      </label>
    </div>
  `).join("");
}

function getSelectedSources() {
  return Array.from(document.querySelectorAll(".source-check:checked"))
    .map(el => el.value);
}

function getKeywords() {
  return document.getElementById("keywords").value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function articleId(item) {
  return [
    item.source_database || "",
    item.title || "",
    item.source_url || "",
    item.doi || "",
    item.pmid || "",
    item.nct_id || ""
  ].join("||");
}

function compoundAppears(item, compound) {
  const blob = [
    item.title,
    item.snippet,
    item.source_url,
    item.journal
  ].filter(Boolean).join(" ").toLowerCase();

  return blob.includes((compound || "").toLowerCase());
}

function sanitizeSnippet(item) {
  const raw = (item.snippet || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return raw.length > 420 ? raw.slice(0, 420) + "…" : raw;
}

function normalizeAndFilterResults(results, compound) {
  return (results || [])
    .map(r => ({
      ...r,
      snippet: sanitizeSnippet(r)
    }))
    .filter(r => !!r.source_url)
    .filter(r => !String(r.source_url).toLowerCase().includes("google.com/search"))
    .filter(r => !String(r.title || "").toLowerCase().startsWith("search "))
    .filter(r => compoundAppears(r, compound));
}

function updateSourceFilterOptions() {
  const select = document.getElementById("result-source-filter");
  const current = select.value || "all";

  const uniqueSources = [...new Set(
    allResults.map(r => r.source_database).filter(Boolean)
  )].sort();

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

function renderResults() {
  const container = document.getElementById("results");
  const meta = document.getElementById("result-meta");
  const loadMoreBtn = document.getElementById("load-more-btn");

  const visible = filteredResults.slice(0, displayLimit);

  meta.textContent = `${filteredResults.length} openable result(s)`;

  if (!filteredResults.length) {
    container.innerHTML = `
      <div class="text-muted">
        No direct-link public results found that explicitly mention the compound in the returned title, snippet, or URL.
      </div>
    `;
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
            <div class="small text-muted mb-1">${escapeHtml(item.source_database || "")}${item.publication_year ? " · " + item.publication_year : ""}</div>
            <div class="small mb-1">${escapeHtml(item.authors || "")}</div>
            <div class="small mb-2">${escapeHtml(item.journal || "")}</div>
            <div class="small result-snippet">${escapeHtml(item.snippet || "")}</div>
          </div>
          <div class="result-actions">
            <a
              class="btn btn-sm btn-outline-primary"
              href="${item.source_url}"
              target="_blank"
              rel="noopener noreferrer"
            >
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

  loadMoreBtn.style.display =
    filteredResults.length > displayLimit ? "inline-block" : "none";
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
  const summaryBox = document.getElementById("summary-output");
  if (summaryBox) {
    summaryBox.value = "";
  }
}

function renderSelectedArticles() {
  const box = document.getElementById("selected-articles");

  if (!selectedArticles.length) {
    box.innerHTML = `<div class="text-muted">No articles selected yet.</div>`;
    return;
  }

  box.innerHTML = selectedArticles.map((item, idx) => {
    const id = encodeURIComponent(articleId(item));

    return `
      <div class="border rounded-3 p-2 mb-2 bg-white">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">Article ${idx + 1}: ${escapeHtml(item.title || "Untitled")}</div>
            <div class="small text-muted">${escapeHtml(item.source_database || "")}${item.publication_year ? " · " + item.publication_year : ""}</div>
            <div class="small">${escapeHtml(item.authors || "")}</div>
          </div>
          <div class="result-actions">
            <a
              class="btn btn-sm btn-outline-primary"
              href="${item.source_url}"
              target="_blank"
              rel="noopener noreferrer"
            >
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

async function runSearch(evt) {
  evt.preventDefault();

  const container = document.getElementById("results");
  const meta = document.getElementById("result-meta");
  const compound = document.getElementById("compound").value.trim();
  const sources = getSelectedSources();

  if (!compound) {
    alert("Enter a Compound / API first.");
    return;
  }

  if (!sources.length) {
    alert("Select at least one source.");
    return;
  }

  container.innerHTML = `<div class="text-muted">Searching...</div>`;
  meta.textContent = "Searching...";

  displayLimit = 10;

  const payload = {
    compound,
    keywords: getKeywords(),
    sources,
    limit_per_source: 25
  };

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="text-danger">Search failed: ${escapeHtml(data.detail || JSON.stringify(data))}</div>`;
      meta.textContent = "Search failed";
      return;
    }

    allResults = normalizeAndFilterResults(data.results || [], compound);
    updateSourceFilterOptions();
    applyResultFilter();
  } catch (err) {
    container.innerHTML = `<div class="text-danger">Search failed: ${escapeHtml(String(err))}</div>`;
    meta.textContent = "Search failed";
  }
}

function buildSourceBundle() {
  return selectedArticles.map(a =>
    [
      a.source_database || "",
      a.title || "",
      a.source_url || "",
      a.authors || ""
    ].join(" | ")
  ).join("\n");
}

async function saveIntake() {
  const compound = document.getElementById("compound").value.trim();
  const intakeTitle =
    document.getElementById("intake-title").value.trim() ||
    `${compound} evidence intake`;

  if (!selectedArticles.length) {
    alert("Select at least one article first.");
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
        fda_identifier: article.fda_identifier || null,
        pubchem_cid: article.pubchem_cid || null,
        smiles: article.smiles || null,
        study_type: article.study_type || null
      };

      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
  const compound = document.getElementById("compound").value.trim();

  if (!selectedArticles.length) {
    alert("Select at least one article.");
    return;
  }

  const payload = {
    compound,
    keywords: getKeywords(),
    selected_articles: selectedArticles,
    user_notes: document.getElementById("reviewer-notes")?.value.trim() || null
  };

  const output = document.getElementById("summary-output");
  if (output) {
    output.value = "Creating summary...";
  }

  try {
    const res = await fetch("/api/create-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      if (output) {
        output.value = `Summary failed: ${data.detail || JSON.stringify(data)}`;
      }
      return;
    }

    if (output) {
      output.value = data.report_markdown || "";
    }
  } catch (err) {
    if (output) {
      output.value = `Summary failed: ${err}`;
    }
  }
}

async function downloadWordReport() {
  const compound = document.getElementById("compound").value.trim();

  if (!selectedArticles.length) {
    alert("Select at least one article.");
    return;
  }

  const payload = {
    compound,
    keywords: getKeywords(),
    selected_articles: selectedArticles,
    user_notes: document.getElementById("reviewer-notes")?.value.trim() || null
  };

  try {
