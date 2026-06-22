from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector

# Direct-link public sources only
CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "pubchem": PubChemConnector(),
}
