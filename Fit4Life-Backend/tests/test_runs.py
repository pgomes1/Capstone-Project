"""Runs script tests — CRUD operations against a temporary SQLite database."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.helpers import create_test_db, make_connector, insert_user
from middleware.auth import AuthedUser
from models.runs import RunIn
from scripts import runs_script

_RUN_A = RunIn(date="2024-03-01", distanceMiles=3.1, durationMinutes=30.0)
_RUN_B = RunIn(date="2024-01-15", distanceMiles=5.0, durationMinutes=50.0)
_RUN_C = RunIn(date="2024-06-10", distanceMiles=2.0, durationMinutes=20.0)


class TestListRuns(unittest.TestCase):

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)
        uid = insert_user(self.db, "runner@example.com")
        self.authed = AuthedUser(sub=str(uid), email="runner@example.com")

    def tearDown(self):
        os.unlink(self.db)

    def _list(self, authed=None):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.list_runs(authed or self.authed)

    def _add(self, runs, authed=None):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.add_runs(authed or self.authed, runs)

    def test_list_runs_empty_for_new_user(self):
        """List runs for a user who has no runs logged yet.
        Expected: empty list returned."""
        self.assertEqual(self._list(), [])

    def test_list_runs_returns_after_add(self):
        """Add one run then immediately list runs for the same user.
        Expected: list of length 1 returned."""
        self._add([_RUN_A])
        self.assertEqual(len(self._list()), 1)

    def test_list_runs_only_returns_own_runs(self):
        """Add a run for user A; list runs as user B (different account).
        Expected: user B receives an empty list."""
        uid_b = insert_user(self.db, "other@example.com", name="Other")
        authed_b = AuthedUser(sub=str(uid_b), email="other@example.com")
        self._add([_RUN_A])
        self.assertEqual(self._list(authed_b), [])

    def test_list_runs_ordered_newest_date_first(self):
        """Add runs on three different dates in non-chronological order.
        Expected: list is sorted by run_date descending (newest first)."""
        self._add([_RUN_A, _RUN_B, _RUN_C])
        result = self._list()
        dates = [r.date for r in result]
        self.assertEqual(dates, sorted(dates, reverse=True))


class TestAddRuns(unittest.TestCase):

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)
        uid = insert_user(self.db, "runner@example.com")
        self.authed = AuthedUser(sub=str(uid), email="runner@example.com")

    def tearDown(self):
        os.unlink(self.db)

    def _add(self, runs):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.add_runs(self.authed, runs)

    def test_add_single_run_returns_one_runout(self):
        """Add a single run session with valid date, distance, and duration.
        Expected: list of length 1 with field values matching the input."""
        result = self._add([_RUN_A])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].date, "2024-03-01")
        self.assertAlmostEqual(result[0].distanceMiles, 3.1)
        self.assertAlmostEqual(result[0].durationMinutes, 30.0)

    def test_add_run_sets_user_id(self):
        """Add a run and check the userId field on the returned RunOut.
        Expected: userId matches the authenticated user's id."""
        result = self._add([_RUN_A])
        self.assertEqual(result[0].userId, self.authed.sub)

    def test_add_run_returns_non_empty_id(self):
        """Add a run and inspect the id field on the returned RunOut.
        Expected: id is a non-empty string representing a positive integer."""
        result = self._add([_RUN_A])
        self.assertTrue(result[0].id)
        self.assertGreater(int(result[0].id), 0)

    def test_add_batch_returns_all_sessions(self):
        """Add three run sessions in a single batch call.
        Expected: list of length 3 returned, one RunOut per session."""
        result = self._add([_RUN_A, _RUN_B, _RUN_C])
        self.assertEqual(len(result), 3)

    def test_add_run_created_at_is_populated(self):
        """Add a run and inspect the createdAt field on the returned RunOut.
        Expected: createdAt is a non-empty string."""
        result = self._add([_RUN_A])
        self.assertTrue(result[0].createdAt)


class TestDeleteRun(unittest.TestCase):

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)
        uid = insert_user(self.db, "runner@example.com")
        self.authed = AuthedUser(sub=str(uid), email="runner@example.com")

    def tearDown(self):
        os.unlink(self.db)

    def _add(self, runs, authed=None):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.add_runs(authed or self.authed, runs)

    def _delete(self, run_id, authed=None):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.delete_run(authed or self.authed, run_id)

    def _list(self, authed=None):
        with patch("scripts.runs_script.get_db_connection", self.connect):
            return runs_script.list_runs(authed or self.authed)

    def test_delete_run_removes_from_list(self):
        """Add a run, delete it by the returned id, then list runs.
        Expected: the subsequent list is empty."""
        added = self._add([_RUN_A])
        self._delete(added[0].id)
        self.assertEqual(self._list(), [])

    def test_delete_nonexistent_run_raises_404(self):
        """Delete a run_id (99999) that does not exist in the database.
        Expected: HTTPException with status_code=404."""
        with self.assertRaises(HTTPException) as ctx:
            self._delete("99999")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_delete_non_integer_id_raises_404(self):
        """Delete with a non-integer run_id string such as 'abc'.
        Expected: HTTPException with status_code=404."""
        with self.assertRaises(HTTPException) as ctx:
            self._delete("abc")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_delete_other_users_run_raises_404(self):
        """Add a run as user A; attempt to delete it as user B.
        Expected: HTTPException with status_code=404 (ownership enforced)."""
        uid_b = insert_user(self.db, "other@example.com", name="Other")
        authed_b = AuthedUser(sub=str(uid_b), email="other@example.com")
        added = self._add([_RUN_A])
        with self.assertRaises(HTTPException) as ctx:
            self._delete(added[0].id, authed=authed_b)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_delete_only_removes_targeted_run(self):
        """Add two runs, delete the first, then list remaining runs.
        Expected: exactly one run remains and it is the second one."""
        added = self._add([_RUN_A, _RUN_B])
        first_id = next(r.id for r in added if r.date == "2024-03-01")
        self._delete(first_id)
        remaining = self._list()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0].date, "2024-01-15")
