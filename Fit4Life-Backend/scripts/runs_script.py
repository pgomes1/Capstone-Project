import sqlite3

from fastapi import HTTPException

from db.connection import get_db_connection
from lib.errors import DB_ERROR, RUN_NOT_FOUND, raise_http
from middleware.auth import AuthedUser
from models.runs import RunIn, RunOut


def _username_from_email(email: str) -> str:
    local = email.split("@", 1)[0]
    return local or email


def _resolve_local_user_id(conn: sqlite3.Connection, authed: AuthedUser) -> int:
    """Get the local users.user_id for the Supabase-authenticated user.

    The local users row is normally seeded at signup. If a valid JWT arrives
    without a matching row (legacy/imported user), lazily create one.
    """
    if not authed.email:
        raise_http(DB_ERROR, "JWT missing email; cannot resolve local user", status_code=400)

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id FROM users WHERE email = ?", (authed.email,))
        row = cursor.fetchone()
        if row is not None:
            return int(row["user_id"])

        cursor.execute(
            "INSERT INTO users (username, email) VALUES (?, ?)",
            (_username_from_email(authed.email), authed.email),
        )
        conn.commit()
        return int(cursor.lastrowid or 0)
    finally:
        cursor.close()


def _row_to_run_out(row: sqlite3.Row) -> RunOut:
    return RunOut(
        id=str(row["run_id"]),
        userId=str(row["user_id"]),
        date=str(row["run_date"]),
        distanceMiles=float(row["distance_mi"]),
        durationMinutes=float(row["duration_minutes"]),
        createdAt=str(row["created_at"]),
    )


def list_runs(authed: AuthedUser) -> list[RunOut]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = _resolve_local_user_id(conn, authed)
        cursor.execute(
            """
            SELECT run_id, user_id, run_date, distance_mi, duration_minutes, created_at
            FROM runs
            WHERE user_id = ?
            ORDER BY run_date DESC, run_id DESC
            """,
            (user_id,),
        )
        return [_row_to_run_out(r) for r in cursor.fetchall()]
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise_http(DB_ERROR, f"Failed to list runs: {e}", status_code=500)
    finally:
        cursor.close()
        conn.close()


def add_runs(authed: AuthedUser, sessions: list[RunIn]) -> list[RunOut]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = _resolve_local_user_id(conn, authed)
        new_ids: list[int] = []
        for s in sessions:
            cursor.execute(
                """
                INSERT INTO runs (user_id, run_date, distance_mi, duration_minutes)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, s.date, s.distanceMiles, s.durationMinutes),
            )
            if cursor.lastrowid is not None:
                new_ids.append(int(cursor.lastrowid))
        conn.commit()

        if not new_ids:
            return []

        placeholders = ",".join("?" for _ in new_ids)
        cursor.execute(
            f"""
            SELECT run_id, user_id, run_date, distance_mi, duration_minutes, created_at
            FROM runs
            WHERE run_id IN ({placeholders})
            ORDER BY run_id ASC
            """,
            new_ids,
        )
        return [_row_to_run_out(r) for r in cursor.fetchall()]
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise_http(DB_ERROR, f"Failed to add runs: {e}", status_code=500)
    finally:
        cursor.close()
        conn.close()


def delete_run(authed: AuthedUser, run_id: str) -> None:
    try:
        rid = int(run_id)
    except ValueError:
        raise_http(RUN_NOT_FOUND, "Run not found", status_code=404)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = _resolve_local_user_id(conn, authed)
        cursor.execute(
            "DELETE FROM runs WHERE run_id = ? AND user_id = ?",
            (rid, user_id),
        )
        if cursor.rowcount == 0:
            conn.rollback()
            raise_http(RUN_NOT_FOUND, "Run not found", status_code=404)
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise_http(DB_ERROR, f"Failed to delete run: {e}", status_code=500)
    finally:
        cursor.close()
        conn.close()
