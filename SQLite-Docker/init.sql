-- User table creation.
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Runs table creation.
CREATE TABLE IF NOT EXISTS runs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  run_date DATE NOT NULL DEFAULT (DATE('now')),
  distance_mi REAL NOT NULL,
  duration_minutes REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runs_user_date ON runs(user_id, run_date);
