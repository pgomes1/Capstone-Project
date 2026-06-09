import sqlite3

from config.settings import get_settings


def get_db_connection() -> sqlite3.Connection:
    settings = get_settings()
    conn = sqlite3.connect(str(settings.sqlite_path_resolved))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
