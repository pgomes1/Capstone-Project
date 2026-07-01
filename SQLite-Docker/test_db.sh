#!/usr/bin/env bash
# SQLite CRUD test script for Fit4Life.
# Creates a fresh in-memory-style temp DB, runs SQL operations,
# checks outcomes, and prints a formatted results table.
#
# Usage (from repo root):
#   bash SQLite-Docker/test_db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="$SCRIPT_DIR/init.sql"
DB=$(mktemp /tmp/fit4life_test_XXXXXX.db)
trap 'rm -f "$DB"' EXIT

sqlite3 "$DB" < "$SCHEMA"

# ── Result tracking ──────────────────────────────────────────────────────────

declare -a T_NAME=()
declare -a T_DOES=()
declare -a T_EXPECTED=()
declare -a T_ACTUAL=()
declare -a T_STATUS=()
PASS=0
FAIL=0

record() {
  local name="$1" does="$2" expected="$3" actual="$4" status="$5"
  T_NAME+=("$name")
  T_DOES+=("$does")
  T_EXPECTED+=("$expected")
  T_ACTUAL+=("$actual")
  T_STATUS+=("$status")
  if [[ "$status" == "PASS" ]]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); fi
}

check() {
  local name="$1" does="$2" expected="$3" query="$4" want="$5"
  local actual
  actual=$(sqlite3 "$DB" "$query" 2>&1 || true)
  if [[ "$actual" == *"$want"* ]]; then
    record "$name" "$does" "$expected" "$actual" "PASS"
  else
    record "$name" "$does" "$expected" "Got: $actual" "FAIL"
  fi
}

check_empty() {
  local name="$1" does="$2" expected="$3" query="$4"
  local actual
  actual=$(sqlite3 "$DB" "$query" 2>&1 || true)
  if [[ -z "$actual" ]]; then
    record "$name" "$does" "$expected" "(empty)" "PASS"
  else
    record "$name" "$does" "$expected" "Got: $actual" "FAIL"
  fi
}

check_error() {
  local name="$1" does="$2" expected="$3" sql="$4" want="$5"
  local actual
  actual=$(sqlite3 "$DB" "$sql" 2>&1) || true
  if echo "$actual" | grep -qi "$want"; then
    record "$name" "$does" "$expected" "$actual" "PASS"
  else
    record "$name" "$does" "$expected" "Got: $actual" "FAIL"
  fi
}

# ── Tests ────────────────────────────────────────────────────────────────────

# 1. Insert a user
sqlite3 "$DB" "INSERT INTO users (username, email, password_hash) VALUES ('alice', 'alice@example.com', 'hash1');"
check \
  "user_insert" \
  "Insert a user row into the users table" \
  "Row exists with correct email" \
  "SELECT email FROM users WHERE username='alice';" \
  "alice@example.com"

# 2. Unique email constraint
check_error \
  "user_unique_email" \
  "Insert a second user with an email that already exists" \
  "UNIQUE constraint error raised" \
  "INSERT INTO users (username, email, password_hash) VALUES ('alice2', 'alice@example.com', 'hash2');" \
  "UNIQUE constraint failed"

# 3. Unique username constraint
check_error \
  "user_unique_username" \
  "Insert a second user with a username that already exists" \
  "UNIQUE constraint error raised" \
  "INSERT INTO users (username, email, password_hash) VALUES ('alice', 'other@example.com', 'hash3');" \
  "UNIQUE constraint failed"

# 4. Insert a run
USER_ID=$(sqlite3 "$DB" "SELECT user_id FROM users WHERE email='alice@example.com';")
sqlite3 "$DB" "INSERT INTO runs (user_id, run_date, distance_mi, duration_minutes) VALUES ($USER_ID, '2024-03-01', 3.1, 30.0);"
check \
  "run_insert" \
  "Insert a run row linked to an existing user" \
  "Row exists with distance_mi=3.1" \
  "SELECT distance_mi FROM runs WHERE user_id=$USER_ID AND run_date='2024-03-01';" \
  "3.1"

# 5. Select runs filtered by user_id
sqlite3 "$DB" "INSERT INTO users (username, email, password_hash) VALUES ('bob', 'bob@example.com', 'hash4');"
BOB_ID=$(sqlite3 "$DB" "SELECT user_id FROM users WHERE email='bob@example.com';")
sqlite3 "$DB" "INSERT INTO runs (user_id, run_date, distance_mi, duration_minutes) VALUES ($BOB_ID, '2024-03-02', 6.0, 60.0);"
check \
  "run_select_by_user" \
  "Select runs WHERE user_id = alice's id (Bob also has a run)" \
  "Only alice's run returned (distance 3.1)" \
  "SELECT distance_mi FROM runs WHERE user_id=$USER_ID;" \
  "3.1"

