"""Django settings for the HiddenStage modular monolith.

Approved constraints implemented here (see docs/DECISION_LOG.md):
- PostgreSQL is the only configured database (D-006).
- Session cookie + CSRF authentication; no token storage in the browser (D-005).
- Asia/Kolkata default timezone and aware timestamps (D-006).
"""

import os
import sys
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlsplit

if sys.platform == "win32":
    import socket

    _orig_getaddrinfo = socket.getaddrinfo

    def _ipv4_getaddrinfo(*args, **kwargs):
        if kwargs.get("family", 0) == 0:
            kwargs = {**kwargs, "family": socket.AF_INET}
        return _orig_getaddrinfo(*args, **kwargs)

    socket.getaddrinfo = _ipv4_getaddrinfo

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ImproperlyConfigured(f"{name} must be an integer.") from exc


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG", False)

def _samesite(name: str) -> str:
    """Cookie SameSite policy, validated: a typo here fails closed, not silently."""
    value = os.environ.get(name, "Lax").strip().lower()
    allowed = {"lax": "Lax", "strict": "Strict", "none": "None"}
    if value not in allowed:
        raise ImproperlyConfigured(f"{name} must be Lax, Strict or None.")
    return allowed[value]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "insecure-development-only-secret-key-do-not-deploy"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.")

# A fresh clone runs with no configuration, so development falls back to loopback.
# Production must name its hosts: a loopback-only list rejects every real request
# with a 400 and reads as an outage, so an empty list fails at import instead.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "" if not DEBUG else "localhost,127.0.0.1")
_render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)
for _default_render_host in ["hiddenstage-j2j3.onrender.com", ".onrender.com"]:
    if _default_render_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_default_render_host)

if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must list the public host names when DJANGO_DEBUG is off."
    )

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.profiles",
    "apps.events",
    "apps.matching",
    "apps.invitations",
    "apps.quotations",
    "apps.commitments",
    "apps.network",
    "apps.administration",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves STATIC_ROOT straight from the WSGI app, so Gunicorn needs no separate
    # static host. Must sit directly after SecurityMiddleware.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

def _database_from_url(url: str) -> dict[str, object]:
    parsed = urlsplit(url)
    if parsed.scheme == "sqlite":
        db_path = unquote(parsed.path)
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": db_path if db_path and db_path != "/" else ":memory:",
        }
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured(
            "DATABASE_URL must use a postgres://, postgresql://, or sqlite:// scheme."
        )
    db_name = unquote(parsed.path.lstrip("/"))
    if not db_name:
        raise ImproperlyConfigured("DATABASE_URL must include a database name.")
    options: dict[str, str] = dict(parse_qsl(parsed.query, keep_blank_values=False))
    is_pooled = "-pooler." in (parsed.hostname or "")
    config: dict[str, object] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": db_name,
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": env_int("POSTGRES_CONN_MAX_AGE", 0 if is_pooled else 60),
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": options,
    }
    if is_pooled:
        config["DISABLE_SERVER_SIDE_CURSORS"] = True
    return config


_is_test = "test" in sys.argv or any("pytest" in arg for arg in sys.argv)
_is_migration_command = any(
    arg in sys.argv for arg in ["migrate", "makemigrations", "squashmigrations", "showmigrations"]
)

# Automated tests must remain isolated from shared cloud database (D-006 / Neon policy).
if _is_test:
    _test_db_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    if _test_db_url:
        DATABASES = {"default": _database_from_url(_test_db_url)}
    else:
        # Fall back to sqlite in-memory for isolated local test runs when no TEST_DATABASE_URL is provided. Never target shared Neon.
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": ":memory:",
            }
        }
else:
    # Use unpooled direct endpoint for migrations when available, avoiding PgBouncer lock limits.
    _unpooled_url = os.environ.get("DATABASE_URL_UNPOOLED", "").strip()
    _database_url = os.environ.get("DATABASE_URL", "").strip()
    if _is_migration_command and _unpooled_url:
        _effective_url = _unpooled_url
    else:
        _effective_url = _database_url

    if _effective_url:
        DATABASES = {"default": _database_from_url(_effective_url)}
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": os.environ.get("POSTGRES_DB", "hiddenstage"),
                "USER": os.environ.get("POSTGRES_USER", "hiddenstage"),
                "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "hiddenstage"),
                "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),
                "PORT": os.environ.get("POSTGRES_PORT", "5432"),
                "CONN_MAX_AGE": env_int("POSTGRES_CONN_MAX_AGE", 60),
                "CONN_HEALTH_CHECKS": True,
                "OPTIONS": {},
            }
        }
