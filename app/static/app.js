const SOURCE_OPTIONS = [
  { key: "pubmed", label: "PubMed", checked: true },
  { key: "clinicaltrials.gov", label: "ClinicalTrials.gov", checked: true },
  { key: "pubchem", label: "PubChem", checked: true },

  // Jump-off sources (UI only)
  { key: "fda-official", label: "FDA Official", checked: true },
  { key: "who", label: "WHO", checked: true },
  { key: "ema-emea", label: "EMA / EMEA", checked: false },
  { key: "europe-pmc", label: "Europe PMC", checked: false },
  { key: "harvard-studies", label: "Harvard Studies", checked: false },
  { key: "nih", label: "NIH", checked: false },
  { key: "ncbi-bookshelf", label: "NCBI Bookshelf", checked: false },
  { key: "university-studies", label: "University Studies", checked: false },
  { key: "medical-institutions", label: "Medical Institutions", checked: false },
  { key: "tox-literature", label: "Toxicology Literature", checked: false },
  { key: "ich-guidance", label: "ICH Guidance", checked: false },
  { key: "google-web", label: "Google Web Search", checked: false },
  { key: "manual-reference", label: "Manual Reference", checked: false }
];

let allResults = [];
let filteredResults = [];
let displayLimit = 10;

// ---------- SOURCES ----------
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

// ---------- SEARCH ----------
function getSelectedSources() {
  return [...document.querySelectorAll(".source-check:checked")]
    .map(x => x.value);
}

function getKeywords() {
  return document.getElementById("keywords").value;
}

function buildJumpLink(source, compound, keywords) {
  const query = `${compound} ${keywords}`;

  if (source === "who") {
    return `https://www.google.com/search?q=${query}+site:who.int`;
  }
  if (source === "fda-official") {
    return `https://www.google.com/search?q=${query}+site:fda.gov`;
  }
  if (source === "ema-emea") {
    return `https://www.google.com/search?q=${query}+site:ema.europa.eu`;
  }
  if (source === "europe-pmc") {
    return `https://www.google.com/search?q=${query}+site:europepmc.org`;
  }

  return `https://www.google.com/search?q=${query}`;
}

// ---------- RESULTS ----------
function renderResults() {
  const container = document.getElementById("results");

  if (!allResults.length) {
    container.innerHTML = "No results.";
    return;
  }

  container.innerHTML = allResults.slice(0, displayLimit).map(item => `
    <div class="result-card border rounded-3 p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between">
        <div>
          <b>${item.title}</b><br>
          <small>${item.source_database}</small><br>
          <small>${item.snippet || ""}</small>
        </div>

        <div>
          <a class="btn btn-sm btn-outline-primary"
             href="${item.source_url}"
             target="_blank">
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

// ---------- MAIN SEARCH ----------
async function runSearch(e) {
  e.preventDefault();

  const compound = document.getElementById("compound").value;
  const keywords = getKeywords();
  const sources = getSelectedSources();

  const payload = {
    compound,
    keywords: keywords.split(","),
    sources: ["pubmed", "clinicaltrials.gov", "pubchem"],
    limit_per_source: 5
  };

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  // ✅ Real connector results
  allResults = data.results || [];

  // ✅ ADD jump-off results (this is what gives you 20+)
  sources.forEach(src => {
    if (!["pubmed","clinicaltrials.gov","pubchem"].includes(src)) {
      allResults.push({
        title: `Search ${src} for ${compound} ${keywords}`,
        source_database: src,
        snippet: "Jump-off search link",
        source_url: buildJumpLink(src, compound, keywords)
      });
    }
  });

  renderResults();
}

// ---------- INIT ----------
renderSources();

document.getElementById("search-form").addEventListener("submit", runSearch);
