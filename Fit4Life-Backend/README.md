# Fit4Life Backend

RESTful API server for the Fit4Life fitness tracker application. Built with Python and FastAPI.

## Directory Structure

```
Fit4Life-Backend/
│
├── config/                      # Application configuration
│   ├── __init__.py
│   └── settings.py              # Configuration settings and environment variables
│
├── db/                          # Database layer
│   ├── __init__.py
│   ├── connection.py            # Database connection handling
│   └── schema.py                # Database schema definitions
│
├── endpoints/                   # API route handlers
│   ├── __init__.py
│   ├── auth_endpoint.py         # Authentication routes
│   ├── health_endpoint.py       # Health check routes
│   └── runs_endpoint.py         # Workout runs routes
│
├── integrations/                # Third-party service integrations
│   ├── __init__.py
│   └── supabase_admin.py        # Supabase admin client integration
│
├── lib/                         # Shared library code
│   ├── __init__.py
│   └── errors.py                # Custom error definitions
│
├── middleware/                  # HTTP middleware
│   ├── __init__.py
│   ├── auth.py                  # Authentication middleware
│   └── cors.py                  # CORS configuration
│
├── models/                      # Data models and validation schemas
│   ├── __init__.py
│   ├── auth.py                  # Authentication data models
│   ├── common.py                # Common shared models
│   └── runs.py                  # Workout run data models
│
├── scripts/                     # Utility and database scripts
│   ├── __init__.py
│   ├── auth_script.py           # Authentication utility scripts
│   ├── health_script.py         # Health check scripts
│   └── runs_script.py           # Run management scripts
│
├── utils/                       # Helper utilities
│   ├── __init__.py
│   └── time.py                  # Time utility functions
│
├── main.py                      # Application entry point
├── Dockerfile                   # Docker container configuration
├── Makefile                     # Build and development commands
├── requirements.txt             # Python production dependencies
├── requirements-dev.txt         # Python development dependencies
├── .env.example                 # Environment variables template
└── .gitignore                   # Git ignore patterns
```

## Key Components

### `config/`
Centralized configuration management for the application. Handles environment variables and settings initialization.

### `db/`
Database abstraction layer including connection pooling and schema management for SQLite.

### `endpoints/`
API route definitions organized by feature:
- **auth_endpoint.py**: User registration, login, and authentication
- **health_endpoint.py**: Service health checks
- **runs_endpoint.py**: Workout run creation, retrieval, and management

### `integrations/`
Third-party service clients:
- **supabase_admin.py**: Supabase authentication and admin operations

### `middleware/`
Request/response processing:
- **auth.py**: JWT token validation and user identification
- **cors.py**: Cross-origin resource sharing configuration

### `models/`
Pydantic data models for request/response validation:
- **auth.py**: Login, registration, and token schemas
- **runs.py**: Workout run data models
- **common.py**: Shared models (pagination, responses, etc.)

### `scripts/`
Utility scripts for database operations, testing, and maintenance tasks.

### `utils/`
Reusable helper functions for common operations like time manipulation.

## Setup and Installation

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update with your configuration values

4. **Run the application**:
   ```bash
   make run
   # or
   python main.py
   ```

## Development

For development with hot reload and additional tools:

```bash
pip install -r requirements-dev.txt
make dev
```

## Docker

Build and run the application in a container:

```bash
docker build -t fit4life-backend .
docker run -p 8000:8000 fit4life-backend
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh authentication token

### Health
- `GET /health` - Health check endpoint

### Runs
- `GET /runs` - List user's runs
- `POST /runs` - Create new run
- `GET /runs/{id}` - Get run details
- `PUT /runs/{id}` - Update run
- `DELETE /runs/{id}` - Delete run
