"""Supabase Admin REST client.

Plan called for the `supabase` Python SDK, but it isn't installed. Using a
thin httpx wrapper around the Admin Users API instead — same effect, one
fewer dependency.
"""

from functools import lru_cache

import httpx

from config.settings import get_settings


@lru_cache(maxsize=1)
def _client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        base_url=settings.SUPABASE_URL,
        headers={
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        },
        timeout=10.0,
    )


def create_user(email: str, password: str, name: str) -> dict:
    """POST /auth/v1/admin/users — creates a confirmed user with metadata.name."""
    resp = _client().post(
        "/auth/v1/admin/users",
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"name": name},
        },
    )
    if resp.status_code >= 400:
        try:
            body = resp.json()
            message = body.get("msg") or body.get("message") or str(body)
        except ValueError:
            message = resp.text
        raise SupabaseAdminError(resp.status_code, message)
    return resp.json()


class SupabaseAdminError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
