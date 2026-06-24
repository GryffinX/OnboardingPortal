# Technical Documentation

This document provides a deep, comprehensive overview of the architecture, workflow models, security mechanisms, API endpoints, and implementation details for the Onboarding Portal.

## System Architecture

The Onboarding Portal follows a decoupled client-server architecture:
- **Frontend (Client)**: A React 19 Single Page Application (SPA) built with Vite. It handles complex conditional rendering, routing, role-based dashboard access, forms, and local state.
- **Backend (Server)**: A Django 5.2 application providing a RESTful JSON API. It acts as the single source of truth, enforcing validation, security, workflow progression, and database integrity.

The frontend communicates with the backend exclusively via HTTP API requests. Authentication is handled statelessly via JSON Web Tokens (JWT).

## Frontend Architecture

### Core Responsibilities
- **Routing & Gatekeeping**: Hash-based routing (`/#/manager`, `/#/admin`) determines the active view. The system strictly enforces access control (`getAllowedPagesForUser` in `App.jsx`); if a user attempts to access a URL they lack privileges for, they are immediately redirected to their designated landing page.
- **Session State**: Session data (`user` object and `token`) is stored in `localStorage` (`onboarding_session`). The custom `api.js` wrapper intercepts `fetch` calls to automatically append the `Authorization` header.
- **Queue Management**: The UI dynamically filters requests into queues (`pending`, `wip`, `hr_review`, `stopped`, `approved`) based on the user's role and the request's current stage.

### Key Components & Files
- **`src/App.jsx`**: The application shell. It handles high-level state (`currentUser`, `requests`, `users`), routing logic, OTP-based profile updates, and renders the active dashboard component.
- **`src/services/api.js`**: A comprehensive wrapper around `fetch`. It overrides the native `window.fetch` to automatically append headers, and provides specific asynchronous methods for every backend endpoint.
- **`src/constants.js`**: Contains the source of truth for workflow stages (e.g., `manager`, `hod`, `infraAdmin`), page definitions, and queue tab configurations.
- **`src/utils.js`**: Contains vital helper functions for data normalization, role mapping, queue filtering (`applyQueueTabFilter`), and complex logic for determining user permissions (`isGlobalQueueViewer`, `isStaffWorkflowUser`).
- **`src/components/RequestDetailPanel.jsx`**: A massive, dynamic component that renders the details of a single onboarding request. It conditionally displays approval buttons, input fields for software/hardware, and review histories based on the viewer's role and the request's stage.

## Backend Architecture

The backend is organized into a single Django app called `onboarding` with modularized views.

### View Modules (`server/onboarding/views/`)
- **`auth.py`**: Handles `/login`, `/forgot-password`, `/verify-otp`, and `/reset-password`. Generates JWT tokens manually.
- **`users.py`**: Handles CRUD operations for system users (`/users`, `/create-user`, `/update-user`, `/delete-user`) and the authenticated profile update OTP flow.
- **`requests.py`**: Manages the fetching, soft-deletion, restoration, and archiving of onboarding requests. Also provides the `/changelogs` endpoint.
- **`onboarding.py`**: Houses the complex business logic for `/save-request` (workflow state machine transitions), `/onboarding-email` (initiation), and `/finalize-onboarding` (asset assignment, employee code generation, user creation).
- **`common.py`**: Manages reference data: `/workflow-options`, software catalog endpoints, department endpoints, and hardware asset endpoints.
- **`utils.py`**: Contains helper functions for JWT generation/validation, OTP email dispatch, and extracting users from requests.

## Data Model & Schema

All models reside in `server/onboarding/models.py`.

- **`Department`**: Contains a unique `name`.
- **`UserProfile`**: Has a One-to-One relationship with Django's built-in `User`. Stores `role`, `department`, `phone_number`, and `employee_code`.
- **`SoftwareCatalogItem`**: Software entries linked to a `Department`. Contains `name` and `category` (pre-installed or employee-installed). Enforces a unique constraint on `(name, category, department)`.
- **`AssetInventory`**: Represents hardware. Fields: `asset_code` (must be `LAP-XXXX`), `laptop_model`, `laptop_processor`, `laptop_ram`, `laptop_storage`, `laptop_gpu`, and `is_assigned`.
- **`OnboardingRequest`**: The central entity. Contains over 30 fields tracking everything from basic info (`employee_name`, `personal_email`), workflow stage, JSON strings of software arrays, hardware assignments, review comments, and soft-delete metadata.
- **`ChangeLog`**: An audit trail record linked to an `OnboardingRequest` or general action, tracking the actor, action type, description, and timestamp.
- **`PasswordResetOTP`**: Tracks ephemeral OTP codes for password resets, including expiration logic (valid for 10 minutes).

### Validation & Integrity
The backend strictly enforces data integrity before hitting the database:
- **Gibberish Validation**: Custom validator `validate_gibberish` rejects strings containing repeating characters, known keyboard mashes (e.g., "asdf", "qwer"), or too few alphanumeric characters.
- **Format Validation**: Phone numbers must be exactly 10 digits and cannot start with 0. Asset codes must match `LAP-\d{4}`. Employee codes must be 5 digits.
- **Data Uniqueness**: `employee_phone_number`, `personal_email`, and `employee_code` are strictly unique.

## Workflow Model & State Machine

The lifecycle of an `OnboardingRequest` is driven by the `stage` field.

