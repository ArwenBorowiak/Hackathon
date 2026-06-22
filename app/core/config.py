from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_name: str = "Desloratadine Dossier Intake Platform"
    base_url: str = "http://localhost:8000"
    database_url: str = "sqlite:///./app.db"
    default_user: str = "hackathon-demo"
    log_level: str = "INFO"

    openalex_api_key: str | None = None
    openfda_api_key: str | None = None
    ncbi_api_key: str | None = None
    crossref_mailto: str | None = None
    serpapi_api_key: str | None = None
    google_cse_api_key: str | None = None
    google_cse_cx: str | None = None
    hubble_base_url: str | None = None
    hubble_api_key: str | None = None


settings = Settings()
