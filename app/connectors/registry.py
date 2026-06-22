from app.connectors.clinicaltrials import ClinicalTrialsConnector
from app.connectors.crossref import CrossrefConnector
from app.connectors.manual import ManualReferenceConnector
from app.connectors.openalex import OpenAlexConnector
from app.connectors.openfda import OpenFDAConnector
from app.connectors.pubchem import PubChemConnector
from app.connectors.pubmed import PubMedConnector


CONNECTORS = {
    # Live/public data connectors
    "pubmed": PubMedConnector(),
    "openalex": OpenAlexConnector(),
    "crossref": CrossrefConnector(),
    "clinicaltrials.gov": ClinicalTrialsConnector(),
    "openfda": OpenFDAConnector(),
    "pubchem": PubChemConnector(),

    # Manual/jump-off sources (search link or homepage)
    "manual-reference": ManualReferenceConnector(),
    "google-web": ManualReferenceConnector("google-web", "Google Web Search", base_url="https://www.google.com/search?q={query}"),
    "fda-official": ManualReferenceConnector("fda-official", "FDA official sources", site_query="site:fda.gov"),
    "ema-emea": ManualReferenceConnector("ema-emea", "EMA / EMEA", site_query="site:ema.europa.eu"),
    "echa-reach": ManualReferenceConnector("echa-reach", "ECHA / REACH", site_query="site:echa.europa.eu"),
    "harvard-studies": ManualReferenceConnector("harvard-studies", "Harvard studies", site_query="site:harvard.edu"),
    "nih": ManualReferenceConnector("nih", "NIH", site_query="site:nih.gov"),
    "who": ManualReferenceConnector("who", "WHO", site_query="site:who.int"),
    "ncbi-bookshelf": ManualReferenceConnector("ncbi-bookshelf", "NCBI Bookshelf", site_query="site:ncbi.nlm.nih.gov/books"),
    "europe-pmc": ManualReferenceConnector("europe-pmc", "Europe PMC", base_url="https://europepmc.org/search?query={query}"),
    "medrxiv": ManualReferenceConnector("medrxiv", "medRxiv", site_query="site:medrxiv.org"),
    "bioRxiv": ManualReferenceConnector("bioRxiv", "bioRxiv", site_query="site:biorxiv.org"),
    "university-studies": ManualReferenceConnector("university-studies", "University studies", site_query="site:.edu"),
    "medical-institutions": ManualReferenceConnector("medical-institutions", "Medical institutions", site_query="site:.org medical research"),
    "clinical-guidelines": ManualReferenceConnector("clinical-guidelines", "Clinical guidelines", site_query="guideline medical site:.org"),
    "competitor-databases": ManualReferenceConnector("competitor-databases", "Competitor / regulatory databases", site_query="regulatory dossier competitor pharmaceutical"),
    "hubble": ManualReferenceConnector("hubble", "Internal Hubble search"),
    "tox-literature": ManualReferenceConnector("tox-literature", "Toxicology literature", site_query="toxicology study"),
    "ich-guidance": ManualReferenceConnector("ich-guidance", "ICH guidance", site_query="site:ich.org"),
    "patents-google": ManualReferenceConnector("patents-google", "Google Patents", base_url="https://patents.google.com/?q={query}"),
}
