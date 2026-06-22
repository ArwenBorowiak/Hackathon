from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector

# Keep backend simple & safe (no crashes)
CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "pubchem": PubChemConnector(),
}
