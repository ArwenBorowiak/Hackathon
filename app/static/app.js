const SOURCE_OPTIONS = [
  { key: "pubmed", label: "PubMed", checked: true },
  { key: "clinicaltrials.gov", label: "ClinicalTrials.gov", checked: true },
  { key: "pubchem", label: "PubChem", checked: true },

  { key: "fda", label: "FDA", checked: true },
  { key: "who", label: "WHO", checked: true },
  { key: "ema", label: "EMA", checked: false },
  { key: "nih", label: "NIH", checked: false },
  { key: "europe-pmc", label: "Europe PMC", checked: false },
  { key: "harvard", label: "Harvard Studies", checked: false },
  { key: "google", label: "Google", checked: false }
];

let allResults = [];
let selectedArticles = [];

// ---------- RENDER SOURCES ----------
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

// ---------- GET SOURCES ----------
function getSelectedSources() {
  return [...document.querySelectorAll(".source-check:checked")]
    .map(x => x.value);
}

// ---------- BUILD SEARCH LINKS ----------
function buildLink(source, compound, keywords) {
  const query = `${compound} ${keywords}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query + " " + source)}`;
}

// ---------- SAVE TO INTAKE ----------
function addToIntake(item) {
  const id = item.title + item.source_url;

  if (!selectedArticles.some(a => a.id === id)) {
    selectedArticles.push({
      id: id,
      title: item.title,
      url: item.source_url,
      source: item.source_database
    });
  }

  renderIntake();
}

// ---------- RENDER INTAKE ----------
function renderIntake() {
  const box = document.getElementById("selected-articles");

  if (!selectedArticles.length) {
    box.innerHTML = "No articles selected yet.";
    return;
  }

  box.innerHTML = selectedArticles.map((a, i) => `
    <div class="border p-2 mb-2 bg-white">
      <b>Article ${i + 1}:</b> ${a.title}<br>
      <a href="${a.url}" target="_blank">Open article</a>
    </div>
  `).join("");
}

// ---------- ADD MANUAL LINK ----------
function addManualLink() {
  const url = document.getElementById("manual-link").value;

  if (!url) {
    alert("Paste a link first");
    return;
  }

  selectedArticles.push({
    id: url,
    title: "Manual article",
    url: url,
    source: "manual"
  });

  document.getElementById("manual-link").value = "";
  renderIntake();
}

// ---------- RENDER RESULTS ----------
function renderResults() {
  const container = document.getElementById("results");

  container.innerHTML = allResults.map(item => `
    <div class="result-card border rounded-3 p-3 mb-3 bg-white">
      <div class="d-flex justify-content-between">
        <div>
          <b>${item.title}</b><br>
          <small>${item.source_database}</small><br>
          <small>${item.snippet || ""}</small>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <a href="${item.source_url}" target="_blank" class="btn btn-outline-primary btn-sm">
            Open article
          </a>

          <button class="btn btn-primary btn-sm"
                  onclick='addToIntake(${JSON.stringify(item)})'>
            Save to intake
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// ---------- SEARCH ----------
async function runSearch(e) {
  e.preventDefault();

  const compound = document.getElementById("compound").value;
  const keywords = document.getElementById("keywords").value;
  const sources = getSelectedSources();

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      compound,
      keywords: keywords.split(","),
      sources: ["pubmed", "clinicaltrials.gov", "pubchem"],
      limit_per_source: 5
    })
  });

  const data = await res.json();

  allResults = data.results || [];

  // add jump links
  sources.forEach(src => {
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

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  renderSources();

  document
    .getElementById("search-form")
    .addEventListener("submit", runSearch);

  // ✅ Inject manual link UI
  const intakeBox = document.getElementById("selected-articles");
  intakeBox.insertAdjacentHTML("beforebegin", `
    <div class="mb-2">
      <input id="manual-link" class="form-control" placeholder="Paste external article link here">
      <button onclick="addManualLink()" class="btn btn-outline-primary btn-sm mt-2">
        Add link to intake
      </button>
    </div>
  `);
});
