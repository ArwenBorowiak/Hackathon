from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List
from app.schemas.common import SearchResult


class BaseConnector(ABC):
    source_name: str

    @abstractmethod
    async def search(self, compound: str, keywords: list[str], limit: int) -> List[SearchResult]:
        raise NotImplementedError
