import sqlite3

from fastapi import HTTPException

from db.connection import get_db_connection
from lib.errors import DB_ERROR, RUN_NOT_FOUND, raise_http
from middleware.auth import AuthedUser
from models.runs import RunIn, RunOut


def _resolve_local_user_id(authed: AuthedUser) -> int:
    """The JWT's sub is the local users.user_id, set at signin time."""
    try:
        return int(authed.sub)
    except (TypeError, ValueError):
        raise_http(DB_ERROR, "Invalid user identifier in token", status_code=400)


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
    user_id = _resolve_local_user_id(authed)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
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
    user_id = _resolve_local_user_id(authed)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
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

    user_id = _resolve_local_user_id(authed)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
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
