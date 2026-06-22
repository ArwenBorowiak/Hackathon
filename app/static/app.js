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

// ✅ RENDER SOURCES (THIS WAS MISSING)
function renderSources() {
  const box = document.getElementById("sources-box");

  box.innerHTML = SOURCE_OPTIONS.map(src => `
    <div class="form-check">
      <input class="form-check-input source-check"
             type="checkbox"
             value="${src.key}"
             id="src-${src.key}"
             ${src.checked ? "checked" : ""}>
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
    item.source_url || ""
  ].join("||");
}

function compoundAppears(item, compound) {
  const blob = [item.title, item.snippet, item.source_url]
    .join(" ")
    .toLowerCase();
  return blob.includes((compound || "").toLowerCase());
}

// ✅ STRICT FILTER (NO JUMP LINKS)
function normalizeAndFilterResults(results, compound) {
  return (results || [])
    .filter(r => r.source_url)
    .filter(r => !r.source_url.includes("google"))
    .filter(r => !r.title.toLowerCase().startsWith("search"))
    .filter(r => compoundAppears(r, compound));
}

function updateSourceFilterOptions() {
  const select = document.getElementById("result-source-filter");

  const sources = [...new Set(allResults.map(r => r.source_database))];

  select.innerHTML =
    `<option value="all">All sources</option>` +
    sources.map(s => `<option value="${s}">${s}</option>`).join("");
}

function applyFilter() {
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

  meta.textContent = `${filteredResults.length} valid article(s)`;

  if (!filteredResults.length) {
    container.innerHTML = "<div>No real articles found.</div>";
    loadMoreBtn.style.display = "none";
    return;
  }

  container.innerHTML = visible.map(item => `
    <div class="border p-3 mb-2">
      <b>${item.title}</b><br>
      <small>${item.source_database}</small><br>
      <a href="${item.source_url}" target="_blank">Open article</a><br>
      <button onclick='addToSelection(${JSON.stringify(item)})'>Save</button>
    </div>
  `).join("");

  loadMoreBtn.style.display =
    filteredResults.length > displayLimit ? "block" : "none";
}

async function runSearch(e) {
  e.preventDefault();

  const compound = document.getElementById("compound").value;
  const sources = getSelectedSources();

  if (!sources.length) {
    alert("Select at least one source");
    return;
  }

  const res = await fetch("/api/search", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      compound,
      keywords: getKeywords(),
      sources,
      limit_per_source: 25
    })
  });

  const data = await res.json();

  allResults = normalizeAndFilterResults(data.results, compound);

  displayLimit = 10;

  updateSourceFilterOptions();
  applyFilter();
}

function addToSelection(item) {
  if (!selectedArticles.some(a => articleId(a) === articleId(item))) {
    selectedArticles.push(item);
  }
  renderSelected();
}

function renderSelected() {
  const box = document.getElementById("selected-articles");

  if (!selectedArticles.length) {
    box.innerHTML = "No articles selected";
    return;
  }

  box.innerHTML = selectedArticles.map((a, i) => `
    <div>Article ${i + 1}: ${a.title}</div>
  `).join("");
}

// ✅ INIT (THIS ALSO WAS MISSING)
renderSources();

document.getElementById("search-form").addEventListener("submit", runSearch);
document.getElementById("result-source-filter").addEventListener("change", applyFilter);
document.getElementById("load-more-btn").addEventListener("click", () => {
  displayLimit += 10;
  renderResults();
});
