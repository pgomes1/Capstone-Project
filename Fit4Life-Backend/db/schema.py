"""DDL is owned by SQLite-Docker/init.sql. This module only verifies the
expected tables exist; it never creates, drops, or alters anything.
"""

from db.connection import get_db_connection

EXPECTED_TABLES = ("users", "runs")


def assert_schema() -> tuple[bool, list[str]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
        present = {row["name"] for row in cursor.fetchall()}
        missing = [t for t in EXPECTED_TABLES if t not in present]
        return (len(missing) == 0, missing)
    finally:
        conn.close()
