"""Pydantic model validation tests — no database or network required."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import unittest
from pydantic import ValidationError

from models.runs import RunIn, RunsBatchCreate
from models.auth import SignupRequest, SigninRequest


class TestRunIn(unittest.TestCase):

    def test_valid_run_passes(self):
        """Construct RunIn with valid date, distance, and duration.
        Expected: object created with matching attribute values."""
        r = RunIn(date="2024-03-01", distanceMiles=3.1, durationMinutes=30.0)
        self.assertEqual(r.date, "2024-03-01")
        self.assertAlmostEqual(r.distanceMiles, 3.1)
        self.assertAlmostEqual(r.durationMinutes, 30.0)

    def test_zero_distance_rejected(self):
        """Construct RunIn with distanceMiles=0, violating the gt=0 constraint.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunIn(date="2024-03-01", distanceMiles=0, durationMinutes=30.0)

    def test_negative_distance_rejected(self):
        """Construct RunIn with a negative distanceMiles value.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunIn(date="2024-03-01", distanceMiles=-1.0, durationMinutes=30.0)

    def test_zero_duration_rejected(self):
        """Construct RunIn with durationMinutes=0, violating the gt=0 constraint.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunIn(date="2024-03-01", distanceMiles=3.1, durationMinutes=0)

    def test_negative_duration_rejected(self):
        """Construct RunIn with a negative durationMinutes value.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunIn(date="2024-03-01", distanceMiles=3.1, durationMinutes=-5.0)

    def test_extra_field_rejected(self):
        """Construct RunIn with an unrecognised field (model uses extra='forbid').
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunIn(date="2024-03-01", distanceMiles=3.1, durationMinutes=30.0, pace=8.0)

    def test_missing_all_fields_rejected(self):
        """Construct RunIn with no arguments at all.
        Expected: ValidationError raised for all required fields."""
        with self.assertRaises(ValidationError):
            RunIn()


class TestRunsBatchCreate(unittest.TestCase):

    def test_valid_single_session(self):
        """Construct RunsBatchCreate with one valid RunIn dict.
        Expected: object created; sessions list has length 1."""
        b = RunsBatchCreate(sessions=[
            {"date": "2024-03-01", "distanceMiles": 3.1, "durationMinutes": 30.0}
        ])
        self.assertEqual(len(b.sessions), 1)

    def test_valid_multiple_sessions(self):
        """Construct RunsBatchCreate with three valid RunIn dicts.
        Expected: sessions list has length 3."""
        b = RunsBatchCreate(sessions=[
            {"date": "2024-03-01", "distanceMiles": 3.1, "durationMinutes": 30.0},
            {"date": "2024-03-02", "distanceMiles": 5.0, "durationMinutes": 50.0},
            {"date": "2024-03-03", "distanceMiles": 2.0, "durationMinutes": 20.0},
        ])
        self.assertEqual(len(b.sessions), 3)

    def test_empty_sessions_rejected(self):
        """Construct RunsBatchCreate with an empty list (min_length=1 on sessions).
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunsBatchCreate(sessions=[])

    def test_invalid_session_inside_batch_rejected(self):
        """Construct RunsBatchCreate where one session has distanceMiles=0.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            RunsBatchCreate(sessions=[
                {"date": "2024-03-01", "distanceMiles": 0, "durationMinutes": 30.0}
            ])


class TestSignupRequest(unittest.TestCase):

    def test_valid_signup_request(self):
        """Construct SignupRequest with valid email, password, and name.
        Expected: object created with matching attribute values."""
        r = SignupRequest(email="alice@example.com", password="secret1", name="Alice")
        self.assertEqual(r.email, "alice@example.com")
        self.assertEqual(r.name, "Alice")

    def test_email_too_short_rejected(self):
        """Construct SignupRequest with a 2-character email (min_length=3).
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SignupRequest(email="a@", password="secret1", name="Alice")

    def test_password_too_short_rejected(self):
        """Construct SignupRequest with a 5-character password (min_length=6).
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SignupRequest(email="alice@example.com", password="short", name="Alice")

    def test_empty_name_rejected(self):
        """Construct SignupRequest with an empty name string (min_length=1).
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SignupRequest(email="alice@example.com", password="secret1", name="")

    def test_extra_field_rejected(self):
        """Construct SignupRequest with an unknown field (extra='forbid').
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SignupRequest(
                email="alice@example.com", password="secret1", name="Alice", role="admin"
            )


class TestSigninRequest(unittest.TestCase):

    def test_valid_signin_request(self):
        """Construct SigninRequest with a valid email and a single-character password.
        Expected: object created successfully."""
        r = SigninRequest(email="alice@example.com", password="x")
        self.assertEqual(r.email, "alice@example.com")

    def test_missing_email_rejected(self):
        """Construct SigninRequest without providing the email field.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SigninRequest(password="secret1")

    def test_missing_password_rejected(self):
        """Construct SigninRequest without providing the password field.
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SigninRequest(email="alice@example.com")

    def test_extra_field_rejected(self):
        """Construct SigninRequest with an unknown field (extra='forbid').
        Expected: ValidationError raised."""
        with self.assertRaises(ValidationError):
            SigninRequest(email="alice@example.com", password="secret1", token="abc")
