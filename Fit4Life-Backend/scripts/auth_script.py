import sqlite3
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException

from config.settings import get_jwt_secret, get_settings
from db.connection import get_db_connection
from lib.errors import AUTH_ERROR, DB_ERROR, SIGNUP_FAILED, raise_http
from models.auth import SigninData, SignupData, SignupUser


_hasher = PasswordHasher()


def _username_from_email(email: str) -> str:
    local = email.split("@", 1)[0]
    return local or email


def signup(email: str, password: str, name: str) -> SignupData:
    username = name.strip() or _username_from_email(email)
    password_hash = _hasher.hash(password)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        try:
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, password_hash),
            )
            conn.commit()
        except sqlite3.IntegrityError as e:
            conn.rollback()
            msg = str(e).lower()
            if "email" in msg:
                raise_http(SIGNUP_FAILED, "Email already registered", status_code=409)
            if "username" in msg:
                raise_http(SIGNUP_FAILED, "Username already taken", status_code=409)
            raise_http(SIGNUP_FAILED, f"Signup failed: {e}", status_code=400)

        user_id = int(cursor.lastrowid or 0)
        return SignupData(
            user=SignupUser(id=str(user_id), email=email, name=username)
        )
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def signin(email: str, password: str) -> SigninData:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT user_id, username, email, password_hash FROM users WHERE email = ?",
            (email,),
        )
        row = cursor.fetchone()
        if row is None:
            raise_http(AUTH_ERROR, "Invalid email or password", status_code=401)

        try:
            _hasher.verify(row["password_hash"], password)
        except VerifyMismatchError:
            raise_http(AUTH_ERROR, "Invalid email or password", status_code=401)

        user_id = int(row["user_id"])
        username = str(row["username"])
        confirmed_email = str(row["email"])

        settings = get_settings()
        now = datetime.now(tz=timezone.utc)
        payload = {
            "sub": str(user_id),
            "email": confirmed_email,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=settings.JWT_TTL_HOURS)).timestamp()),
        }
        token = jwt.encode(payload, get_jwt_secret(), algorithm="HS256")

        return SigninData(
            token=token,
            user=SignupUser(id=str(user_id), email=confirmed_email, name=username),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise_http(DB_ERROR, f"Signin failed: {e}", status_code=500)
    finally:
        cursor.close()
        conn.close()
