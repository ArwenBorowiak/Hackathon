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

// ---------- UTILS ----------
function escapeHtml(text) {
  return (text || "").replace(/[&<>\"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[m];
  });
}

function getSelectedSources() {
  return Array.from(document.querySelectorAll(".source-check:checked")).map(el => el.value);
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
  ].join("||");
}

function compoundAppears(item, compound) {
  const blob = [item.title, item.snippet, item.source_url].join(" ").toLowerCase();
  return blob.includes((compound || "").toLowerCase());
}

// ---------- CRITICAL FILTER (NO JUMP LINKS) ----------
function normalizeAndFilterResults(results, compound) {
  return (results || [])
    .filter(r => r.source_url) // must have URL
    .filter(r => !r.source_url.includes("google")) // remove google redirects
    .filter(r => !r.title.toLowerCase().startsWith("search")) // remove search helper
    .filter(r => compoundAppears(r, compound)); // must match compound
}

// ---------- RENDER RESULTS ----------
function renderResults() {
  const container = document.getElementById("results");
  const meta = document.getElementById("result-meta");
  const loadMoreBtn = document.getElementById("load-more-btn");

  const visible = filteredResults.slice(0, displayLimit);

  meta.textContent = `${filteredResults.length} valid article(s)`;

  if (!filteredResults.length) {
    container.innerHTML = `<div class="text-muted">No real articles found.</div>`;
    loadMoreBtn.style.display = "none";
    return;
  }

  container.innerHTML = visible.map(item => `
    <div class="result-card border rounded-3 p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="flex-grow-1">
          <div class="fw-semibold">${escapeHtml(item.title)}</div>
          <div class="small text-muted">${escapeHtml(item.source_database)}</div>
          <div class="small">${escapeHtml(item.snippet || "")}</div>
        </div>
        <div class="d-flex gap-2">
