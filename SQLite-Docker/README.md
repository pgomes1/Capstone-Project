# Fit4Life SQLite Schema

This directory holds the canonical database schema (`init.sql`). The
schema is applied automatically by the `db-init` service in the
repo-root `docker-compose.yml`. You do not need to run anything in this
directory manually — `docker compose up -d` from the repo root handles it.

## What's defined

- **`users`** (`user_id`, `username`, `email`, `password_hash`, `created_at`)
- **`runs`** (`run_id`, `user_id` FK → `users`, `run_date`, `distance_mi`,
  `duration_minutes`, `created_at`)
- Index `idx_runs_user_date` on `runs(user_id, run_date)`

Foreign-key constraint on `runs.user_id` cascades on delete.

## How the schema gets applied

The `db-init` service in the repo-root `docker-compose.yml`:
1. Mounts a shared Docker volume at `/data`.
2. Mounts this `init.sql` at `/init.sql` read-only.
3. Detects whether `/data/fit4life.db` is empty, populated with the
   current schema, or populated with a pre-migration shape — and
   applies `init.sql` if needed.

The Python backend reads the same volume at `/data/fit4life.db`.

## Running the DDL by hand (for debugging only)

```bash
sqlite3 /tmp/fit4life.db < init.sql
sqlite3 /tmp/fit4life.db '.schema'
```

## Factory reset

To wipe the per-machine volume and start fresh:

```bash
docker compose down -v
docker compose up -d
```
