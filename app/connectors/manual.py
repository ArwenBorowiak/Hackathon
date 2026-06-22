from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class ManualReferenceConnector(BaseConnector):
    def __init__(self, source_name: str = "manual-reference", label: str = "Manual / licensed source"):
        self.source_name = source_name
        self.label = label

    async def search(self, compound: str, keywords: list[str], limit: int):
        query = " ".join([compound] + keywords).strip()
        return [
            SearchResult(
                title=f"Manual intake placeholder for {query}",
                source_database=self.source_name,
                source_url=None,
                authors=None,
                journal=self.label,
                publication_year=None,
                study_type="manual review",
                snippet=f"Use this for {self.label} or any source without an integrated API.",
                raw={},
            )
        ]
