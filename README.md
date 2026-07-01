# Capstone-Project

The fitness tracker capstone project of Group Echo.

## Prerequisites

### Docker (recommended path)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose) **or** Docker Engine + the `docker compose` plugin

### Local dev (without Docker)

- Python 3.12+
- Node.js 20+ with [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

## Quick start (Docker)

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
| `docker compose logs -f backend` | Tail backend logs only |
| `docker compose down` | Stop everything; keep data |
| `docker compose down -v` | Stop everything and wipe the local database (factory reset) |

### Ports

| Service | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8000/api> |
| Health check | <http://localhost:8000/api/health> |

## Project layout

> See [DIAGRAMS.md](DIAGRAMS.md) for system architecture, user-flow, and data-flow diagrams (with links to per-component diagrams).

### 📂 [Fit4Life-Backend](Fit4Life-Backend)
Python / FastAPI API at <http://localhost:8000/api>. Reads/writes a
local SQLite database, issues its own JWTs (no cloud auth).

### 📂 [Fit4Life-UI](Fit4Life-UI)
React + Vite frontend at <http://localhost:5173>. Talks to the local
backend via `VITE_API_URL` (set by docker-compose).

### 📂 [SQLite-Docker](SQLite-Docker)
Holds the canonical schema (`init.sql`). The `db-init` service in
docker-compose applies it automatically to a per-machine Docker
volume on first start.

## Running without Docker

Run both services in separate terminals. The frontend expects the backend on `:8000`; the backend expects the frontend origin on `:5173` for CORS.

### Terminal 1 — Backend

```bash
cd Fit4Life-Backend

# Create and activate a virtual environment (first time only)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies (first time or after requirements change)
pip install -r requirements.txt

# Create .env from the template and set a local DB path
cp .env.example .env
# Edit .env and change SQLITE_PATH to a local file, e.g.:
#   SQLITE_PATH=./fit4life.db

# Apply the schema (first time only)
sqlite3 fit4life.db < ../SQLite-Docker/init.sql

# Start the backend with hot reload
make dev
# or: uvicorn main:app --reload --port 8000
```

The API is now available at <http://localhost:8000/api>.

### Terminal 2 — Frontend

```bash
cd Fit4Life-UI

# Install dependencies (first time or after package changes)
pnpm install

# Start the dev server with HMR
pnpm dev
```

The app is now available at <http://localhost:5173>.

> **Note:** `VITE_API_URL` defaults to `http://localhost:8000/api` when unset, so no extra environment configuration is needed for local dev.
