#!/bin/sh
set -e

# Database file path
DB_PATH="${DB_PATH:-/data/fit4life.db}"
INIT_SCRIPT="/app/init.sql"

# Create data directory if it doesn't exist
mkdir -p "$(dirname "$DB_PATH")"

# Initialize database if it doesn't exist
if [ ! -f "$DB_PATH" ]; then
    echo "Initializing database at $DB_PATH..."
    sqlite3 "$DB_PATH" < "$INIT_SCRIPT"
    echo "Database initialized successfully"
else
    echo "Database already exists at $DB_PATH"
fi

# Verify database is accessible
echo "Verifying database connectivity..."
sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null && echo "Database check passed" || echo "Database check failed"

# Keep container running
echo "Database container ready. Keeping process alive..."
tail -f /dev/null
