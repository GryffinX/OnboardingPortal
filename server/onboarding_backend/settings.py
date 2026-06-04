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

CORS_ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
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
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "onboarding_backend.middleware.SimpleCORSMiddleware",
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

DATABASES = {
    "default": {
        "ENGINE": "mssql",
        "NAME": os.getenv("DB_NAME"),
        "HOST": os.getenv("DB_HOST"),
        "OPTIONS": {
            "driver": "ODBC Driver 18 for SQL Server",
            "trusted_connection": "yes",
            "extra_params": "TrustServerCertificate=yes;",
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
