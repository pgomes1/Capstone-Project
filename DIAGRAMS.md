# Fit4Life — System Diagrams

Project-wide architecture, user flows, and data-flow diagrams (DFDs) for
Fit4Life, a fitness tracker. This is the top-level view; each component
has its own, more detailed `DIAGRAMS.md`:

- [Fit4Life-Backend/DIAGRAMS.md](Fit4Life-Backend/DIAGRAMS.md) — FastAPI service
- [Fit4Life-UI/DIAGRAMS.md](Fit4Life-UI/DIAGRAMS.md) — React/Vite frontend
- [SQLite-Docker/DIAGRAMS.md](SQLite-Docker/DIAGRAMS.md) — schema & DB bootstrap

## 1. System context

Three Docker services share one named volume. `db-init` is a one-shot
container that seeds/repairs the SQLite file before `backend` is allowed
to start; `frontend` waits until `backend` is healthy.

```mermaid
graph TD
    User((User / Browser))

    subgraph Docker Compose network
        FE["frontend<br/>React + Vite<br/>:5173"]
        BE["backend<br/>FastAPI<br/>:8000/api"]
        INIT["db-init<br/>alpine + sqlite3<br/>(runs once, then exits)"]
        VOL[("fit4life_db<br/>Docker volume<br/>/data/fit4life.db")]
    end

    User -- "HTTP :5173" --> FE
    FE -- "fetch VITE_API_URL<br/>(/api/*, JWT bearer)" --> BE
    INIT -- "applies init.sql<br/>on first boot" --> VOL
    BE -- "reads/writes SQLite" --> VOL
    INIT -. "service_completed_successfully" .-> BE
    BE -. "service_healthy" .-> FE
```

## 2. End-to-end user flow

The full journey across frontend and backend, from first visit to
logging a run.

```mermaid
flowchart TD
    Start([Visit localhost:5173]) --> HasSession{Valid session<br/>in localStorage?}
    HasSession -- "no" --> Login[Login page]
    HasSession -- "yes" --> Dashboard[Dashboard]

    Login -- "no account" --> Signup[Signup page]
    Signup -- "POST /api/auth/signup<br/>then POST /api/auth/signin" --> Dashboard
    Login -- "POST /api/auth/signin" --> Dashboard

    Dashboard -- "GET /api/runs" --> ViewStats[View charts / stats / run list]
    ViewStats -- "Add Workout" --> AddWorkout[Log Run page]
    AddWorkout -- "POST /api/runs" --> Dashboard
    ViewStats -- "Delete run" --> DeleteConfirm{Confirm?}
    DeleteConfirm -- "yes" --> DeleteRun["DELETE /api/runs/:id"]
    DeleteRun --> ViewStats
    DeleteConfirm -- "no" --> ViewStats
    ViewStats -- "Logout" --> ClearSession[Clear token + user<br/>from localStorage]
    ClearSession --> Login
```

## 3. Data flow diagram — Level 0 (context)

```mermaid
flowchart LR
    U((User))
    SYS["Fit4Life System<br/>(Frontend + Backend)"]
    DB[("SQLite DB<br/>users, runs")]

    U -- "credentials, run entries" --> SYS
    SYS -- "session token, dashboards,<br/>run history" --> U
    SYS -- "reads/writes" --> DB
    DB -- "rows" --> SYS
```

## 4. Data flow diagram — Level 1

Breaks the backend into its three functional processes and shows the
frontend as the sole external entity driving them.

```mermaid
flowchart LR
    FE((Frontend))

    P1["P1 — Auth Handler<br/>(signup / signin)"]
    P2["P2 — Runs Handler<br/>(list / add / delete)<br/>[requires JWT]"]
    P3["P3 — Health Handler"]

    D1[("D1 — users table")]
    D2[("D2 — runs table")]

    FE -- "email, password, name" --> P1
    P1 -- "insert user / verify hash" --> D1
    D1 -- "user row" --> P1
    P1 -- "JWT + user profile" --> FE

    FE -- "Bearer JWT + run data" --> P2
    P2 -- "insert / select / delete" --> D2
    D2 -- "run rows" --> P2
    P2 -- "run list / confirmation" --> FE

    FE -- "GET /api/health" --> P3
    P3 -- "status ok" --> FE
```

## 5. How the pieces relate (cross-component sequence)

A single "sign up, then log a run" journey traced across all three
components, to show how the component-level docs connect.

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Fit4Life-UI<br/>(React)
    participant API as Fit4Life-Backend<br/>(FastAPI)
    participant DB as SQLite<br/>(SQLite-Docker schema)

    U->>UI: Fill signup form, submit
    UI->>API: POST /api/auth/signup {email, password, name}
    API->>DB: INSERT INTO users (...)
    DB-->>API: user_id
    API-->>UI: 200 { user }

    UI->>API: POST /api/auth/signin {email, password}
    API->>DB: SELECT * FROM users WHERE email = ?
    DB-->>API: user row (password_hash)
    API-->>UI: 200 { token, user }
    UI->>UI: store token + user in localStorage

    U->>UI: Log a run, submit
    UI->>API: POST /api/runs (Bearer token)
    API->>API: verify_jwt() decodes token
    API->>DB: INSERT INTO runs (...)
    DB-->>API: new run rows
    API-->>UI: 200 { runs }
    UI-->>U: Redirect to Dashboard, charts update
```

## See also

- [Fit4Life-Backend/DIAGRAMS.md](Fit4Life-Backend/DIAGRAMS.md) — endpoint/script/DB internals, auth sequence detail
- [Fit4Life-UI/DIAGRAMS.md](Fit4Life-UI/DIAGRAMS.md) — routing, protected routes, component-level flows
- [SQLite-Docker/DIAGRAMS.md](SQLite-Docker/DIAGRAMS.md) — schema ER diagram, `db-init` bootstrap logic
