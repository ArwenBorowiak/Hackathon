import httpx
from app.core.config import settings
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class PubMedConnector(BaseConnector):
    source_name = "pubmed"

    async def search(self, compound: str, keywords: list[str], limit: int):
        term = " AND ".join([compound] + keywords) if keywords else compound
        base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        params = {"db": "pubmed", "term": term, "retmode": "json", "retmax": limit}
        if settings.ncbi_api_key:
            params["api_key"] = settings.ncbi_api_key
        async with httpx.AsyncClient(timeout=20) as client:
            search_resp = await client.get(f"{base}/esearch.fcgi", params=params)
            search_resp.raise_for_status()
            ids = search_resp.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []
            sum_params = {"db": "pubmed", "id": ",".join(ids), "retmode": "json"}
            if settings.ncbi_api_key:
                sum_params["api_key"] = settings.ncbi_api_key
            summary_resp = await client.get(f"{base}/esummary.fcgi", params=sum_params)
            summary_resp.raise_for_status()
            data = summary_resp.json().get("result", {})
        results = []
        for pid in ids:
            item = data.get(pid, {})
            authors = ", ".join(a.get("name", "") for a in item.get("authors", [])) or None
            journal = item.get("fulljournalname") or item.get("source")
            results.append(SearchResult(
                title=item.get("title", f"PubMed record {pid}"),
                source_database=self.source_name,
                source_url=f"https://pubmed.ncbi.nlm.nih.gov/{pid}/",
                authors=authors,
                journal=journal,
                publication_year=int(str(item.get("pubdate", "0"))[:4]) if str(item.get("pubdate", "") )[:4].isdigit() else None,
                doi=next((aid.get("value") for aid in item.get("articleids", []) if aid.get("idtype") == "doi"), None),
                pmid=pid,
                study_type=None,
                snippet=item.get("elocationid"),
                raw=item,
            ))
        return results
