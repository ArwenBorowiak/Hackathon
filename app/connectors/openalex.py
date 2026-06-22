import httpx
from app.core.config import settings
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class OpenAlexConnector(BaseConnector):
    source_name = "openalex"

    async def search(self, compound: str, keywords: list[str], limit: int):
        q = " ".join([compound] + keywords).strip()
        params = {"search": q, "per-page": limit}
        if settings.openalex_api_key:
            params["api_key"] = settings.openalex_api_key
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get("https://api.openalex.org/works", params=params)
            resp.raise_for_status()
            data = resp.json().get("results", [])
        out = []
        for item in data:
            authorships = item.get("authorships", [])
            authors = ", ".join(a.get("author", {}).get("display_name", "") for a in authorships[:8]) or None
            host = item.get("primary_location", {}).get("source", {})
            out.append(SearchResult(
                title=item.get("title") or item.get("display_name") or "Untitled",
                source_database=self.source_name,
                source_url=item.get("id"),
                authors=authors,
                journal=host.get("display_name"),
                publication_year=item.get("publication_year"),
                doi=(item.get("doi") or "").replace("https://doi.org/", "") or None,
                study_type=item.get("type"),
                snippet=item.get("abstract_inverted_index") and "Abstract available in OpenAlex metadata",
                raw=item,
            ))
        return out
