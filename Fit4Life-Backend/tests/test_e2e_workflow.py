"""End-to-end workflow tests — real HTTP requests through the full FastAPI
app (routers, middleware, JWT verification, exception handlers), backed by a
temporary SQLite database. Unlike tests/test_auth.py and tests/test_runs.py,
which call scripts.* functions directly, these drive whole user journeys
through main.app via TestClient."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from tests.helpers import create_test_db, make_connector
from main import app

_TEST_SECRET = "test-jwt-secret-for-e2e-tests"


class _MockSettings:
    JWT_TTL_HOURS = 1


class _E2ETestCase(unittest.TestCase):
    """Base class wiring the FastAPI app to a temp DB and fixed JWT secret."""

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)
        self._settings = _MockSettings()
        self._patches = [
            patch("scripts.auth_script.get_db_connection", self.connect),
            patch("scripts.runs_script.get_db_connection", self.connect),
            patch("scripts.auth_script.get_jwt_secret", return_value=_TEST_SECRET),
            patch("middleware.auth.get_jwt_secret", return_value=_TEST_SECRET),
            patch("scripts.auth_script.get_settings", return_value=self._settings),
        ]
        for p in self._patches:
            p.start()
        self.client = TestClient(app)

    def tearDown(self):
        for p in self._patches:
            p.stop()
        try:
            os.unlink(self.db)
        except OSError:
            pass

    def _signup(self, email="alice@example.com", password="password1", name="Alice"):
        return self.client.post(
            "/api/auth/signup",
            json={"email": email, "password": password, "name": name},
        )

    def _signin(self, email="alice@example.com", password="password1"):
        return self.client.post(
            "/api/auth/signin", json={"email": email, "password": password}
        )

    def _token(self, email="alice@example.com", password="password1"):
        name = email.split("@", 1)[0].title()
        self._signup(email=email, password=password, name=name)
        return self._signin(email=email, password=password).json()["data"]["token"]

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}


class TestSignupSigninRunsWorkflow(_E2ETestCase):

    def test_full_workflow_signup_signin_add_list_delete(self):
        """Sign up, sign in, and CRUD a run entirely over HTTP.
        Expected: every step succeeds and the final run list reflects the delete."""
        signup_res = self._signup()
        self.assertEqual(signup_res.status_code, 200)
        self.assertTrue(signup_res.json()["ok"])

        signin_res = self._signin()
        self.assertEqual(signin_res.status_code, 200)
        token = signin_res.json()["data"]["token"]
        self.assertTrue(token)

        empty_res = self.client.get("/api/runs", headers=self._auth(token))
        self.assertEqual(empty_res.status_code, 200)
        self.assertEqual(empty_res.json()["data"]["runs"], [])

        add_res = self.client.post(
            "/api/runs",
            headers=self._auth(token),
            json={
                "sessions": [
                    {"date": "2024-03-01", "distanceMiles": 3.1, "durationMinutes": 30},
                    {"date": "2024-01-15", "distanceMiles": 5.0, "durationMinutes": 50},
                ]
            },
        )
        self.assertEqual(add_res.status_code, 200)
        added = add_res.json()["data"]["runs"]
        self.assertEqual(len(added), 2)

        list_res = self.client.get("/api/runs", headers=self._auth(token))
        runs = list_res.json()["data"]["runs"]
        self.assertEqual(len(runs), 2)
        self.assertEqual(runs[0]["date"], "2024-03-01")  # newest first

        run_id = runs[0]["id"]
        del_res = self.client.delete(f"/api/runs/{run_id}", headers=self._auth(token))
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()["data"]["deleted"])

        final_res = self.client.get("/api/runs", headers=self._auth(token))
        remaining = final_res.json()["data"]["runs"]
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["date"], "2024-01-15")

    def test_runs_endpoints_reject_missing_token(self):
        """Call GET/POST/DELETE /api/runs with no Authorization header.
        Expected: all three return 401."""
        self.assertEqual(self.client.get("/api/runs").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/runs",
                json={"sessions": [{"date": "2024-01-01", "distanceMiles": 1, "durationMinutes": 1}]},
            ).status_code,
            401,
        )
        self.assertEqual(self.client.delete("/api/runs/1").status_code, 401)

    def test_runs_endpoint_rejects_malformed_token(self):
        """Call GET /api/runs with a garbage bearer token.
        Expected: 401 with an AUTH_ERROR envelope."""
        res = self.client.get("/api/runs", headers=self._auth("not-a-real-jwt"))
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json()["error"]["code"], "AUTH_ERROR")

    def test_wrong_password_blocks_signin_over_http(self):
        """Sign up, then sign in with the wrong password.
        Expected: 401 and no usable token is issued."""
        self._signup()
        res = self._signin(password="wrong_password")
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json()["ok"])

    def test_duplicate_signup_rejected_over_http(self):
        """Sign up twice with the same email address via HTTP.
        Expected: second request returns 409 SIGNUP_FAILED."""
        self._signup()
        res = self._signup(name="Alice2")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["error"]["code"], "SIGNUP_FAILED")

    def test_second_user_cannot_see_or_delete_first_users_runs(self):
        """Two users sign up independently; user A logs a run.
        Expected: user B's list is empty, and deleting A's run as B returns 404."""
        token_a = self._token(email="alice@example.com")
        token_b = self._token(email="bob@example.com")

        add_res = self.client.post(
            "/api/runs",
            headers=self._auth(token_a),
            json={"sessions": [{"date": "2024-05-01", "distanceMiles": 4.0, "durationMinutes": 40}]},
        )
        run_id = add_res.json()["data"]["runs"][0]["id"]

        b_list = self.client.get("/api/runs", headers=self._auth(token_b))
        self.assertEqual(b_list.json()["data"]["runs"], [])

        b_delete = self.client.delete(f"/api/runs/{run_id}", headers=self._auth(token_b))
        self.assertEqual(b_delete.status_code, 404)

        a_list = self.client.get("/api/runs", headers=self._auth(token_a))
        self.assertEqual(len(a_list.json()["data"]["runs"]), 1)


if __name__ == "__main__":
    unittest.main()
