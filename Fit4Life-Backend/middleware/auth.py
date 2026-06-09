from dataclasses import dataclass

import jwt
from fastapi import Header

from config.settings import get_settings
from lib.errors import AUTH_ERROR, raise_http


@dataclass(frozen=True)
class AuthedUser:
    sub: str
    email: str


def verify_jwt(authorization: str | None = Header(default=None)) -> AuthedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise_http(AUTH_ERROR, "Missing or malformed Authorization header", 401)

    token = authorization.split(" ", 1)[1].strip()
    settings = get_settings()

    if not settings.SUPABASE_JWT_SECRET:
        raise_http(AUTH_ERROR, "Server is not configured for JWT verification", 500)

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise_http(AUTH_ERROR, "Token expired", 401)
    except jwt.InvalidTokenError as e:
        raise_http(AUTH_ERROR, f"Invalid token: {e}", 401)

    sub = payload.get("sub")
    email = payload.get("email") or ""
    if not sub:
        raise_http(AUTH_ERROR, "Token missing subject", 401)

    return AuthedUser(sub=str(sub), email=str(email))
