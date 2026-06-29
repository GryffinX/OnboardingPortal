import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def load_local_env():
    for file_name in (".env", ".env.example"):
        env_file = BASE_DIR / file_name

        if not env_file.exists():
            continue

        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env_bool(key, default=False):
    value = os.getenv(key)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


load_local_env()


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-onboarding-app-dev-only-secret-key",
)
DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if host.strip()
]

DEFAULT_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_cors_origin_value = os.getenv("ALLOWED_ORIGINS", os.getenv("ALLOWED_ORIGIN", ""))
configured_origins = [

    origin.strip()
    for origin in _cors_origin_value.split(",")
    if origin.strip()
]

CORS_ALLOWED_ORIGINS = list(dict.fromkeys([*DEFAULT_LOCAL_ORIGINS, *configured_origins]))
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
TEST_RECIPIENT = os.getenv("TEST_RECIPIENT", "g.ayush2k07@gmail.com")
OFFICIAL_DOMAIN = "@securitas-india.com"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "onboarding",
]

MIDDLEWARE = [
    "onboarding_backend.middleware.SimpleCORSMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "onboarding_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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

WSGI_APPLICATION = "onboarding_backend.wsgi.application"
ASGI_APPLICATION = "onboarding_backend.asgi.application"

DB_ENGINE = os.getenv("DB_ENGINE")
if not DB_ENGINE:
    has_external_db_config = bool(os.getenv("DB_NAME") and os.getenv("DB_HOST"))
    DB_ENGINE = "mssql" if has_external_db_config else "sqlite"


if DB_ENGINE.lower() == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    db_user = os.getenv("DB_USER", "")
    db_password = os.getenv("DB_PASSWORD", "")
    db_port = os.getenv("DB_PORT", "")
    db_driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    db_trusted_connection = os.getenv("DB_TRUSTED_CONNECTION", "yes" if not db_user else "no")
    db_extra_params = os.getenv("DB_EXTRA_PARAMS", "TrustServerCertificate=yes;Encrypt=no;")


    DATABASES = {
        "default": {
            "ENGINE": "mssql",
            "NAME": os.getenv("DB_NAME"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": db_port,
            "USER": db_user,
            "PASSWORD": db_password,
            "OPTIONS": {
                "driver": db_driver,
                "trusted_connection": db_trusted_connection,
                "extra_params": db_extra_params,

            },
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("GMAIL_SENDER", "")
EMAIL_HOST_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
EMAIL_TIMEOUT = 30

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", not DEBUG)
