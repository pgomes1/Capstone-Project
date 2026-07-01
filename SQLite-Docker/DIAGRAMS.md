# SQLite-Docker — Diagrams

Schema and bootstrap diagrams for the database layer. For how this fits
into the whole system, see [../DIAGRAMS.md](../DIAGRAMS.md). For the
service that reads/writes this schema, see
[../Fit4Life-Backend/DIAGRAMS.md](../Fit4Life-Backend/DIAGRAMS.md).

## 1. Entity relationship diagram

From [`init.sql`](init.sql).

```mermaid
erDiagram
    users ||--o{ runs : "has many"

    users {
        INTEGER user_id PK
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        DATETIME created_at
    }

    runs {
        INTEGER run_id PK
        INTEGER user_id FK
        DATE run_date
        REAL distance_mi
        REAL duration_minutes
        DATETIME created_at
    }
```

`runs.user_id` has `ON DELETE CASCADE`; deleting a user removes their
runs. `idx_runs_user_date` indexes `runs(user_id, run_date)` for the
dashboard's per-user, date-ordered queries.

## 2. `db-init` bootstrap flow

The `db-init` service (`docker-compose.yml`) runs once before `backend`
is allowed to start, and decides how to (re)initialize the shared
volume.

```mermaid
flowchart TD
    Start(["db-init container starts<br/>installs sqlite3 (alpine)"]) --> Check{"/data/fit4life.db<br/>exists and non-empty?"}

    Check -- "no" --> Init["Run init.sql<br/>(fresh schema)"]
    Check -- "yes" --> SchemaCheck{"SELECT password_hash<br/>FROM users LIMIT 1<br/>succeeds?"}

    SchemaCheck -- "yes (current schema)" --> Skip["Skip — schema already present"]
    SchemaCheck -- "no (old/wrong shape)" --> Drop["DROP TABLE runs, users<br/>(pre-existing rows discarded)"]
    Drop --> Init

    Init --> Done(["exit 0"])
    Skip --> Done
    Done --> Backend["backend service allowed to start<br/>(depends_on: service_completed_successfully)"]
```

## 3. Data flow diagram

```mermaid
flowchart LR
    INIT["db-init<br/>(one-shot)"]
    BE["backend<br/>(FastAPI)"]
    VOL[("fit4life_db volume<br/>/data/fit4life.db")]
    SQL["init.sql<br/>(mounted read-only)"]

    SQL -- "DDL" --> INIT
    INIT -- "creates/repairs schema" --> VOL
    BE -- "INSERT/SELECT/DELETE<br/>users, runs" --> VOL
    VOL -- "rows" --> BE
```

## Factory reset

`docker compose down -v` deletes the named volume; the next
`docker compose up -d` recreates it and `db-init` reapplies
[`init.sql`](init.sql) from scratch.
