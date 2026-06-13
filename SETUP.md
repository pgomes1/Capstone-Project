# Fit4Life Integration Setup Guide

This guide explains how to set up and run the Fit4Life application with the integrated backend, database, and UI.

## Architecture Overview

The Fit4Life application consists of three main components:

1. **SQLite-Docker**: Database container that runs SQLite database
2. **Fit4Life-Backend**: FastAPI backend server that handles API requests
3. **Fit4Life-UI**: React/TypeScript frontend that communicates with the backend

## Prerequisites

- Docker and Docker Compose installed
- Node.js/npm or pnpm for UI development
- Python 3.12+ (if running backend locally)

## Running the Full Stack with Docker Compose

### Step 1: Configure Supabase Credentials

Update the backend `.env` file with your Supabase credentials:

```bash
cd Fit4Life-Backend
cp .env.example .env
# Edit .env with your Supabase credentials
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key for client-side auth
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `SUPABASE_JWT_SECRET`: JWT secret for token verification

### Step 2: Build and Run Containers

From the project root directory:

```bash
docker-compose up --build
```

This will:
1. Build the SQLite database container
2. Initialize the database with the schema from `init.sql`
3. Build and start the FastAPI backend server
4. Mount a shared volume for database persistence

The backend will be available at: `http://localhost:8000`
Health check endpoint: `http://localhost:8000/api/health`

### Step 3: Run the UI (Local Development)

In a separate terminal:

```bash
cd Fit4Life-UI
npm install  # or pnpm install
npm run dev
```

The UI will be available at: `http://localhost:5173`

### Step 4: Configure UI for Backend

The UI is already configured to use the local backend at `http://localhost:8000/api`.
The API utility file has been updated to point to:
- `/api/auth/signup` for user registration
- `/api/runs` for workout operations
- `/api/health` for health checks

## Running Backend Locally (Without Docker)

If you want to run the backend without Docker:

1. **Ensure database is initialized**:
   ```bash
   cd SQLite-Docker
   sqlite3 data/fit4life.db < init.sql
   ```

2. **Set up Python environment**:
   ```bash
   cd Fit4Life-Backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```

3. **Run the backend**:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user

### Health Check
- `GET /api/health` - Check backend health

### Runs/Workouts (requires JWT authentication)
- `GET /api/runs` - List all user runs
- `POST /api/runs` - Create new runs (batch)
- `DELETE /api/runs/{run_id}` - Delete a specific run

## Authentication Flow

1. User registers/logs in via Supabase authentication in the UI
2. Supabase provides a JWT access token
3. UI includes this token in the `Authorization: Bearer <token>` header
4. Backend verifies the JWT token using the `SUPABASE_JWT_SECRET`
5. JWT payload must include:
   - `sub`: User ID (required)
   - `email`: User email (used for database mapping)
   - `aud`: "authenticated"

## Database Schema

### Users Table
- `user_id`: Primary key (auto-increment)
- `username`: Unique username
- `email`: Unique email address
- `created_at`: Account creation timestamp

### Runs Table
- `run_id`: Primary key (auto-increment)
- `user_id`: Foreign key to users
- `run_date`: Date of the run (YYYY-MM-DD)
- `distance_mi`: Distance in miles
- `duration_minutes`: Duration in minutes
- `created_at`: Record creation timestamp

## Stopping the Services

### To stop Docker containers:
```bash
docker-compose down
```

### To remove volumes (clear database):
```bash
docker-compose down -v
```

## Troubleshooting

### Backend cannot connect to database
- Ensure the SQLite container is running: `docker-compose ps`
- Check if the `db_data` volume is created: `docker volume ls`
- Verify database file exists: `docker exec fit4life_db ls -la /app/`

### UI cannot connect to backend
- Verify backend is running: `curl http://localhost:8000/api/health`
- Check CORS settings in `Fit4Life-Backend/.env`
- Ensure `CORS_ORIGINS` includes `http://localhost:5173`

### Database initialization failed
- Check `SQLite-Docker/init.sql` for syntax errors
- Rebuild the container: `docker-compose down && docker-compose up --build`

### JWT token verification failed
- Verify `SUPABASE_JWT_SECRET` is correctly set in `.env`
- Ensure token is included in the `Authorization` header
- Check that the token is not expired

## Development Tips

1. **Hot Reload**: Both backend (with `--reload`) and UI (Vite) support hot reload during development
2. **Database Inspection**: Access the database directly:
   ```bash
   docker exec -it fit4life_db sqlite3 /app/fit4life.db
   ```
3. **Backend Logs**: View logs with `docker-compose logs backend`
4. **API Documentation**: Swagger UI available at `http://localhost:8000/docs` (when backend is running)

## Next Steps

1. Update UI components to ensure they handle the API responses correctly
2. Test the complete flow: signup → login → add runs → view runs
3. Set up proper error handling for network failures
4. Configure environment-specific settings for production deployment
