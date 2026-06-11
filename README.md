# Onboarding-Portal

A full-stack, enterprise-ready onboarding management system designed to streamline employee transitions through a secure, multi-stage approval workflow with automated provisioning.

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Modular & Responsive)
- **State Management**: React Hooks with centralized orchestration in `App.jsx`.
- **Feedback**: 1500ms toast notifications with animated progress bars.

### Backend
- **Framework**: [Django 5.0+](https://www.djangoproject.com/)
- **Language**: Python 3.14
- **Database**: Microsoft SQL Server (MSSQL) / SQLite (Development)
- **Security**: Role-Aware RBAC, OTP-based profile updates, and strict database-level unique constraints.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js & npm
- Python 3.10+
- SQL Server (configured in `server/onboarding_backend/settings.py`)

### Server Setup
1. Navigate to `server/` directory.
2. Create `server/.env`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Run migrations: `python manage.py migrate`.
5. **Seed Data**: `python manage.py seed_data` (Populates departments, software catalog, and default admin).
6. Start API server: `python manage.py runserver 0.0.0.0:8000`.

### Client Setup
1. Navigate to `client/` directory.
2. Create `client/.env`.
3. Run `npm install`.
4. Start development server: `npm run dev`.

## 📂 Project Structure

```text
Onboarding-App/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # High-fidelity UI components
│   │   ├── services/       # Centralized API service (fetch)
│   │   ├── utils/          # Normalization & validation logic
│   │   └── constants/      # App-wide workflow definitions
└── server/                 # Django backend
    ├── onboarding/         # Application core
    │   ├── views/          # Modular API logic (Auth, Users, Requests)
    │   ├── models.py       # Validated DB Schema
    │   └── urls.py         # Endpoints
    └── onboarding_backend/ # Django system config
```

## ✨ Key Enterprise Features

- **Automated Identifier Management**: 
    - Native generation of sequential **4-Digit Employee Codes** (e.g., `1001`, `1002`) automatically allotted upon final IT approval.
    - Unique **Asset Code** enforcement for hardware assignments across the entire system.
- **Role-Based Workflows**:
    - **Managers/HODs**: Actionable queues with real-time, context-aware notification badges that only appear when an action is required by that specific role.
    - **Infrastructure Admin & Executive**: Multi-stage hardware provisioning where Infra Admins assign requests to Executives, who then assign physical assets and specs (Laptop Model, RAM, Storage, Processor) before triggering account creation.
    - **HR**: Global intervention capabilities ("Stop Case", "Edit & Re-submit").
    - **Admins**: "Institutional Overrides" for ID corrections and a powerful "Delete Permanently" feature that purges request records and their associated user profiles in a cascading action.
- **Data Privacy & Compliance**: 
    - **PII Scrubbing**: If an onboarding case is explicitly "Stopped" by HR (e.g. candidate withdrawal), all Personally Identifiable Information (PII) including personal emails and mobile numbers are permanently anonymized and scrubbed from the database, and any provisioned User account is cascade-deleted.
- **Global Audit & History**: The "All Requests" tab provides HR, Managers, and Admins with sub-filtered views for **WIP**, **HR Review**, **Stopped**, and **Approved** history, complete with global search integration.
- **Secure Profile Management**: OTP-secured updates for personal emails, mobile numbers, and passwords.
- **Rich Provisioning**: Automated welcome emails dispatched upon final approval containing full IT inventory, Employee Code, and reporting structure.

## 🌐 API Overview
- `POST /api/login`: Secure staff authentication.
- `POST /api/finalize-onboarding`: Triggers sequential ID generation and user account creation.
- `POST /api/save-request`: Atomic updates for hardware, software, and comments.
- `POST /api/delete-request`: (Admin Only) Permanent purge of request and cascading deletion of associated user data.
- `GET /api/workflow-options`: Fetches dynamic organization settings.
