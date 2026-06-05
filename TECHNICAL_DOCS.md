# Technical Documentation & Workflow

This document provides a comprehensive deep dive into the technical architecture, implementation details, and usage patterns of the Onboarding-App.

---

## 🔄 Business Workflow & State Machine

The application implements a linear workflow for onboarding approval, managed through a "Stage" state in the frontend.

### Workflow Stages
1.  **`manager_review`**: Initial state after HR submission.
2.  **`hod_review`**: Set after Line Manager approval.
3.  **`hr_review`**: A "correction" state if a Manager or HOD sends the request back to HR.
4.  **`approved`**: Final state after HOD approval, triggering account creation.

### The Approval loop & "Back-loop" Logic
*   **Linear Flow**: Approve -> Moves to next logical stage.
*   **The Back-loop**: Implemented as a closed-loop feedback system. When a Manager or HOD triggers an "HR Review" action, a `reason` string is required. This reason is persisted and displayed specifically to the HR user, ensuring corrective actions are context-aware. HR must then "Re-submit" to return the request to the `manager_review` stage.

---

## 🛠️ Implementation Details

### Frontend Architecture (React 19)
The client uses a **Service-Oriented Component** architecture focused on composition:

#### 1. State Orchestration (Lifting State Up)
*   **Central State Hub**: `App.jsx` manages global states like `isAuthenticated`, `currentUser`, and the master `requests` list.
*   **Consistency**: By lifting state to the top level, we ensure that actions (like deleting a user or approving a request) result in instant, consistent updates across all UI components (Sidebars, Tables, Detail Panels) without complex synchronization.
*   **Persistence**: Uses `useRef` for tracking unique Request IDs (`nextRequestId`) to maintain sequence across component re-renders.

#### 2. API Abstraction (Service Layer)
*   **Implementation**: A singleton object `api` in `src/services/api.js` encapsulates all `fetch` logic.
*   **Centralization**: This layer handles:
    *   **Base URL Management**: Automatically switches between local development and production environments.
    *   **Header Configuration**: Ensures standardized JSON headers are always present.
    *   **Response Normalization**: Returns a consistent `{ ok, data }` object, significantly reducing `try/catch` boilerplate in UI components.

#### 3. Component Architecture & UI Enhancements
The UI is decomposed into specialized components to improve maintainability and performance:
*   **`AdminDashboard.jsx`**: Manages user lifecycle. It features a **custom deletion confirmation modal** that provides a clear warning and detailed user info before performing irreversible actions, replacing native browser dialogs.
*   **`RequestDetailPanel.jsx`**: A context-aware panel for request reviews. It implements a **custom HR Review Modal** to gather detailed corrective feedback reasons, ensuring a professional and consistent user experience.
*   **`HRForm.jsx`**: A versatile form used for both initial data entry and the "Edit & Re-submit" workflow.

---

### Backend Architecture (Django 5)
The server uses a **Modular Monolith** approach for its API layer:

#### 1. Modular View Routing (`onboarding/views/`)
Logic is partitioned into a package-based structure to prevent bottlenecks:
*   **`auth.py`**: Handles security via Django's `authenticate` primitives and a custom OTP model for 10-minute recovery windows.
*   **`users.py`**: Manages identity and cascaded deletion logic for the `User` and `UserProfile` models.
*   **`onboarding.py`**: Contains the core business logic, including the **Atomic Finalization** process.

#### 2. Atomic Finalization Logic
The `finalize_onboarding` method is implemented to perform three critical actions atomically:
1.  **Identity Creation**: Validates email uniqueness and creates a new Django `User`.
2.  **Profile Linking**: Automatically instantiates the `UserProfile` and links it to the correct `Department`.
3.  **Credential Dispatch**: Generates a high-entropy 10-character password and dispatches it via SMTP.

#### 3. Custom Middleware & "Headless" Support
*   **`SimpleCORSMiddleware`**: Essential for the app's headless setup. It intercepts every request to inject `Access-Control-Allow-*` headers, allowing the React frontend to securely communicate with the API across different ports.
*   **Preflight Handling**: Correctly manages HTTP `OPTIONS` requests, returning a `204 No Content` to satisfy modern browser security protocols.

---

## 🛡️ Security & RBAC

### Data Integrity
*   **Password Hashing**: Utilizes Django's **PBKDF2 with SHA256**. This industry-standard method uses thousands of iterations and unique salts per user, providing robust protection against rainbow table and GPU-based brute-force attacks.
*   **Regex Validation**: Enforced at the API level for personal emails and official email usernames.

### Role-Based Access Control (RBAC)
Enforced at two distinct levels:
1.  **UI Level**: Conditional rendering of the navigation bar and action buttons (like `Approve` or `Delete`) based on `currentUser.role`.
2.  **Data Level**: Roles are stored in the `UserProfile` model and verified by the backend during the authentication phase to return the appropriate permission set.

---

## 🚀 How It Is Used (Role-Based Guide)

### 🔑 Admin
*   **Usage**: Manage the portal's user base. Can create, edit, and delete users via the User Management dashboard.
*   **Implementation**: Accessible only to users where `role === "Admin"`.

### 📝 HR
*   **Usage**: Initiates onboarding and monitors the "HR Review" queue for corrective feedback.
*   **Implementation**: Accessible to `HR` and `Admin` roles.

### 👥 Line Manager & HOD
*   **Usage**: Domain-specific reviewers. Managers focus on software requirements, while HODs act as the final gatekeepers for approval and account provisioning.

### 👤 Employee
*   **Usage**: View-only access to their specific onboarding record and final software setup.

---

## ⚡ Performance Optimization

### Frontend
*   **Code Splitting**: Major routes like `AdminDashboard`, `HRForm`, and `Login` are **lazy-loaded** using `React.lazy` and `Suspense`. This reduces the initial JavaScript bundle size, leading to faster First Contentful Paint (FCP).
*   **Memoization**: Expensive computations (filtering, searching, and sorting the `requests` list) are wrapped in `useMemo`. This ensures that these operations only re-run when their specific dependencies (`requests`, `searchTerm`, etc.) change, preventing UI lag during rapid input.
*   **Component Composition**: Highly modular components prevent the "God Component" anti-pattern and limit the scope of re-renders.

### Backend
*   **Database Indexing**: Key lookup columns like `UserProfile.role` and `PasswordResetOTP.email` are explicitly **indexed** (`db_index=True`). This reduces query execution time from linear to logarithmic, essential for scalability.
*   **Optimized Queries**: The `get_users` API uses `select_related('profile', 'profile__department')` to perform an SQL JOIN, avoiding the "N+1 query problem" and fetching all necessary data in a single round-trip.
*   **Atomic Operations**: Critical business logic (like user creation during finalization) is kept lean to ensure fast API response times.
