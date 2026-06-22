from app.connectors.clinicaltrials import ClinicalTrialsConnectorfrom app.connectorsors.openalex import OpenAlexConnector
from app.connectors.crossref import CrossrefConnector
from app.connectors.openfda import OpenFDAConnector

# Direct-link / real connector set only
# NOTE:
# With the current implementation, these are the real connectors available.
# Adding 20+ source NAMES without implementing 20+ real connectors would just
# create jump-off/search-helper links again, which you explicitly do not want.
CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "openalex": OpenAlexConnector(),
    "crossref": CrossrefConnector(),
    "openfda": OpenFDAConnector(),
    "pubchem": PubChemConnector(),
}
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector
