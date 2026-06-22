from app.connectors.clinicaltrials import ClinicalTrialsConnectorfrom app.connectors.clinical
from app.connectors.pubmed import PubMedConnector
from app.connectors.openalex import OpenAlexConnector
from app.connectors.crossref import CrossrefConnector
from app.connectors.openfda import OpenFDAConnector

CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "openalex": OpenAlexConnector(),
    "crossref": CrossrefConnector(),
    "openfda": OpenFDAConnector(),
    "pubchem": PubChemConnector(),
}
