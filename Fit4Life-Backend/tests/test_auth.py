"""Auth script tests — signup and signin against a temporary SQLite database."""

import os
import sqlite3
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.helpers import create_test_db, make_connector
from scripts import auth_script

_TEST_SECRET = "test-jwt-secret-for-unit-tests"


class _MockSettings:
    JWT_TTL_HOURS = 1


class TestSignup(unittest.TestCase):

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)

    def tearDown(self):
        try:
            os.unlink(self.db)
        except OSError:
            pass

    def _signup(self, email="alice@example.com", password="password1", name="Alice"):
        with patch("scripts.auth_script.get_db_connection", self.connect):
            return auth_script.signup(email, password, name)

    def test_signup_returns_user_data(self):
        """Sign up with valid email, password, and name.
        Expected: SignupData returned with a non-empty id and matching email and name."""
        result = self._signup()
        self.assertTrue(result.user.id)
        self.assertEqual(result.user.email, "alice@example.com")
        self.assertEqual(result.user.name, "Alice")

    def test_signup_id_is_numeric_string(self):
        """Sign up and inspect the returned user id.
        Expected: id is a string representation of a positive integer."""
        result = self._signup()
        self.assertTrue(result.user.id.isdigit())
        self.assertGreater(int(result.user.id), 0)

    def test_signup_duplicate_email_raises_409(self):
        """Sign up twice with the same email address.
        Expected: HTTPException with status_code=409 on the second call."""
        self._signup()
        with self.assertRaises(HTTPException) as ctx:
            self._signup(name="Alice2")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_signup_password_is_not_stored_as_plaintext(self):
        """Sign up and read the password_hash column directly from the database.
        Expected: stored value is not the plaintext password and is at least 30 chars."""
        self._signup(password="plaintext_pw")
        conn = sqlite3.connect(self.db)
        row = conn.execute(
            "SELECT password_hash FROM users WHERE email = ?", ("alice@example.com",)
        ).fetchone()
        conn.close()
        self.assertNotEqual(row[0], "plaintext_pw")
        self.assertGreater(len(row[0]), 30)

    def test_signup_name_stored_as_username(self):
        """Sign up with name='Bob' and read the username column from the database.
        Expected: username column equals 'Bob'."""
        self._signup(email="bob@example.com", name="Bob")
        conn = sqlite3.connect(self.db)
        row = conn.execute(
            "SELECT username FROM users WHERE email = ?", ("bob@example.com",)
        ).fetchone()
        conn.close()
        self.assertEqual(row[0], "Bob")


class TestSignin(unittest.TestCase):

    def setUp(self):
        self.db = create_test_db()
        self.connect = make_connector(self.db)
        self._settings = _MockSettings()
        with patch("scripts.auth_script.get_db_connection", self.connect):
            auth_script.signup("bob@example.com", "correct_pw", "Bob")

    def tearDown(self):
        try:
            os.unlink(self.db)
        except OSError:
            pass

    def _signin(self, email="bob@example.com", password="correct_pw"):
        with (
            patch("scripts.auth_script.get_db_connection", self.connect),
            patch("scripts.auth_script.get_jwt_secret", return_value=_TEST_SECRET),
            patch("scripts.auth_script.get_settings", return_value=self._settings),
        ):
            return auth_script.signin(email, password)

    def test_signin_returns_token_and_user(self):
        """Sign in with the correct email and password.
        Expected: SigninData with a non-empty token and matching user email."""
        result = self._signin()
        self.assertTrue(result.token)
        self.assertEqual(result.user.email, "bob@example.com")
        self.assertEqual(result.user.name, "Bob")

    def test_signin_wrong_email_raises_401(self):
        """Sign in with an email address that was never registered.
        Expected: HTTPException with status_code=401."""
        with self.assertRaises(HTTPException) as ctx:
            self._signin(email="nobody@example.com")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_signin_wrong_password_raises_401(self):
        """Sign in with the correct email but an incorrect password.
        Expected: HTTPException with status_code=401."""
        with self.assertRaises(HTTPException) as ctx:
            self._signin(password="wrong_pw")
        self.assertEqual(ctx.exception.status_code, 401)

    def test_signin_token_subject_matches_user_id(self):
        """Sign in and decode the returned JWT without verifying the signature.
        Expected: 'sub' claim in the payload equals the returned user id."""
        import jwt
        result = self._signin()
        payload = jwt.decode(result.token, _TEST_SECRET, algorithms=["HS256"])
        self.assertEqual(payload["sub"], result.user.id)

    def test_signin_token_contains_email(self):
        """Sign in and decode the returned JWT.
        Expected: 'email' claim in the payload matches the signed-in email."""
        import jwt
        result = self._signin()
        payload = jwt.decode(result.token, _TEST_SECRET, algorithms=["HS256"])
        self.assertEqual(payload["email"], "bob@example.com")