_pg_sslmode = os.environ.get("POSTGRES_SSLMODE", "").strip()
if _pg_sslmode:
    DATABASES["default"]["OPTIONS"].setdefault("sslmode", _pg_sslmode)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = ["apps.accounts.backends.EmailBackend"]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-in"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Event attachments are private by default (D-013). This directory must never be
# served directly by the web server; downloads go through authorized API views.
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "private-media"))
MEDIA_URL = "/private-media/"

# ---- File storage (D-013: attachments stay private) --------------------------
# `local` writes uploads to MEDIA_ROOT: correct for development and for a single
# host with a persistent volume. `s3` points the same FileField at any
# S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO) so uploads
# survive redeploys on ephemeral hosts.
#
# Nothing above the storage layer changes: the model, the upload contract and the
# download URL all keep working, because `download_url` points at the authorizing
# API view rather than at the bucket. Credentials come only from the environment.
MEDIA_STORAGE = os.environ.get("MEDIA_STORAGE", "local").strip().lower()
if MEDIA_STORAGE not in {"local", "s3"}:
    raise ImproperlyConfigured("MEDIA_STORAGE must be 'local' or 's3'.")

_s3_options: dict[str, object] = {}
if MEDIA_STORAGE == "s3":
    _bucket = os.environ.get("AWS_STORAGE_BUCKET_NAME", "").strip()
    if not _bucket:
        raise ImproperlyConfigured(
            "AWS_STORAGE_BUCKET_NAME must be set when MEDIA_STORAGE=s3."
        )
    _s3_options = {
        "bucket_name": _bucket,
        "region_name": os.environ.get("AWS_S3_REGION_NAME", "").strip() or None,
        # Set for R2/MinIO/B2. Leave empty for AWS S3 itself.
        "endpoint_url": os.environ.get("AWS_S3_ENDPOINT_URL", "").strip() or None,
        "access_key": os.environ.get("AWS_ACCESS_KEY_ID", "").strip() or None,
        "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip() or None,
        # Private by default: no ACL is applied and no signed URL is ever minted,
        # so a leaked name cannot be turned into a readable link.
        "default_acl": None,
        "querystring_auth": False,
        "file_overwrite": False,
    }

STORAGES = {
    "default": (
        {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": _s3_options}
        if MEDIA_STORAGE == "s3"
        # No OPTIONS: FileSystemStorage reads MEDIA_ROOT/MEDIA_URL at access time,
        # so override_settings(MEDIA_ROOT=...) in tests keeps working.
        else {"BACKEND": "django.core.files.storage.FileSystemStorage"}
    ),
    "staticfiles": {
        # Hashed, pre-compressed names in production; the plain storage in
        # development so `runserver` needs no collectstatic step.
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        )
    },
}
WHITENOISE_MAX_AGE = env_int("WHITENOISE_MAX_AGE", 31536000)
# Development only: serve app static files without running collectstatic.
WHITENOISE_USE_FINDERS = DEBUG

ATTACHMENT_ALLOWED_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]
ATTACHMENT_MAX_BYTES = env_int("ATTACHMENT_MAX_BYTES", 5 * 1024 * 1024)
ATTACHMENT_MAX_PER_EVENT = env_int("ATTACHMENT_MAX_PER_EVENT", 5)

