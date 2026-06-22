from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.crossref import CrossrefConnector
from app.connectors.manual import ManualReferenceConnector
from app.connectors.openalex import OpenAlexConnector
from app.connectors.openfda import OpenFDAConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector


CONNECTORS = {
    "pubmed": PubMedConnector(),
    "openalex": OpenAlexConnector(),
    "crossref": CrossrefConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "openfda": OpenFDAConnector(),
    "pubchem": PubChemConnector(),
    "manual-reference": ManualReferenceConnector(),
    # Enterprise-specific placeholders for future extension:
    # "hubble": HubbleConnector(),
    # "ema": EmaConnector(),
    # "echa": EchaConnector(),
}
