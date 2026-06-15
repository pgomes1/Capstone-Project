import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    SQLITE_PATH: str = Field(default="/data/fit4life.db")
    LOCAL_JWT_SECRET: str = Field(default="")
    JWT_TTL_HOURS: int = Field(default=720)
    CORS_ORIGINS: str = Field(default="http://localhost:5173")
    PORT: int = Field(default=8000)

    @property
    def sqlite_path_resolved(self) -> Path:
        p = Path(self.SQLITE_PATH)
        return p if p.is_absolute() else (BACKEND_DIR / p).resolve()

    @property
    def jwt_secret_file(self) -> Path:
        return self.sqlite_path_resolved.parent / ".jwt_secret"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def resolve_jwt_secret(self) -> str:
        if self.LOCAL_JWT_SECRET:
            return self.LOCAL_JWT_SECRET
        secret_file = self.jwt_secret_file
        if secret_file.exists():
            return secret_file.read_text(encoding="utf-8").strip()
        new_secret = secrets.token_urlsafe(48)
        secret_file.parent.mkdir(parents=True, exist_ok=True)
        secret_file.write_text(new_secret, encoding="utf-8")
        try:
            secret_file.chmod(0o600)
        except OSError:
            pass
        return new_secret


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


@lru_cache(maxsize=1)
def get_jwt_secret() -> str:
    return get_settings().resolve_jwt_secret()
