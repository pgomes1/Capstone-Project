import sqlite3

from db.connection import get_db_connection
from integrations.supabase_admin import SupabaseAdminError, create_user
from lib.errors import DB_ERROR, SIGNUP_FAILED, raise_http
from models.auth import SignupData, SignupUser


def _username_from_email(email: str) -> str:
    local = email.split("@", 1)[0]
    return local or email


def _seed_local_user(email: str, name: str) -> None:
    """Insert a row into local users. Best-effort: tolerates UNIQUE collisions."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (username, email) VALUES (?, ?)",
                (name or _username_from_email(email), email),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            try:
                cursor.execute(
                    "INSERT INTO users (username, email) VALUES (?, ?)",
                    (_username_from_email(email), email),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                conn.rollback()
        finally:
            cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def signup(email: str, password: str, name: str) -> SignupData:
    try:
        supa_user = create_user(email=email, password=password, name=name)
    except SupabaseAdminError as e:
        raise_http(SIGNUP_FAILED, e.message, status_code=400)

    user_id = str(supa_user.get("id") or "")
    confirmed_email = str(supa_user.get("email") or email)
    metadata = supa_user.get("user_metadata") or {}
    display_name = str(metadata.get("name") or name)

    try:
        _seed_local_user(confirmed_email, display_name)
    except Exception as e:
        raise_http(DB_ERROR, f"Failed to seed local user: {e}", status_code=500)

    return SignupData(user=SignupUser(id=user_id, email=confirmed_email, name=display_name))
