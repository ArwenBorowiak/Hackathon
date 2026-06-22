import httpx
from app.connectors.base import BaseConnector
from app.schemas.common import SearchResult


class PubChemConnector(BaseConnector):
    source_name = "pubchem"

    async def search(self, compound: str, keywords: list[str], limit: int):
        async with httpx.AsyncClient(timeout=20) as client:
            cid_resp = await client.get(f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{compound}/cids/JSON")
            if cid_resp.status_code >= 400:
                return []
            ids = cid_resp.json().get("IdentifierList", {}).get("CID", [])[:1]
            if not ids:
                return []
            cid = str(ids[0])
            prop_resp = await client.get(
                f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/Title,CanonicalSMILES/JSON"
            )
            prop_resp.raise_for_status()
            props = prop_resp.json().get("PropertyTable", {}).get("Properties", [{}])[0]
        return [SearchResult(
            title=props.get("Title", compound),
            source_database=self.source_name,
            source_url=f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
            authors=None,
            journal="PubChem",
            publication_year=None,
            pubchem_cid=cid,
            smiles=props.get("CanonicalSMILES"),
            study_type="chemical profile",
            snippet="Chemical identifier record",
            raw=props,
        )]
