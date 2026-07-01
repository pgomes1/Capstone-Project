"""Shared test utilities: temporary SQLite database with the app schema."""

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

SCHEMA_PATH = _BACKEND_ROOT.parent / "SQLite-Docker" / "init.sql"


def create_test_db() -> str:
    """Create a temp SQLite file with the app schema applied. Returns the path."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()
    conn.close()
    return path


def make_connector(db_path: str):
    """Return a get_db_connection replacement that opens the given file."""
    def _connect() -> sqlite3.Connection:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    return _connect


def insert_user(db_path: str, email: str, name: str = "Runner") -> int:
    """Directly insert a user row and return its user_id."""
    conn = sqlite3.connect(db_path)
    conn.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (name, email, "$argon2id$placeholder"),
    )
    conn.commit()
    user_id = conn.execute(
        "SELECT user_id FROM users WHERE email = ?", (email,)
    ).fetchone()[0]
    conn.close()
    return int(user_id)
