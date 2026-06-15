# Capstone-Project

The fitness tracker capstone project of Group Echo.

## Quick start

```bash
git clone <repo-url>
cd Capstone-Project
docker compose up -d --build
```

Open <http://localhost:5173> in a browser. That's it.

The stack runs entirely on your machine in Docker. Each teammate has
their own isolated database — like a mobile app that stores data on
the device.

### Common commands

| Command | What it does |
|---|---|
| `docker compose up -d --build` | Start everything (first run or after code changes) |
| `docker compose up -d` | Start everything (using cached images) |
| `docker compose ps` | Check service health |
| `docker compose logs -f` | Tail logs from all services |
| `docker compose down` | Stop everything; keep data |
| `docker compose down -v` | Stop everything and wipe the local database (factory reset) |

## Project layout

### 📂 [Fit4Life-Backend](Fit4Life-Backend)
Python / FastAPI API at <http://localhost:8000/api>. Reads/writes a
local SQLite database, issues its own JWTs (no cloud auth).
See [Fit4Life-Backend/AGENTS.md](Fit4Life-Backend/AGENTS.md) for
backend conventions.

### 📂 [Fit4Life-UI](Fit4Life-UI)
React + Vite frontend at <http://localhost:5173>. Talks to the local
backend via `VITE_API_URL` (set by docker-compose).

### 📂 [SQLite-Docker](SQLite-Docker)
Holds the canonical schema (`init.sql`). The `db-init` service in
docker-compose applies it automatically to a per-machine Docker
volume on first start.

## Running without Docker (optional)

For backend hacking with hot reload:

```bash
cd Fit4Life-Backend
source venv/bin/activate
cp .env.example .env  # override SQLITE_PATH to a local path
make dev
```

For frontend hacking with HMR:

```bash
cd Fit4Life-UI
pnpm install
pnpm dev
```

Both default to the same ports as the containers (`:8000`, `:5173`).
