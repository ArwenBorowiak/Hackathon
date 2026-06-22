// ===== SIMPLE + STABLE VERSION =====

const SOURCES = [
  "pubmed",
  "openalex",
  "crossref",
  "clinicaltrials.gov",
  "openfda",
  "pubchem",
  "google-web",
  "fda-official",
  "harvard-studies"
];

let selectedArticles = [];

function renderSources() {
  const box = document.getElementById("sources-box");

  box.innerHTML = SOURCES.map(src => `
    <div class="form-check">
      <input class="form-check-input source-check" type="checkbox" value="${src}" checked>
      <label class="form-check-label">${src}</label>
    </div>
  `).join('');
}

function getSources() {
  return Array.from(document.querySelectorAll(".source-check:checked"))
    .map(el => el.value);
}

function getKeywords() {
  return document.getElementById("keywords").value
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);
}

async function runSearch(e) {
  e.preventDefault();

  const results = document.getElementById("results");
  results.innerHTML = "Searching...";

  const payload = {
    compound: document.getElementById("compound").value,
    keywords: getKeywords(),
    sources: getSources(),
    limit_per_source: 5
  };

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      results.innerHTML = "No results found";
      return;
    }

    results.innerHTML = data.results.map(r => `
      <div class="border p-2 mb-2 bg-white">
        <div><b>${r.title}</b></div>
        <div>${r.source_database}</div>

        ${
          r.source_url
            ? `<a href="${r.source_url}" target="_blank">Open article</a>`
            : ""
        }

        <br>
        <button onclick='addArticle(${JSON.stringify(r)})'>
          Save to intake
        </button>
      </div>
    `).join("");

  } catch (err) {
    results.innerHTML = "Search failed";
  }
}

function addArticle(article) {
  selectedArticles.push(article);
  renderSelected();
}

function renderSelected() {
  const box = document.getElementById("selected-articles");

  if (selectedArticles.length === 0) {
    box.innerHTML = "No articles selected yet.";
    return;
  }

  box.innerHTML = selectedArticles.map((a, i) => `
    <div>
      Article ${i + 1}: ${a.title}
    </div>
  `).join("");
}

async function saveIntake() {
  if (selectedArticles.length === 0) {
    alert("Select at least one article");
    return;
  }

  const first = selectedArticles[0];

  const payload = {
    compound: document.getElementById("compound").value,
    title: document.getElementById("intake-title").value || "Intake",
    source_database: first.source_database
  };

  const res = await fetch("/api/intakes", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert("Save failed");
    return;
  }

  alert("Saved ✅");
}

async function createSummary() {
  if (selectedArticles.length === 0) {
    alert("Select articles first");
    return;
  }

  const res = await fetch("/api/create-summary", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      compound: document.getElementById("compound").value,
      keywords: getKeywords(),
      selected_articles: selectedArticles
    })
  });

  const data = await res.json();

  document.getElementById("summary-output").value =
    data.report_markdown || "Error";
}

// ===== INIT =====
document.getElementById("search-form").addEventListener("submit", runSearch);
document.getElementById("save-intake-btn").addEventListener("click", saveIntake);
document.getElementById("create-summary-btn").addEventListener("click", createSummary);

renderSources();
``