1. **`manager_review`**: Initial state. HR submits. Line Manager must review, add `manager_software`, and approve.
2. **`hod_review`**: HOD reviews the request, optionally adds `hod_comment`, and approves.
3. **`infra_admin_review`**: Infra Admin reviews, adds `infra_software`, assigns an Infra Executive, and approves.
4. **`infra_executive_review`**: Infra Executive receives the task, assigns an `asset_code`, confirms hardware specs, and approves.
5. **`approved`**: Terminal success state. Triggered by `/finalize-onboarding`. Employee code is generated, user account is created.
6. **`hr_review`**: An intermediary state. Any approver can "Send Back" the request to HR with a `review_reason`. HR can edit the payload and resubmit, sending it back to `manager_review`.
7. **`stopped`**: Terminal failure state. An approver can "Stop" the onboarding process entirely.

### Archiving and Deletion
- **Soft Delete**: Requests can be archived (hidden from normal queues). Handled by `is_deleted`, `deleted_at`, and `deleted_by` fields.
- **Hard Delete**: System administrators can permanently delete requests from the database.

## Security Controls

### Authentication
- **Login**: Verifies credentials against Django's `User` model. Generates a custom JWT payload containing user ID, role, department, and expiration.
- **JWT Protection**: The `@require_jwt` decorator (in `utils.py`) wraps protected endpoints. It decodes the token, extracts the user ID, and injects the user object into the request.

### OTP Flows
- **Password Reset**: Generates a 6-digit OTP, sends it via email using `django.core.mail`, and stores it in `PasswordResetOTP`. Requires verification before allowing password change.
- **Profile Updates**: When an employee changes sensitive details (Name, Email, Phone), the system sends an OTP to their *current* email. Only upon verification is the `UserProfile` updated.

### Authorization
- Views validate the role of the user injected by the JWT. Admin-only endpoints explicitly check if `request.user.profile.role == "Admin"`.
- Requests actions (approve, reject) validate that the actor actually has the correct role for the request's current stage.

## API Endpoint Reference

All endpoints are prefixed with `/api/`.

### Authentication & Public
- `POST /login`: Accepts `email`, `password`. Returns JWT `token` and user object.
- `POST /forgot-password`: Accepts `email`. Sends OTP.
- `POST /verify-otp`: Accepts `email`, `otp`. Validates OTP.
- `POST /reset-password`: Accepts `email`, `otp`, `password`. Updates password.
- `GET /health`: Returns `{ "status": "ok" }`.

### User Management (Admin Protected)
- `GET /users`: Returns list of all portal users.
- `POST /create-user`: Accepts full user payload. Creates `User` and `UserProfile`.
- `POST /update-user`: Updates an existing user's role/department.
- `POST /delete-user`: Soft-deletes or hard-deletes a user.
- `POST /bulk-update-users-status`: Activates/Deactivates multiple users.

### Profile Self-Service
- `POST /request-profile-update-otp`: Sends OTP to authenticated user's email.
- `POST /verify-profile-update`: Accepts OTP and `newData`. Updates profile if OTP is valid.

### Onboarding Workflow
- `GET /requests`: Fetches all requests (filtered by `is_deleted=False` unless `includeArchived=true` is passed).
- `POST /onboarding-email`: Initiates a new request. Creates `OnboardingRequest` record in `manager_review` stage.
- `POST /save-request`: The state machine driver. Accepts updates to a request (stage changes, software additions, comments). Creates `ChangeLog` entries.
- `POST /finalize-onboarding`: Finalizes the request. Finds next available employee code (e.g., 10001, 10002). Creates the final `User` account for the employee. Moves stage to `approved`.
- `POST /acknowledge-laptop`: Sets `laptop_acknowledged=True` for the employee.

### Request Management
- `POST /archive-request`: Soft-deletes a request.
- `POST /restore-request`: Restores a soft-deleted request.
- `POST /delete-request`: Permanently deletes a request and its changelogs from the database.
- `GET /changelogs`: Retrieves audit logs, optionally filtered by `actorId`.

### Catalogs & Assets
- `GET /workflow-options`: Returns available email domains and predefined software based on department.
- `GET /software-catalog`: Returns all software items grouped by category.
- `POST /create-software-item`, `POST /update-software-item`, `POST /delete-software-item`: CRUD for software catalog.
- `GET /departments`, `POST /create-department`, `POST /update-department`, `POST /delete-department`: CRUD for departments.
- `GET /assets`: Returns all hardware items from `AssetInventory`.
- `POST /create-asset`, `POST /update-asset`, `POST /delete-asset`: CRUD for hardware inventory.

## Execution Flow Details

### How to Run Locally

1. **Database initialization**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
   *This automatically seeds default departments, standard software, and an initial admin user (if configured in migrations).*

2. **Run Backend**:
   ```bash
   python manage.py runserver
   ```

3. **Run Frontend**:
   ```bash
   npm run dev
   ```

### Known Technical Details
- The frontend uses `JSON.parse` heavily on `localStorage`. If the state gets corrupted, users must clear their local storage manually or use the logout function.
- The `fetch` interceptor logic relies on modifying the global `window.fetch` object in `api.js`.
- The backend relies on SMTP (`GMAIL_SENDER`, `GMAIL_APP_PASSWORD`) to function correctly for the forgot-password flow. Without internet access or valid credentials, OTPs will fail to send, blocking certain paths.
