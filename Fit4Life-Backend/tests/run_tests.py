#!/usr/bin/env python3
"""
Run all backend unit tests and display results as a formatted ASCII table.

Usage:
    python tests/run_tests.py          # from Fit4Life-Backend/
    python -m tests.run_tests          # from Fit4Life-Backend/
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# ── Result collection ────────────────────────────────────────────────────────

class _Row:
    __slots__ = ("name", "suite", "does", "expected", "actual", "status")

    def __init__(self, name: str, suite: str, does: str, expected: str) -> None:
        self.name = name
        self.suite = suite
        self.does = does
        self.expected = expected
        self.actual = ""
        self.status = "PASS"


def _parse_doc(test: unittest.TestCase) -> tuple[str, str]:
    """Return (does, expected) from the test method docstring."""
    doc = (test._testMethodDoc or "").strip()
    lines = [ln.strip() for ln in doc.splitlines() if ln.strip()]
    does = lines[0] if lines else test._testMethodName
    expected = ""
    for ln in lines[1:]:
        if ln.startswith("Expected:"):
            expected = ln[len("Expected:"):].strip()
            break
    return does, expected


class TableResult(unittest.TestResult):
    def __init__(self) -> None:
        super().__init__()
        self._rows: dict[str, _Row] = {}

    def startTest(self, test: unittest.TestCase) -> None:
        super().startTest(test)
        does, expected = _parse_doc(test)
        suite = type(test).__name__
        self._rows[test.id()] = _Row(
            name=test._testMethodName,
            suite=suite,
            does=does,
            expected=expected,
        )

    def addSuccess(self, test: unittest.TestCase) -> None:
        super().addSuccess(test)
        row = self._rows[test.id()]
        row.actual = "Completed without exception"
        row.status = "PASS"

    def addFailure(self, test: unittest.TestCase, err) -> None:
        super().addFailure(test, err)
        row = self._rows[test.id()]
        msg = str(err[1]).splitlines()[-1] if err[1] else "AssertionError"
        row.actual = msg[:90]
        row.status = "FAIL"

    def addError(self, test: unittest.TestCase, err) -> None:
        super().addError(test, err)
        row = self._rows[test.id()]
        msg = str(err[1]).splitlines()[-1] if err[1] else "Unexpected error"
        row.actual = f"ERROR: {msg[:83]}"
        row.status = "FAIL"

    def addSkip(self, test: unittest.TestCase, reason: str) -> None:
        super().addSkip(test, reason)
        row = self._rows.get(test.id())
        if row:
            row.actual = f"Skipped: {reason}"
            row.status = "SKIP"


# ── Table rendering ──────────────────────────────────────────────────────────

_COLS = [
    ("Suite",            22),
    ("Test Name",        38),
    ("What It Does",     36),
    ("Expected Outcome", 34),
    ("Actual Outcome",   34),
    ("Result",            6),
]


def _wrap(text: str, width: int) -> list[str]:
    if not text:
        return [""]
    lines: list[str] = []
    while len(text) > width:
        cut = text.rfind(" ", 0, width)
        cut = cut if cut > 0 else width
        lines.append(text[:cut])
        text = text[cut:].lstrip()
    lines.append(text)
    return lines


def _sep(char: str = "-") -> str:
    return "+" + "+".join(char * (w + 2) for _, w in _COLS) + "+"


def _print_table(rows: list[_Row]) -> None:
    headers = [h for h, _ in _COLS]
    widths  = [w for _, w in _COLS]

    print(_sep())
    print("|" + "|".join(f" {h:<{w}} " for h, w in _COLS) + "|")
    print(_sep("="))

    for row in rows:
        cells = [
            _wrap(row.suite,    widths[0]),
            _wrap(row.name,     widths[1]),
            _wrap(row.does,     widths[2]),
            _wrap(row.expected, widths[3]),
            _wrap(row.actual,   widths[4]),
            [row.status],
        ]
        height = max(len(c) for c in cells)
        for i in range(height):
            parts = []
            for j, col in enumerate(cells):
                val = col[i] if i < len(col) else ""
                parts.append(f" {val:<{widths[j]}} ")
            print("|" + "|".join(parts) + "|")
        print(_sep())


# ── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    tests_dir = Path(__file__).resolve().parent
    loader = unittest.TestLoader()
    suite = loader.discover(str(tests_dir), pattern="test_*.py")

    result = TableResult()
    suite.run(result)

    rows = list(result._rows.values())
    print()
    _print_table(rows)

    total  = len(rows)
    passed = sum(1 for r in rows if r.status == "PASS")
    failed = total - passed
    print(f"\n  {total} tests  —  {passed} passed  |  {failed} failed\n")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
