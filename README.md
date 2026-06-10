# Capstone-Project

The fitness tracker capstone project of Group Echo.

## Project Overview

This repository contains three main components:
- **Fit4Life-Backend**: RESTful API backend built with Python
- **Fit4Life-UI**: React/TypeScript frontend user interface
- **SQLite-Docker**: Docker setup for the SQLite database server

---

## Directory Structure

### 📂 [Fit4Life-Backend](Fit4Life-Backend)
The backend API server handling all business logic, authentication, and data persistence.

```
Fit4Life-Backend/
├── config/                 # Application configuration
├── db/                     # Database connection and schema
├── endpoints/              # API route handlers
├── integrations/           # Third-party integrations (Supabase)
├── lib/                    # Shared utilities and error handling
├── middleware/             # CORS, authentication middleware
├── models/                 # Data models and schemas
├── scripts/                # Database and utility scripts
├── utils/                  # Helper utilities
├── main.py                 # Application entry point
├── Dockerfile              # Container configuration
├── Makefile                # Build and run commands
└── requirements.txt        # Python dependencies
```

**See [Fit4Life-Backend/README.md](Fit4Life-Backend/README.md) for detailed documentation.**

---

### 📂 [Fit4Life-UI](Fit4Life-UI)
The frontend user interface built with React, TypeScript, and Vite.

```
Fit4Life-UI/
├── src/
│   ├── app/
│   │   ├── components/     # React components (pages and UI)
│   │   ├── utils/          # Application utilities
│   │   └── App.tsx         # Main app component
│   ├── styles/             # Global CSS and theming
│   └── test/               # Unit and integration tests
├── supabase/               # Supabase client configuration
├── utils/                  # Shared utility functions
├── vite.config.ts          # Vite build configuration
├── package.json            # Node.js dependencies
└── index.html              # Entry HTML file
```

**See [Fit4Life-UI/README.md](Fit4Life-UI/README.md) for detailed documentation.**

---

### 📂 [SQLite-Docker](SQLite-Docker)
Docker configuration for the SQLite database server.

```
SQLite-Docker/
├── Dockerfile              # Container image definition
├── init.sql                # Database initialization script
├── data/                   # Data persistence volume
└── README.md               # Docker setup instructions
```

**See [SQLite-Docker/README.md](SQLite-Docker/README.md) for detailed documentation.**

---

## Getting Started

1. **Backend Setup**: See [Fit4Life-Backend/README.md](Fit4Life-Backend/README.md)
2. **Frontend Setup**: See [Fit4Life-UI/README.md](Fit4Life-UI/README.md)
3. **Database Setup**: See [SQLite-Docker/README.md](SQLite-Docker/README.md)
