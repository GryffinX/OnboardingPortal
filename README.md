# Onboarding-App

## Client

1. Create `client/.env` from `client/.env.example`.
2. Run `npm install` inside `client`.
3. Start the app with `npm run dev`.

## Server

1. Create `server/.env` from `server/.env.example`.
2. Install dependencies with `pip install -r server/requirements.txt`.
3. Run database migrations with `python server/manage.py migrate`.
4. Start the API with `python server/manage.py runserver 0.0.0.0:8000`.

The form submits to `POST /api/onboarding-email` and currently sends the onboarding email to the fixed test recipient from `TEST_RECIPIENT`.
The Django health endpoint is `GET /api/health`.

## Render setup

- Backend build command: `pip install -r server/requirements.txt && python server/manage.py migrate`
- Backend start command: `gunicorn onboarding_backend.wsgi:application --chdir server --bind 0.0.0.0:$PORT`
- Backend environment variables:
  `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `GMAIL_SENDER`, `GMAIL_APP_PASSWORD`, `TEST_RECIPIENT`, `ALLOWED_ORIGIN`
- Frontend environment variable:
  `VITE_API_URL=https://your-render-backend-url.onrender.com`
