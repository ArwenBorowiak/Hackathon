import httpx
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class ClinicalTrialsConnector(BaseConnector):
    source_name = "clinicaltrials.gov"

    async def search(self, compound: str, keywords: list[str], limit: int):
        term = " ".join([compound] + keywords).strip()
        params = {"query.term": term, "pageSize": limit, "format": "json"}
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get("https://clinicaltrials.gov/api/v2/studies", params=params)
            resp.raise_for_status()
            items = resp.json().get("studies", [])
        out = []
        for item in items:
            protocol = item.get("protocolSection", {})
            ident = protocol.get("identificationModule", {})
            status = protocol.get("statusModule", {})
            sponsor = protocol.get("sponsorCollaboratorsModule", {})
            conditions = protocol.get("conditionsModule", {}).get("conditions", [])
            nct_id = ident.get("nctId")
            lead = sponsor.get("leadSponsor", {}).get("name")
            out.append(SearchResult(
                title=ident.get("briefTitle") or ident.get("officialTitle") or "Untitled study",
                source_database=self.source_name,
                source_url=f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else None,
                authors=lead,
                journal=None,
                publication_year=None,
                nct_id=nct_id,
                study_type=protocol.get("designModule", {}).get("studyType"),
                snippet="; ".join(filter(None, [status.get("overallStatus"), ", ".join(conditions[:3]) if conditions else None])),
                raw=item,
            ))
        return out
