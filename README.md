# Onboarding Portal

Onboarding Portal is a comprehensive, full-stack employee onboarding and provisioning system designed to seamlessly coordinate the onboarding process across multiple departments including HR, Line Managers, Heads of Department (HODs), Infrastructure Teams, and System Administrators. 

The application meticulously tracks every onboarding request through a strictly controlled, multi-stage workflow, supports OTP-based self-service profile updates, manages software and hardware asset inventories, and automates final provisioning and employee code generation once an onboarding request is fully approved.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Local Setup & Installation](#local-setup--installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Workflow Summary](#workflow-summary)
- [Notes & Troubleshooting](#notes--troubleshooting)

## Features

### Comprehensive Role-Based Access Control
- **HR Dashboard**: Submit new onboarding requests, monitor all cases, review rejected/sent-back cases.
- **Admin Dashboard**: Global view of all requests, system configuration, user management (CRUD portal users), software catalog and department management.
- **Manager & HOD Dashboards**: Review pending requests, add required software, approve, reject, or send back requests to HR.
- **Infrastructure Dashboards**: 
  - *Admin*: Assign infrastructure tasks, add infrastructure-level software.
  - *Executive*: Assign hardware assets (laptops with specific RAM, CPU, GPU), and finalize provisioning.
- **Employee View**: Secure dashboard to check onboarding status, acknowledge laptop receipt, and update personal profile.

### Self-Service & Security
- OTP-protected password recovery and reset flows.
- OTP-protected profile updates for employees (Name, Personal Email, Phone Number, Password).
- JWT-based authentication for all secure API routes.

### Inventory & Catalogs
- **Software Catalog**: Manage pre-installed and employee-installed software categorized by department.
- **Asset Inventory**: Manage hardware inventory, including Laptop Models, Processors, RAM, Storage, and GPU. Keep track of assigned vs unassigned assets.

### Request Management
- Detailed lifecycle tracking (Manager -> HOD -> Infra Admin -> Infra Exec -> Approved).
- Request archive, restore, and permanent delete (soft-delete capabilities).
- Change Log tracking for auditing key actions (e.g., approvals, rejections, user deletions).
- Automatic sequential employee code assignment upon finalization.

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (`App.css`, `index.css`, `Login.css`, `HRForm.css`)
- **Routing**: Client-side hash-based routing.
- **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`).
- **Network**: Native `fetch` wrapper (`services/api.js`) with automatic JWT injection.

### Backend
- **Framework**: Django 5.2
- **API Architecture**: Django REST-style JSON views (function-based views in `onboarding/views/`).
- **Authentication**: Custom JWT generation and validation via Django views.
- **Database**: Microsoft SQL Server (via `mssql-django`), locally using SQLite (`db.sqlite3`) as default fallback.
- **CORS**: `django-cors-headers` for cross-origin requests.

## Repository Structure

```text
Onboarding-App/
|-- client/                  # React frontend codebase
|   |-- src/
|   |   |-- App.jsx          # Application entry, routing logic, session mgmt
|   |   |-- AdminDashboard.jsx # Admin tools, catalogs, users, assets
|   |   |-- HRDashboard.jsx    # HR queue and operations
|   |   |-- Login.jsx          # Authentication and OTP forms
|   |   |-- components/        # Reusable UI elements (AppNotice, RequestDetailPanel, etc.)
|   |   |-- services/api.js    # API abstraction layer
|   |   |-- constants.js       # Workflow stages, queue definitions
|   |   `-- utils.js           # Validation, normalization, filters
|   |-- package.json
|   `-- vite.config.js
|-- server/                  # Django backend codebase
|   |-- manage.py
|   |-- requirements.txt
|   |-- onboarding_backend/  # Django project settings
|   `-- onboarding/          # Django app
|       |-- models.py        # Database models & validation logic
|       |-- urls.py          # API route definitions
|       `-- views/           # Modularized view handlers (auth, users, requests, etc.)
|-- README.md                # This file
`-- TECHNICAL_DOCS.md        # Deep-dive technical documentation
```

## Local Setup & Installation

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- Access to an MS SQL Server instance (optional, SQLite is used by default if MS SQL is not configured).

### Backend Setup

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```
2. **Create a virtual environment** (Recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Create a `.env` file in the `server/` directory (see [Environment Variables](#environment-variables)).
5. **Database Migrations**:
   Run migrations to set up the database schema and seed initial catalog data.
   ```bash
   python manage.py migrate
   ```
6. **Create the first administrator** (required on a new database):
   ```bash
   python manage.py createsuperuser --username admin@example.com --email admin@example.com
   ```
   Use an email address for both username and email so it can be entered on the portal login screen.
7. **Start the Development Server**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *The backend will be available at `http://localhost:8000`.*

### Frontend Setup

1. **Navigate to the client directory**:
   ```bash
   cd client
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the `client/` directory if you need to override the backend API URL.
   ```env
   VITE_API_URL=http://127.0.0.1:8000
   ```
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *The frontend will typically be available at `http://localhost:5173`.*

## Environment Variables

### Backend (`server/.env`)
| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Secret key for Django cryptographic signing. |
| `DJANGO_DEBUG` | Set to `True` for development, `False` for production. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of allowed hosts (e.g., `127.0.0.1,localhost`). |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins for the frontend. |
| `DB_NAME`, `DB_HOST` | Database configuration if using MS SQL. |
| `GMAIL_SENDER` | Email address used for sending OTPs and onboarding notifications. |
| `GMAIL_APP_PASSWORD` | App password for the Gmail account. |
| `TEST_RECIPIENT` | Override email recipient for testing environments. |

### Frontend (`client/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Full URL to the Django backend (defaults to `http://127.0.0.1:8000`). |

## Available Scripts

### Client
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Bundles the React application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to check for code quality issues.

### Server
- `python manage.py runserver`: Starts the Django development server.
- `python manage.py makemigrations`: Generates new database migration scripts.
- `python manage.py migrate`: Applies database migrations.
- `python manage.py createsuperuser`: Creates a root administrator account.

## Workflow Summary

1. **Initiation**: **HR** submits a new onboarding request via the portal.
2. **Manager Review**: The assigned **Line Manager** reviews the request, adds specific software requirements, and approves.
3. **HOD Review**: The **Head of Department** reviews the request, adds comments, and approves.
4. **Infrastructure Admin Review**: The **Infra Admin** adds necessary networking or infrastructure software and assigns the task to an Executive.
5. **Infrastructure Executive Provisioning**: The **Infra Executive** provisions the hardware, assigns a specific Laptop Asset Code, configures the system, and finalizes the onboarding.
6. **Finalization**: The system automatically generates the next sequential `Employee Code`, creates the user account for the employee, and triggers an onboarding completion email.
7. **Employee Access**: The newly onboarded employee logs in, acknowledges their laptop receipt, and updates their profile via OTP verification.
8. **Interventions**: At any stage, authorized roles can send the request back to HR, stop the case, archive it, or permanently delete it.

## Notes & Troubleshooting

- **Session Management**: The frontend stores the JWT in `localStorage` under the key `onboarding_session`.
- **API Integration**: All `fetch` requests automatically look for this token and attach it to the `Authorization: Bearer <token>` header (except for public endpoints like login and password reset).
- **Default Database**: If no MS SQL environment variables are provided, Django falls back to using `db.sqlite3` in the local server directory. Ensure you run `python manage.py migrate` first.
- **Gibberish Validation**: The backend actively rejects inputs that look like gibberish (e.g., "asdf", repeating characters, low alphanumeric density) in names, comments, and textual fields.