# 6. Run date ordering (DESC)
sqlite3 "$DB" "INSERT INTO runs (user_id, run_date, distance_mi, duration_minutes) VALUES ($USER_ID, '2024-01-01', 1.0, 10.0);"
check \
  "run_order_desc" \
  "Select alice's runs ordered by run_date DESC" \
  "Most recent date (2024-03-01) appears first" \
  "SELECT run_date FROM runs WHERE user_id=$USER_ID ORDER BY run_date DESC LIMIT 1;" \
  "2024-03-01"

# 7. Update a run's distance
RUN_ID=$(sqlite3 "$DB" "SELECT run_id FROM runs WHERE user_id=$USER_ID AND run_date='2024-03-01';")
sqlite3 "$DB" "UPDATE runs SET distance_mi=5.5 WHERE run_id=$RUN_ID;"
check \
  "run_update" \
  "Update distance_mi for a specific run row" \
  "distance_mi changed to 5.5" \
  "SELECT distance_mi FROM runs WHERE run_id=$RUN_ID;" \
  "5.5"

# 8. Delete a run
sqlite3 "$DB" "DELETE FROM runs WHERE run_id=$RUN_ID;"
check_empty \
  "run_delete" \
  "Delete a run row by run_id" \
  "No row returned for that run_id" \
  "SELECT run_id FROM runs WHERE run_id=$RUN_ID;"

# 9. Foreign key: run referencing non-existent user_id
sqlite3 "$DB" "PRAGMA foreign_keys = ON;"
check_error \
  "run_fk_invalid_user" \
  "Insert a run with a user_id that does not exist in users" \
  "FOREIGN KEY constraint error raised" \
  "PRAGMA foreign_keys = ON; INSERT INTO runs (user_id, run_date, distance_mi, duration_minutes) VALUES (99999, '2024-03-01', 3.0, 30.0);" \
  "FOREIGN KEY constraint failed"

# 10. Cascade delete: deleting a user removes their runs
RUNS_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM runs WHERE user_id=$USER_ID;")
sqlite3 "$DB" "PRAGMA foreign_keys = ON; DELETE FROM users WHERE user_id=$USER_ID;"
RUNS_AFTER=$(sqlite3 "$DB" "SELECT COUNT(*) FROM runs WHERE user_id=$USER_ID;")
if [[ "$RUNS_AFTER" == "0" ]] && [[ "$RUNS_BEFORE" != "0" ]]; then
  record "cascade_delete" \
    "Delete a user row; their runs should cascade-delete" \
    "Run count for that user drops to 0" \
    "Before: $RUNS_BEFORE run(s) → After: $RUNS_AFTER" \
    "PASS"
else
  record "cascade_delete" \
    "Delete a user row; their runs should cascade-delete" \
    "Run count for that user drops to 0" \
    "Before: $RUNS_BEFORE → After: $RUNS_AFTER (not 0)" \
    "FAIL"
fi

# 11. Verify idx_runs_user_date index exists
check \
  "index_exists" \
  "Query sqlite_master for the idx_runs_user_date index" \
  "Index name returned" \
  "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_runs_user_date';" \
  "idx_runs_user_date"

# ── Table output ─────────────────────────────────────────────────────────────

C1=24; C2=42; C3=34; C4=34; C5=6
SEP="+$(printf '%.0s-' $(seq 1 $((C1+2))))+$(printf '%.0s-' $(seq 1 $((C2+2))))+$(printf '%.0s-' $(seq 1 $((C3+2))))+$(printf '%.0s-' $(seq 1 $((C4+2))))+$(printf '%.0s-' $(seq 1 $((C5+2))))+"

trunc() { local s="$1" n="$2"; echo "${s:0:$n}"; }

print_row() {
  printf "| %-${C1}s | %-${C2}s | %-${C3}s | %-${C4}s | %-${C5}s |\n" \
    "$(trunc "$1" $C1)" "$(trunc "$2" $C2)" "$(trunc "$3" $C3)" "$(trunc "$4" $C4)" "$(trunc "$5" $C5)"
}

echo ""
echo "$SEP"
print_row "Test Name" "What It Does" "Expected Outcome" "Actual Outcome" "Result"
echo "${SEP//-/=}"

for i in "${!T_NAME[@]}"; do
  print_row "${T_NAME[$i]}" "${T_DOES[$i]}" "${T_EXPECTED[$i]}" "${T_ACTUAL[$i]}" "${T_STATUS[$i]}"
  echo "$SEP"
done

echo ""
echo "  $((PASS+FAIL)) tests  —  $PASS passed  |  $FAIL failed"
echo ""
test "$FAIL" -eq 0
