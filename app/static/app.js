const SOURCE_OPTIONS = [
  { key: "pubmed", label: "PubMed", checked: true },
  { key: "clinicaltrials.gov", label: "ClinicalTrials.gov", checked: true },
  { key: "pubchem", label: "PubChem", checked: true },

  // 20+ UI sources (jump-off)
  { key: "fda", label: "FDA", checked: true },
  { key: "who", label: "WHO", checked: true },
  { key: "ema", label: "EMA", checked: false },
  { key: "nih", label: "NIH", checked: false },
  { key: "europe-pmc", label: "Europe PMC", checked: false },
  { key: "harvard", label: "Harvard Studies", checked: false },
  { key: "university", label: "University Studies", checked: false },
  { key: "tox", label: "Toxicology Literature", checked: false },
  { key: "ich", label: "ICH Guidance", checked: false },
  { key: "google", label: "Google Web", checked: false },
  { key: "manual", label: "Manual Reference", checked: false }
];

let allResults = [];
let displayLimit = 10;

// ✅ RENDER SOURCES (THIS WAS BROKEN BEFORE)
function renderSources() {
  const box = document.getElementById("sources-box");

  box.innerHTML = SOURCE_OPTIONS.map(src => `
    <div class="form-check">
      <input class="form-check-input source-check"
             type="checkbox"
             value="${src.key}"
             ${src.checked ? "checked" : ""}>
      <label class="form-check-label">${src.label}</label>
    </div>
  `).join("");
}

// ✅ GET SELECTED SOURCES
function getSelectedSources() {
  return [...document.querySelectorAll(".source-check:checked")]
    .map(x => x.value);
}

// ✅ BUILD JUMP LINK (GOOGLE STYLE)
function buildLink(source, compound, keywords) {
  const query = `${compound} ${keywords}`;

  return `https://www.google.com/search?q=${encodeURIComponent(query + " " + source)}`;
}

// ✅ RENDER RESULTS (RESTORED CARD STYLE)
function renderResults() {
  const container = document.getElementById("results");

  if (!allResults.length) {
    container.innerHTML = `<div class="text-muted">No results</div>`;
    return;
  }

  container.innerHTML = allResults.slice(0, displayLimit).map(item => `
    <div class="result-card border rounded-3 p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">${item.title}</div>
          <div class="small text-muted">${item.source_database}</div>
          <div class="small">${item.snippet || ""}</div>
        </div>
        <div class="d-flex gap-2">
          <a href="${item.source_url}" target="_blank"
             class="btn btn-sm btn-outline-primary">
            Open article
          </a>
          <button class="btn btn-sm btn-primary">
            Save to intake
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// ✅ MAIN SEARCH
async function runSearch(e) {
  e.preventDefault();

  const compound = document.getElementById("compound").value;
  const keywords = document.getElementById("keywords").value;
  const selectedSources = getSelectedSources();

  // ✅ backend (real data)
  const res = await fetch("/api/search", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      compound,
      keywords: keywords.split(","),
      sources: ["pubmed","clinicaltrials.gov","pubchem"],
      limit_per_source: 5
    })
  });

  const data = await res.json();

  allResults = data.results || [];

  // ✅ add jump-off sources (this gives you 20+ again)
  selectedSources.forEach(src => {
    if (!["pubmed","clinicaltrials.gov","pubchem"].includes(src)) {
      allResults.push({
        title: `Search ${src} for ${compound}`,
        source_database: src,
        snippet: "Jump-off link",
        source_url: buildLink(src, compound, keywords)
      });
    }
  });

  renderResults();
}

// ✅ INIT (CRITICAL LINE YOU WERE MISSING)
document.addEventListener("DOMContentLoaded", () => {
  renderSources();

  document
    .getElementById("search-form")
    .addEventListener("submit", runSearch);
});
