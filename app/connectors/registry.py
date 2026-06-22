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
    "fda": ManualReferenceConnector("fda", "FDA / official label or review source"),
    "harvard-studies": ManualReferenceConnector("harvard-studies", "Harvard / institutional studies"),
    "ema-emea": ManualReferenceConnector("ema-emea", "EMA / EMEA source"),
    "echa-reach": ManualReferenceConnector("echa-reach", "ECHA / REACH dossier source"),
    "hubble": ManualReferenceConnector("hubble", "Internal Hubble search source"),
}
