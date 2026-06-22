from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector

# ✅ Only include connectors that DEFINITELY exist in your repo
# (This prevents deployment errors)

CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "pubchem": PubChemConnector(),
}
