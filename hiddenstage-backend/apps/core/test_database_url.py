"""DATABASE_URL handling in config.settings.

The settings module is imported in a subprocess so each case sees a fresh
environment (settings resolve the database at import time).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

BASE_DIR = Path(__file__).resolve().parents[2]

PROBE = """
import json, os, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
if os.environ.get("PROBE_AS_TEST_RUN"):
    sys.argv = ["manage.py", "test"]
try:
    import django
    from django.conf import settings
    db = settings.DATABASES["default"]
    print(json.dumps({
        "ok": True,
        "name": db.get("NAME"),
        "user": db.get("USER"),
        "host": db.get("HOST"),
        "port": db.get("PORT"),
        "sslmode": db.get("OPTIONS", {}).get("sslmode"),
    }))
except Exception as exc:  # noqa: BLE001 - surfaced to the assertion
    print(json.dumps({"ok": False, "error": type(exc).__name__, "message": str(exc)}))
"""


def run_settings(database_url: str | None, extra_env: dict[str, str] | None = None) -> dict:
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "config.settings",
        "DJANGO_DEBUG": "0",
        "DJANGO_SECRET_KEY": "test-only-key-for-settings-probe-0123456789",
        "DJANGO_ALLOWED_HOSTS": "example.test",
    }
    # A dotenv file (e.g. .env.neon) would override the values each case sets,
    # so the probe runs without it and sees only the environment it was given.
    env.pop("DJANGO_ENV_FILE", None)
    # The surrounding suite may set this; each case opts in explicitly instead.
    env.pop("ALLOW_REMOTE_TEST_DB", None)
    if database_url is None:
        env.pop("DATABASE_URL", None)
    else:
        env["DATABASE_URL"] = database_url
    env.update(extra_env or {})
    completed = subprocess.run(
        [sys.executable, "-c", PROBE],
        cwd=BASE_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    payload = completed.stdout.strip().splitlines()[-1] if completed.stdout.strip() else "{}"
    return json.loads(payload)


class DatabaseUrlTests(SimpleTestCase):
    def test_managed_url_overrides_discrete_postgres_variables(self):
        result = run_settings(
            "postgresql://neon_user:p%40ss@ep-example-123.us-east-2.aws.neon.tech:5432/neondb"
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["name"], "neondb")
        self.assertEqual(result["user"], "neon_user")
        self.assertEqual(result["host"], "ep-example-123.us-east-2.aws.neon.tech")
        self.assertEqual(result["port"], "5432")
        # Managed hosts refuse plaintext connections, so TLS is mandatory.
        self.assertEqual(result["sslmode"], "require")

    def test_sslmode_from_url_query_is_honoured(self):
        result = run_settings(
            "postgresql://user:secret@db.example.com:5432/app?sslmode=verify-full"
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["sslmode"], "verify-full")

    def test_non_postgres_scheme_is_rejected(self):
        result = run_settings("mysql://user:secret@db.example.com:3306/app")
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "ImproperlyConfigured")

    def test_test_run_refuses_a_remote_database(self):
        result = run_settings(
            "postgresql://user:secret@ep-example-123.us-east-2.aws.neon.tech/neondb",
            {"PROBE_AS_TEST_RUN": "1"},
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "ImproperlyConfigured")
        self.assertIn("Refusing to run the test suite", result["message"])

    def test_test_run_allows_a_remote_database_only_with_the_override(self):
        result = run_settings(
            "postgresql://user:secret@ep-example-123.us-east-2.aws.neon.tech/neondb",
            {"PROBE_AS_TEST_RUN": "1", "ALLOW_REMOTE_TEST_DB": "1"},
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["name"], "neondb")

    def test_test_run_accepts_the_local_docker_database(self):
        result = run_settings(
            "",
            {
                "PROBE_AS_TEST_RUN": "1",
                "POSTGRES_DB": "hiddenstage",
                "POSTGRES_USER": "hiddenstage",
                "POSTGRES_PASSWORD": "secret",
                "POSTGRES_HOST": "127.0.0.1",
                "POSTGRES_PORT": "55432",
            },
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["host"], "127.0.0.1")

    def test_without_url_the_discrete_variables_still_apply(self):
        # An empty value counts as unset, so the POSTGRES_* path stays available.
        result = run_settings(
            "",
            {
                "POSTGRES_DB": "fallback_db",
                "POSTGRES_USER": "fallback_user",
                "POSTGRES_PASSWORD": "secret",
                "POSTGRES_HOST": "127.0.0.1",
                "POSTGRES_PORT": "55432",
            },
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["name"], "fallback_db")
        self.assertEqual(result["user"], "fallback_user")
        self.assertEqual(result["host"], "127.0.0.1")
        self.assertEqual(result["port"], "55432")
