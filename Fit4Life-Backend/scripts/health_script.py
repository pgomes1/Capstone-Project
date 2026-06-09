from db.connection import get_db_connection


def check() -> dict:
    db_status = "ok"
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
        finally:
            conn.close()
    except Exception:
        db_status = "down"
    return {"status": "ok", "db": db_status}
