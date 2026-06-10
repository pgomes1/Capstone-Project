# SQLite Docker Container

Docker setup for the SQLite database server used by Fit4Life. This container includes database initialization and persistence configuration.

## Directory Structure

```
SQLite-Docker/
│
├── Dockerfile                  # Docker image definition
├── init.sql                    # Database initialization script
├── data/                       # Data persistence volume (mounted)
└── README.md                   # This file
```

## Components

### `Dockerfile`
Defines the Docker image that:
- Sets up SQLite environment
- Installs necessary dependencies
- Copies init.sql for database initialization
- Configures the container to run SQLite CLI

### `init.sql`
SQL script that:
- Creates database tables (users, runs, etc.)
- Sets up database schema
- Defines relationships and constraints
- Can include sample data for testing

### `data/`
Local volume directory for persistent data storage. Mounted to the container so data persists between container restarts.

---

## Prerequisites

Make sure you have Docker installed before continuing.

## Building the Image

Run the following command to build the Docker image:

```bash
docker build -t sqlite-fit4life-db .
```

This creates a Docker image named `sqlite-fit4life-db` that includes SQLite and the initialization script.

## Running the Container

### For Interactive Use (with Persistence)

Run the following command to start the container with data persistence:

```bash
docker run -it --name fit4life_db_container -v $(pwd)/data:/app sqlite-fit4life-db
```

**Parameters:**
- `-it`: Run in interactive mode and allocate a pseudo-terminal
- `--name fit4life_db_container`: Name the container for easy reference
- `-v $(pwd)/data:/app`: Mount local `data` folder to `/app` inside the container for persistence

**Note for PowerShell**: Replace `$(pwd)/data` with `${PWD}/data`

This command will drop you into the SQLite interactive CLI prompt inside the container where you can execute SQL commands directly.

### Stopping the Container

Press `Ctrl+D` to exit SQLite and stop the container, or use:

```bash
docker stop fit4life_db_container
docker rm fit4life_db_container  # Remove the container
```

## Database Operations

### Sample SQL Script for Testing

Once inside the SQLite CLI, you can test with the following commands:

```sql
-- 1. Insert a test user
INSERT INTO users (username, email) VALUES ('johndoe', 'john@example.com');

-- 2. Log two separate runs for John Doe (User ID: 1) for today
INSERT INTO runs (user_id, distance_mi, duration_minutes) VALUES (1, 3.5, 28.5);
INSERT INTO runs (user_id, distance_mi, duration_minutes) VALUES (1, 3.0, 21.2);

-- 3. Query total runs, total distance, and total time for the user today
SELECT 
    u.username,
    r.run_date,
    COUNT(r.run_id) AS total_runs_today,
    SUM(r.distance_mi) AS total_distance_mi,
    SUM(r.duration_minutes) AS total_time_minutes
FROM users u
JOIN runs r ON u.user_id = r.user_id
WHERE r.run_date = DATE('now')
GROUP BY u.user_id, r.run_date;
```

### Viewing Existing Data

List all tables:

```sql
.tables
```

View schema for a table:

```sql
.schema users
.schema runs
```

Query data:

```sql
SELECT * FROM users;
SELECT * FROM runs;
```

## Data Persistence

- The `data/` directory is mapped to `/app` inside the container
- All data created in SQLite is stored in the mounted `data/` folder on your host machine
- Data persists even after the container stops or is removed
- You can safely delete and recreate the container; your data remains in the `data/` folder

## Container Management

### View Running Containers

```bash
docker ps
```

### View All Containers

```bash
docker ps -a
```

### Restart a Stopped Container

```bash
docker start -i fit4life_db_container
```

### Remove a Container

```bash
docker rm fit4life_db_container
```

## Troubleshooting

- **Container won't start**: Ensure no other container is using the same name or port
- **Data not persisting**: Verify the `data/` folder exists and has proper permissions
- **Permission errors**: On Linux, you may need to adjust folder permissions with `chmod`

## Integration with Fit4Life

This SQLite container is used by:
- **Fit4Life-Backend**: Connects to the SQLite database for user and workout data
- See [Fit4Life-Backend/README.md](../Fit4Life-Backend/README.md) for backend database configuration