# ---- Session and CSRF (D-005) -------------------------------------------------
# Server-side Django sessions in HttpOnly cookies. The CSRF token cookie is
# readable by the frontend client, which echoes it in X-CSRFToken.
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "hs_sessionid"
SESSION_COOKIE_AGE = env_int("SESSION_COOKIE_AGE", 60 * 60 * 24 * 14)
SESSION_COOKIE_HTTPONLY = True
# "Lax" is correct when the SPA and the API share a registrable domain: app.example.com
# calling api.example.com is same-site, so the cookie is still sent. A frontend on a
# *different* site (my-app.vercel.app calling api.example.com) needs None, or the
# browser withholds the cookie on cross-site XHR and every signed-in request looks
# anonymous. None requires Secure, which is already on whenever DEBUG is off.
SESSION_COOKIE_SAMESITE = _samesite("SESSION_COOKIE_SAMESITE")
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = _samesite("CSRF_COOKIE_SAMESITE")
CSRF_COOKIE_SECURE = not DEBUG
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
for _render_origin in ["https://hiddenstage-j2j3.onrender.com", "https://*.onrender.com"]:
    if _render_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_render_origin)

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
# A wildcard origin with credentials is both invalid per the CORS spec and a way to
# leak session-authenticated responses. Refuse to boot with one in production.
if not DEBUG and ("*" in CORS_ALLOWED_ORIGINS or "*" in CSRF_TRUSTED_ORIGINS):
    raise ImproperlyConfigured(
        "Wildcard CORS/CSRF origins are not allowed when DJANGO_DEBUG is off."
    )
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ---- Production transport security -------------------------------------------
# On by default in production: every cookie is Secure when DEBUG is off, so plain
# HTTP would silently drop the session. Behind a TLS-terminating proxy the
# SECURE_PROXY_SSL_HEADER below supplies the original scheme (no redirect loop).
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 0 if DEBUG else env_int("DJANGO_HSTS_SECONDS", 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# ---- Email ------------------------------------------------------------------
# Resend is the default transactional provider when RESEND_API_KEY is present.
# Set EMAIL_BACKEND explicitly to use another SMTP relay or the console backend.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "").strip()
if not EMAIL_BACKEND:
    EMAIL_BACKEND = (
        "django.core.mail.backends.smtp.EmailBackend"
        if RESEND_API_KEY
        else "django.core.mail.backends.console.EmailBackend"
    )
EMAIL_HOST = os.environ.get("EMAIL_HOST", "").strip() or (
    "smtp.resend.com" if RESEND_API_KEY else ""
)
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "").strip() or (
    "resend" if RESEND_API_KEY else ""
)
EMAIL_HOST_PASSWORD = (
    os.environ.get("EMAIL_HOST_PASSWORD", "").strip() or RESEND_API_KEY
)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = env_int("EMAIL_TIMEOUT", 15)
DEFAULT_FROM_EMAIL = (
    os.environ.get("DEFAULT_FROM_EMAIL", "").strip() or "no-reply@hiddenstage.local"
)
# Resend's onboarding sender works only for the account owner and is a development
# fallback. Set DEFAULT_FROM_EMAIL to an address on a verified domain in production.
if RESEND_API_KEY and DEFAULT_FROM_EMAIL == "no-reply@hiddenstage.local":
    DEFAULT_FROM_EMAIL = "onboarding@resend.dev"
# Used only to build links inside transactional emails.
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173")

# ---- Token lifetimes (implementation defaults pending product approval) ------
EMAIL_VERIFICATION_TTL_HOURS = env_int("EMAIL_VERIFICATION_TTL_HOURS", 24)
PASSWORD_RESET_TTL_HOURS = env_int("PASSWORD_RESET_TTL_HOURS", 1)

# ---- Email verification requirement -----------------------------------------
# Whether an account must have followed the emailed link before the verification-
# gated marketplace actions (inviting, quoting, accepting, Manager/Worker network).
# This governs the *requirement*, never the recorded state: email_verified_at still
# holds exactly what was proven, so switching it off and on is lossless and nobody
# is ever marked verified without following a link. Defaults to required.
EMAIL_VERIFICATION_REQUIRED = env_bool("EMAIL_VERIFICATION_REQUIRED", True)

# ---- Marketplace policy defaults (see docs/UNRESOLVED_DECISIONS.md) ----------
INVITATION_TTL_DAYS = env_int("INVITATION_TTL_DAYS", 7)
QUOTATION_MAX_VALIDITY_DAYS = env_int("QUOTATION_MAX_VALIDITY_DAYS", 90)

# ---- DRF --------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "30/min",
    },
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )

SPECTACULAR_SETTINGS = {
    "TITLE": "HiddenStage API",
    "DESCRIPTION": (
        "Marketplace API for event requests, provider discovery, invitations, "
        "quotations and commercial commitments. All monetary values are integer "
        "paise (BIGINT). Amounts are never floating point."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": False,
    "ENUM_ADD_EXPLICIT_BLANK_NULL_CHOICE": False,
    "POSTPROCESSING_HOOKS": [],
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}

# Test runs use a fast password hasher. This is never applied when DEBUG is off
# outside tests, because the override is reverted after the suite.
if "test" in sys.argv:
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
