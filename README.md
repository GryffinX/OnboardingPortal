# Onboarding-App

A full-stack onboarding management system designed to streamline the employee onboarding process through a multi-stage approval workflow.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Modular)
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)
- **API Client**: Native `fetch` API

### Backend
- **Framework**: [Django 5.0+](https://www.djangoproject.com/)
- **Language**: Python 3.14
- **Database**: Microsoft SQL Server (MSSQL) / SQLite (Development)
- **Server**: Gunicorn (Production) / Django Development Server

### Architecture
- **Client**: Modular component-based architecture with separated services, constants, and utilities. Features a centralized state hub in `App.jsx` for real-time synchronization across views.
- **Server**: Modular view package structure (`onboarding/views/`) for clean separation of concerns (Auth, Users, Onboarding, Common).

## 🛠️ Installation & Setup

### Prerequisites
- Node.js & npm
- Python 3.10+
- SQL Server (or configure for SQLite)

### Client Setup
1. Navigate to `client/` directory.
2. Create `client/.env` from `client/.env.example`.
3. Run `npm install`.
4. Start development server: `npm run dev`.

### Server Setup
1. Navigate to `server/` directory.
2. Create `server/.env` from `server/.env.example`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Run migrations: `python manage.py migrate`.
5. Start API server: `python manage.py runserver 0.0.0.0:8000`.

## 📂 Project Structure

```text
Onboarding-App/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── services/       # API service layer
│   │   ├── utils/          # Helper functions
│   │   └── constants/      # App-wide constants
└── server/                 # Django backend
    ├── onboarding/         # Main application logic
    │   ├── views/          # Modular API views
    │   ├── models.py       # DB Schema
    │   └── urls.py         # API Routing
    └── onboarding_backend/ # Project configuration
```

## 🌐 API Endpoints
- `POST /api/login`: User authentication.
- `POST /api/onboarding-email`: Submit initial onboarding form.
- `POST /api/finalize-onboarding`: Final approval and account creation.
- `POST /api/forgot-password`: Trigger OTP for password reset.
- `POST /api/create-user`: Create a new portal user.
- `POST /api/update-user`: Update an existing portal user.
- `POST /api/delete-user`: Delete a portal user by email.
- `GET /api/users`: List all portal users.
- `GET /api/departments`: Fetch available departments.

## ✨ Key Features
- **Multi-Stage Approval**: Automated routing between HR, Line Managers, and HODs.
- **Dynamic Asset Tracking**: Mandatory Asset code assignment with uniqueness enforcement.
- **Smart Auto-Selection**: Automatically selects Manager/HOD for single-reviewer departments.
- **Universal Intervention**: HR can stop cases at any stage of the active workflow.
- **Automated Provisioning**: One-click account creation and credential dispatch upon final approval.
