from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class ManualReferenceConnector(BaseConnector):
    source_name = "manual-reference"

    async def search(self, compound: str, keywords: list[str], limit: int):
        query = " ".join([compound] + keywords).strip()
        return [
            SearchResult(
                title=f"Manual intake placeholder for {query}",
                source_database=self.source_name,
                source_url=None,
                authors=None,
                journal="Manual / licensed source",
                publication_year=None,
                study_type="manual review",
                snippet="Use this when a reviewer needs to enter evidence from a licensed PDF, internal database, or a source without a supported API.",
                raw={},
            )
        ]
