# This is the Fit4Life DB initialiser.

## Make sure you have docker Installed before continuing.

### For building the image:
Run the following:
`docker build -t sqlite-fit4life-db .`
### For running the container with persistence:
Run the following:
`docker run -it --name fitness_db_container -v $(pwd)/data:/app sqlite-fitness-db`
This will start the container, and mount local folder named data on your machine to the /app folder inside the container.

## Additional things of note:
Replace `$(pwd)/data` with `${PWD}/data` in the container run command if you are on PowerShell.
Because you used the `-it` flag and the default command is `sqlite3`, you will immediately be dropped into the SQLite interactive CLI prompt inside the container.

### Sample SQL script to test things:
```
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
