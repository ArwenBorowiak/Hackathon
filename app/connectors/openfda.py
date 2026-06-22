import httpx
from app.core.config import settings
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class OpenFDAConnector(BaseConnector):
    source_name = "openfda"

    async def search(self, compound: str, keywords: list[str], limit: int):
        term = compound
        if keywords:
            term += " AND " + " AND ".join(keywords)
        params = {"search": f'openfda.generic_name:"{compound}"', "limit": limit}
        if settings.openfda_api_key:
            params["api_key"] = settings.openfda_api_key
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get("https://api.fda.gov/drug/label.json", params=params)
            if resp.status_code >= 400:
                return []
            items = resp.json().get("results", [])
        out = []
        for item in items:
            openfda = item.get("openfda", {})
            title = (openfda.get("brand_name") or [compound])[0]
            authors = ", ".join(openfda.get("manufacturer_name", [])[:3]) or None
            out.append(SearchResult(
                title=title,
                source_database=self.source_name,
                source_url=None,
                authors=authors,
                journal="FDA drug label",
                publication_year=None,
                fda_identifier=(openfda.get("application_number") or [None])[0],
                study_type="label",
                snippet=(item.get("indications_and_usage") or [None])[0],
                raw=item,
            ))
        return out
