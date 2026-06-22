from urllib.parse import quote_plus
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class ManualReferenceConnector(BaseConnector):
    def __init__(self, source_name: str = "manual-reference", label: str = "Manual / licensed source", base_url: str | None = None, site_query: str | None = None):
        self.source_name = source_name
        self.label = label
        self.base_url = base_url
        self.site_query = site_query

    def _build_url(self, compound: str, keywords: list[str]) -> str | None:
        query = " ".join([compound] + keywords).strip()
        if self.base_url and "{query}" in self.base_url:
            return self.base_url.format(query=quote_plus(query))
        if self.base_url:
            return self.base_url
        if self.site_query:
            return f"https://www.google.com/search?q={quote_plus(query + ' ' + self.site_query)}"
        return None

    async def search(self, compound: str, keywords: list[str], limit: int):
        query = " ".join([compound] + keywords).strip()
        return [
            SearchResult(
                title=f"Search {self.label} for {query}",
                source_database=self.source_name,
                source_url=self._build_url(compound, keywords),
                authors=None,
                journal=self.label,
                publication_year=None,
                study_type="manual review",
                snippet=f"Jump-off link for {self.label}. Use this when an approved site or manual review is needed.",
                raw={},
            )
        ]
