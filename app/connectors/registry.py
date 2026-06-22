from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector
from app.connectors.openalex import OpenAlexConnector
from app.connectors.crossref import CrossrefConnector
from app.connectors.openfda import OpenFDAConnector

CONNECTORS = {
    "pubmed": PubMedConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "pubchem": PubChemConnector(),
    "openalex": OpenAlexConnector(),
    "crossref": CrossrefConnector(),
    "openfda": OpenFDAConnector(),
}
