#!/bin/sh
set -e

echo "Starting Fit4Life Backend..."
cd /app
export PYTHONPATH=/app

# Wait for database to be ready
echo "Waiting for database connection..."
counter=0
while [ $counter -lt 30 ]; do
    if python -c "from db.connection import get_db_connection; get_db_connection().close()" 2>/dev/null; then
        echo "Database is ready!"
        break
    fi
    counter=$((counter + 1))
    sleep 1
done

echo "Starting Uvicorn server on port 8000..."
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000
