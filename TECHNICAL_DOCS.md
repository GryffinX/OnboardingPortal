# Technical Documentation & Workflow

This document provides a deep dive into the technical architecture, security protocols, and state-machine logic of the Onboarding-App.

---

## 🔄 Business Workflow & State Machine

The system manages a strictly validated linear workflow, ensuring institutional oversight at every stage.

### Workflow Stages
1.  **`manager_review`**: Initial state after HR submission. Requires software requirements and a unique **Asset Code**.
2.  **`hod_review`**: Set after Line Manager approval. Requires a mandatory approval comment from the HOD.
3.  **`hr_review`**: A "correction" state if a request is sent back to HR for details. Accessible via the "HR Review" sub-filter.
4.  **`approved`**: Terminal state (Success). Triggered by HOD, automatically allots a sequential 4-digit **Employee Code**.
5.  **`stopped`**: Terminal state (Failure). Triggered by HR for offer decline/withdrawal.

### The Feedback loop
*   **Action-Aware Badges**: Navigation tabs display amber badges indicating the number of requests strictly awaiting the current user's action. HODs do not see badges for requests still in `manager_review`, preventing visual clutter.
*   **HR Global Control**: HR department members can see all active requests across stages, enabling them to "Stop Case" or "Edit" to fix entry errors.
*   **Segmented History**: The Global Audit and All Requests tabs leverage a sub-navigation filter (`requestHistoryFilter`) to neatly separate `wip`, `hr_review`, `stopped`, and `approved` cases.

---

## 🛠️ Implementation Details

### Data Integrity & Validation
The application implements a multi-layer uniqueness and validation strategy:
1.  **Database Layer**: `unique=True` constraints on `personal_email`, `phone_number`, and `employee_code` within the `UserProfile` and `OnboardingRequest` schemas.
2.  **Model Layer**: Custom validators enforce string hygiene (no double spaces, no leading spaces) and format logic.
3.  **Backend Logic**: Atomic checks in `onboarding_email`, `save_request`, and `users.py` ensure identifiers (like Hardware Asset Codes and Mobile Numbers) are strictly 1-to-1 mapped across the entire system.

### Automated Provisioning
Upon final HOD approval, the system executes an atomic finalization:
*   **Code Generation**: Queries the database to identify the highest existing 4-digit numeric suffix and increments it sequentially (e.g., `1001` -> `1002`).
*   **Data Synchronization**: The generated Employee Code is permanently stamped onto the `OnboardingRequest` record and synchronized with the newly minted `UserProfile`.
*   **Rich Notification**: Sends an HTML-formatted email containing full hardware/software inventory, reporting structure, and the auto-generated credentials.

---

### Frontend Architecture (React 19)
The client leverages a centralized orchestration pattern:
*   **State Reset**: Navigation logic (`handleSelectRequest`) explicitly clears the `selectedRequestId` memory when switching between workflow tabs, preventing ghost-data persistence in the Detail Panel.
*   **Admin Institutional Overrides**: Dedicated UI for Admins to manually edit and sync Employee/Asset codes directly from the Audit log.
*   **Performance**: Uses `useMemo` for complex bucket filtering and `key`-based component resets for the `HRForm` to seamlessly switch between editing an existing request and submitting a new one.

---

## 🛡️ Security & RBAC

### Role-Based Access Control
1.  **Admin**: Global read/write access. Can perform permanent database purges (cascading deletes of requests and user accounts) and manage catalogs.
2.  **HR (Department)**: Can initiate onboarding and manage corrections across all active workflows.
3.  **Manager/HOD**: Approval-focused access restricted to requests within their reporting line.
4.  **Employee**: View-only access to their personal "My Onboarding Record".

### Verification System
*   **Profile Security**: All updates to sensitive user data (Email, Phone, Password) require a 6-digit OTP sent to the verified email.
*   **Sanitized Git History**: Environment templates (`.env.example`) have been permanently rewritten and scrubbed from the repository history using `git filter-branch` to prevent secret leakage.

---

## ⚡ Performance Optimization
*   **Cascading Cleanup**: The Admin "Delete Permanently" feature utilizes Django's ORM to perform cascading deletes, cleanly purging a request and its corresponding user account in a single, safe transaction.
*   **Efficient Searching**: `matchesSearch` helper perform a case-insensitive search across a concatenated "haystack" of all relevant record fields, seamlessly integrating with sub-tab filters.
