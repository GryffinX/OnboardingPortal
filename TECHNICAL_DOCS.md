# Technical Documentation & Workflow

This document provides a comprehensive deep dive into the technical architecture, implementation details, and usage patterns of the Onboarding-App.

---

## 🔄 Business Workflow & State Machine

The application implements a linear workflow for onboarding approval, managed through a "Stage" state in the frontend and backed by Django models.

### Workflow Stages
1.  **`manager_review`**: Initial state after HR submission.
2.  **`hod_review`**: Set after Line Manager approval.
3.  **`hr_review`**: A "correction" state if a Manager or HOD sends the request back to HR.
4.  **`approved`**: Final state after HOD approval, triggering account creation.
5.  **`stopped`**: Terminal state if HR cancels the onboarding process.

### The Approval loop & "Back-loop" Logic
*   **Linear Flow**: Approve -> Moves to next logical stage.
*   **The Back-loop**: Implemented as a closed-loop feedback system. When a Manager or HOD triggers an "HR Review" action, a `reason` string is required. HR must then "Re-submit" to return the request to the `manager_review` stage.
*   **Universal Termination**: HR users have the authority to "Stop Case" at any active stage (Manager or HOD review). This releases any assigned Asset Codes for reuse.

---

## 🛠️ Implementation Details

### Frontend Architecture (React 19)
The client uses a **Service-Oriented Component** architecture focused on composition:

#### 1. State Orchestration (Lifting State Up)
*   **Central State Hub**: `App.jsx` manages global states like `isAuthenticated`, `currentUser`, and the master `requests` list.
*   **Consistency**: Type-agnostic ID comparison (`String(id)`) ensures stable request selection across different storage and API formats.
*   **Navigation**: `handleSelectRequest` synchronizes selection state and triggers smooth scrolling for optimized reviewer UX.

#### 2. Validation & Data Integrity
*   **Asset Code Uniqueness**: The frontend enforces unique Asset Codes across all active and approved requests. Codes from `stopped` cases are automatically flagged as reusable.
*   **Mandatory Fields**: Line Managers are blocked from approving requests if the `Asset Code` is missing, with inline visual error feedback and auto-scroll to the missing field.
*   **Smart Selection**: `HRForm.jsx` implements intelligent auto-selection for Line Managers and HODs in departments with only one designated reviewer.

#### 3. Component Architecture
*   **Unified Dashboards**: HR, Manager, and HOD dashboards share a consistent side-by-side layout (Detail Panel + Data Table) for unified UX.
*   **Loading Guards**: Robust initialization guards prevent rendering components before critical session and request data are fully synchronized.

---

### Backend Architecture (Django 5)
The server uses a **Modular Monolith** approach for its API layer:

#### 1. Modular View Routing (`onboarding/views/`)
Logic is partitioned into a package-based structure:
*   **`auth.py`**: Handles security and OTP recovery.
*   **`users.py`**: Manages user identity and cascading profiles.
*   **`onboarding.py`**: Handles core workflow logic and robust Request Code generation (sequence-aware, collision-proof).
*   **`requests.py`**: Manages the persistence and retrieval of onboarding records.

#### 2. Atomic Finalization & Profile Integrity
The `finalize_onboarding` method uses `update_or_create` for `UserProfile` instantiation. This ensures that re-finalizing a previously stopped or failed request does not trigger "Duplicate Key" errors, maintaining database integrity.

#### 3. Custom Middleware
*   **`SimpleCORSMiddleware`**: Injects headers for headless React-to-Django communication.
*   **Preflight Handling**: Manages HTTP `OPTIONS` requests for modern browser security.

---

## 🛡️ Security & RBAC

### Role-Based Access Control (RBAC)
Enforced at three levels:
1.  **UI Level**: Conditional rendering based on `currentUser.role`.
2.  **View Level**: Dashboard layouts are role-specific (e.g., HR-only administrative buttons).
3.  **Data Level**: Roles are verified by the backend during authentication.

---

## 🚀 How It Is Used (Role-Based Guide)

### 🔑 Admin
*   Manage the portal's user base and department configurations.

### 📝 HR
*   Initiates onboarding, manages corrections, and performs universal terminations ("Stop Case").

### 👥 Line Manager & HOD
*   Reviewers responsible for software requirements (Managers) and final approval (HODs). Line Managers must assign hardware Asset Codes.

### 👤 Employee
*   View-only access to their specific onboarding record and software status.

---

## ⚡ Performance Optimization
*   **Memoization**: All expensive filters (WIP, Approved, Rejected buckets) use `useMemo` to prevent lag.
*   **Optimized Queries**: Django's `select_related` prevents N+1 query patterns during user list retrieval.
*   **React 19 Best Practices**: Avoids cascading renders in forms by managing auto-selection in event handlers rather than effects.
