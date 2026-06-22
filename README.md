# Desloratadine Dossier Intake Platform

A hackathon-ready, end-to-end repository for **standardized literature intake, study triage, and evidence tracking** for pharmaceutical dossier preparation.

This project is tailored to the brainstorming requirements for **desloratadine as an API dossier candidate**:
- targeted search across approved/public sources,
- standardized study intake fields,
- source traceability,
- data-quality scoring,
- backend database that grows with every intake,
- exportable evidence tables for downstream dossier drafting.

> **Important**
> This application is an evidence-intake and triage tool. It does **not** make medical, regulatory, or patient-care decisions. Any dossier content generated from this system must be reviewed by qualified toxicology, regulatory, medical, and legal reviewers.

---

## What the app does

### 1) Search across configured sources
The app provides one search box for a compound/API (example: `desloratadine`) plus optional keywords (example: `toxicology`, `NOAEL`, `genotoxicity`, `ICH M7`).

Built-in connectors:
- **PubMed / NCBI E-utilities**
- **OpenAlex**
- **Crossref**
- **ClinicalTrials.gov v2**
- **openFDA**
- **PubChem**
- **Manual / placeholder connectors** for **Hubble**, **ECHA/REACH**, **EMA/EMEA**, and competitors/internal curated datasets

### 2) Normalize results into a common evidence schema
Each source result is normalized into common fields:
- compound
- title
- authors
- source database
- source URL
- DOI / PMID / NCT ID / FDA identifiers
- publication year
- study type
- abstract / summary snippet

### 3) Convert search results into an intake record
A search result can be promoted into a structured **Study Intake** record that captures:
- chemical / ingredient
- PubChem CID
- SMILES
- author(s)
- source / database
- study type
- GLP compliance
- species / route / dosage / duration
- toxicology endpoint(s)
- key findings
- data quality score and rationale
- ICH M7 relevance
- reference grade
- reviewer notes

### 4) Build a reusable backend database
Every accepted intake is saved to SQLite by default (easy hackathon demo), and the code is already structured for PostgreSQL in production.

### 5) Export evidence packages
You can export the intake database to CSV for dossier prep, review, or BI visualization.

---

## Recommended API strategy

### You do **not** need APIs for everything
This repo is designed so that it works **without paid APIs** for most of the core literature workflow.

#### Public / official sources supported directly
- **PubMed / NCBI E-utilities** → literature search
- **ClinicalTrials.gov v2** → study registry search
- **Crossref REST API** → citation metadata enrichment
- **openFDA** → public FDA labels / events / public records
- **OpenAlex** → broader scholarly discovery
- **PubChem PUG REST** → chemical identifiers and properties

#### APIs you may want (optional)
- **OpenAlex API key** for higher/managed usage
- **openFDA API key** if your usage needs it
- **NCBI API key** to increase request throughput
- **SerpAPI** or **Google Custom Search API** if you want Google-style result discovery inside the app

#### APIs you likely need custom enterprise access for
- **Hubble** (internal/private) - you need an approved internal endpoint, authentication method, and usage policy
- internal competitor/reference datasets
- private Harvard/HBS or licensed content stores (depends on license/access)
- ECHA/EMA structured connectors if you want anything beyond manual/reference links

### My practical recommendation
For the hackathon demo, use:
1. PubMed
2. OpenAlex
3. Crossref
4. ClinicalTrials.gov
5. openFDA
6. PubChem
7. Manual “Reference Intake” connector for PDF/manual evidence reviews

That gives you a **working, defensible, reference-first MVP** without blocking on internal/private APIs.

---

## Architecture

```text
frontend (HTML + Bootstrap + vanilla JS)
        ↓
FastAPI backend
        ↓
Connector layer (PubMed, OpenAlex, Crossref, ClinicalTrials, openFDA, PubChem)
        ↓
Normalization layer
        ↓
SQLite / PostgreSQL via SQLAlchemy
```

Why this stack?
- very fast to demo
- easy to understand
- production-friendly enough for hackathon judges
- no heavy frontend framework required to deploy
- simple Docker deployment

---

## Repository structure

```text
.
├── app/
│   ├── api/
│   ├── connectors/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── static/
│   ├── templates/
│   └── main.py
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
└── .env.example
```

---

## Quick start (local)

### Option A — Docker (fastest)
```bash
git clone <YOUR-REPO-URL>
cd desloratadine-dossier-intake-platform
cp .env.example .env
docker compose up --build
```

Open: [Local app](http://localhost:8000)

### Option B — Python virtual environment
```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Open: [Local app](http://localhost:8000)

---

## How to use the app

1. Enter compound/API name, e.g. `desloratadine`
2. Add optional keywords, e.g. `toxicology, genomics, ICH M7, NOAEL`
3. Select one or more sources
4. Search
5. Review normalized results
6. Promote useful evidence into an intake record
7. Complete structured fields
8. Export CSV for dossier support

---

## Step-by-step: download this project, upload to GitHub, and deploy

### Step 1 — Download the generated project
If Copilot gave you a ZIP, save it and unzip it.

### Step 2 — Create a GitHub repository
On GitHub:
1. Click **New repository**
2. Name it something like `desloratadine-dossier-intake-platform`
3. Keep it private if needed
4. Do **not** initialize with another README (this repo already has one)
5. Create repository

### Step 3 — Put the files into the repo locally
If you downloaded a ZIP:
```bash
unzip desloratadine-dossier-intake-platform.zip
cd desloratadine-dossier-intake-platform
```

### Step 4 — Initialize Git and push
```bash
git init
git add .
git commit -m "Initial hackathon MVP"
git branch -M main
git remote add origin git@github.com:YOUR_ORG_OR_USER/desloratadine-dossier-intake-platform.git
git push -u origin main
```

If you use HTTPS instead of SSH:
```bash
git remote add origin https://github.com/YOUR_ORG_OR_USER/desloratadine-dossier-intake-platform.git
git push -u origin main
```

### Step 5 — Add environment variables in your deployment target
At minimum:
- `APP_ENV`
- `DATABASE_URL`
- optional API keys (`OPENALEX_API_KEY`, `OPENFDA_API_KEY`, `NCBI_API_KEY`, etc.)

### Step 6 — Deploy

#### Easiest hackathon path: Render / Railway / Azure App Service with Docker
Because this repo includes a `Dockerfile`, most container-based platforms can deploy it directly.

Generic deployment flow:
1. Create a new Web Service
2. Connect your GitHub repo
3. Select Docker deployment
4. Add environment variables from `.env.example`
5. Deploy

#### Example runtime command
The container already starts with:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Suggested demo storyline for judges

**Problem**: toxicology/reference evidence collection for API dossiers is fragmented and inconsistent.

**Pain point**:
- search relevance is weak,
- references must be official or traceable,
- teams re-extract the same study facts repeatedly,
- dossier prep requires structured evidence, not just links.

**Solution**:
- query trusted public sources from one interface,
- normalize evidence into a standard intake model,
- score evidence quality,
- persist records into a growing internal evidence base,
- export a clean dossier-ready evidence set.

**Business value**:
- faster study triage,
- better traceability,
- repeatable scientific intake process,
- reusable knowledge base for future APIs/ingredients.

---

## Future enhancements

- enterprise SSO / RBAC
- internal Hubble connector
- PDF ingestion + structured extraction
- AI-assisted field extraction from abstracts/full text
- duplicate detection across sources
- batch searches by ingredient portfolio
- dossier summary generation
- review queues and approval workflow
- PostgreSQL + object storage + audit logs

---

## License

Internal hackathon / enterprise use.
Adjust license and governance to your company policy before production rollout.
