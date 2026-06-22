import httpx
from app.core.config import settings
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class CrossrefConnector(BaseConnector):
    source_name = "crossref"

    async def search(self, compound: str, keywords: list[str], limit: int):
        q = " ".join([compound] + keywords).strip()
        params = {"query": q, "rows": limit}
        if settings.crossref_mailto:
            params["mailto"] = settings.crossref_mailto
        async with httpx.AsyncClient(timeout=20, headers={"User-Agent": f"dossier-intake/1.0 ({settings.crossref_mailto or 'no-mailto'})"}) as client:
            resp = await client.get("https://api.crossref.org/works", params=params)
            resp.raise_for_status()
            items = resp.json().get("message", {}).get("items", [])
        out = []
        for item in items:
            authors = ", ".join(
                " ".join(filter(None, [a.get("given"), a.get("family")]))
                for a in item.get("author", [])[:8]
            ) or None
            title = item.get("title", [None])[0] or "Untitled"
            journal = item.get("container-title", [None])[0]
            year = None
            parts = item.get("published-print", {}).get("date-parts") or item.get("published-online", {}).get("date-parts")
            if parts and parts[0]:
                year = parts[0][0]
            doi = item.get("DOI")
            out.append(SearchResult(
                title=title,
                source_database=self.source_name,
                source_url=f"https://doi.org/{doi}" if doi else item.get("URL"),
                authors=authors,
                journal=journal,
                publication_year=year,
                doi=doi,
                study_type=item.get("type"),
                snippet=item.get("publisher"),
                raw=item,
            ))
        return out
