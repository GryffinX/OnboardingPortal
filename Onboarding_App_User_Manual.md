# Onboarding Portal - User Manual

## Introduction
Welcome to the Onboarding Portal! This system allows our organization to seamlessly onboard new employees. It tracks everything from the moment HR initiates a request to the time the employee receives their laptop and completes their profile.

This manual will guide you through navigating the system based on your role, detailing the pages you can see and the features available to you.

---

## System Requirements
- **Supported Browsers:** Chrome, Firefox, Edge, Safari (latest versions).
- **Operating Systems:** Windows, macOS, Linux, iOS, Android.
- **Internet Requirements:** A stable internet connection.
- **Permissions:** You must have an assigned role to access specific dashboards.

---

## 1. Login & Access

### Logging In
1. Navigate to the Onboarding Portal URL.
2. Enter your **Email Address** and **Password**.
3. Click the **Login** button.
4. You will automatically be redirected to your specific dashboard based on your role.

![Login Page Screenshot](assets/login_page_screenshot.png)
*(Please replace with actual login page screenshot)*

### Forgot Password
1. On the login screen, click **Forgot Password?**
2. Enter your registered email address and click **Send OTP**.
3. Check your email for a 6-digit One-Time Password (OTP).
4. Enter the OTP and your new password, then click **Reset Password**.

---

## 2. Dashboard Overview (General Features)

Most roles share a common Dashboard structure categorized by Queues (Tabs):
- **Pending:** Requests awaiting your direct action.
- **WIP (Work in Progress):** Requests currently being processed by others in the chain.
- **HR Review:** (Specific to HR) Requests sent back for corrections.
- **Stopped:** Requests that have been halted or canceled.
- **Approved / Completed:** Fully processed onboarding requests.

Click on any request row in a queue to open its **Details Panel**, which allows you to perform your role-specific actions.

---

## 3. Workflow & Features by Role

### 3.1 HR Personnel (Initiators)

**Pages Visible:** HR Dashboard, New Onboarding Form, Queues (Pending, WIP, HR Review, Stopped, Approved).

**Available Features:**
- **Initiate Request:** Click the **"New Onboarding"** button to open the HR Form. Fill out the Employee Details (Name, Phone, Personal Email, Department) and select the Line Manager and HOD.
- **Edit & Resubmit:** In the **HR Review Queue**, open requests sent back by approvers due to errors, edit the details, and re-submit them.
- **Track Status:** Use the WIP and Approved tabs to monitor the progression of all submitted requests.

![HR Dashboard Screenshot](assets/hr_dashboard_screenshot.png)
*(Please replace with actual HR Dashboard screenshot showing the queue tabs and "New Onboarding" button)*

![HR Form Screenshot](assets/hr_form_screenshot.png)
*(Please replace with actual HR Form screenshot)*

### 3.2 Line Managers

**Pages Visible:** Manager Dashboard, Queues (Pending, WIP, Approved, Stopped).

**Available Features:**
- **Review Requests:** Open a request from the **Pending** tab.
- **Add Software:** View the employee's details and add **Manager Required Software** by selecting from the predefined department list.
- **Approval Actions:** Click **Approve** (sends to HOD) or **Send Back** (returns to HR for fixes, requiring a reason).

![Manager Dashboard Screenshot](assets/manager_dashboard_screenshot.png)
*(Please replace with actual Manager Dashboard screenshot showing a request details panel)*

### 3.3 Heads of Department (HOD)

**Pages Visible:** HOD Dashboard, Queues (Pending, WIP, Approved, Stopped).

**Available Features:**
- **Final Review:** Open requests approved by the Line Manager.
- **Add Comments:** Review the requested software and add any specific **HOD Comments**.
- **Approval Actions:** Click **Approve** (sends to Infra Admin), **Send Back** (returns to HR), or **Stop** (cancels the onboarding completely, requiring a reason).

![HOD Dashboard Screenshot](assets/hod_dashboard_screenshot.png)
*(Please replace with actual HOD Dashboard screenshot)*

### 3.4 Infrastructure Admins

**Pages Visible:** Infra Admin Dashboard, Queues (Pending, WIP, Approved).

**Available Features:**
- **Infrastructure Provisioning:** Open requests approved by the HOD.
- **Add Infra Software:** Select any specialized **Infrastructure Software** (e.g., VPNs, specific developer tools) needed.
- **Task Delegation:** **Assign an Infra Executive** from the dropdown list to fulfill the physical hardware requirement.
- **Approve:** Submit the form to pass the task to the Executive.

![Infra Admin Dashboard Screenshot](assets/infra_admin_dashboard_screenshot.png)
*(Please replace with actual Infra Admin Dashboard screenshot)*

### 3.5 Infrastructure Executives

**Pages Visible:** Infra Executive Dashboard, Queues (Pending, WIP, Approved).

**Available Features:**
- **Hardware Assignment:** Open requests directly assigned to you.
- **Asset Allocation:** In the **Hardware Configuration** section, select a specific **Asset Code** (Laptop) from the available company inventory.
- **Verify Specs:** Confirm the RAM, Storage, Processor, and GPU of the assigned laptop.
- **Finalize Onboarding:** Click this to complete the workflow. This automatically generates the new Employee Code and creates the employee's account.

![Infra Executive Dashboard Screenshot](assets/infra_executive_dashboard_screenshot.png)
*(Please replace with actual Infra Executive Dashboard screenshot)*

### 3.6 IT / System Admins

**Pages Visible:** Global Admin Dashboard with tabs for Users, Software Catalog, Departments, Asset Inventory, Global Requests.

**Available Features:**
- **Global View & Archiving:** View ALL requests across the system. Ability to **Archive** or **Restore** requests.
- **User Management:** Create new staff members manually, edit roles, change departments, or deactivate users.
- **Software Catalog:** Add software items, categorize them ("Pre-installed" or "Employee-installed"), and assign them to Departments.
- **Departments Management:** Create or rename organizational departments.
- **Hardware Assets:** Register new laptops (`LAP-XXXX` format) and define specifications (Model, RAM, Processor).

![Admin Dashboard - Users Screenshot](assets/admin_dashboard_users_screenshot.png)
*(Please replace with actual Admin Dashboard Users tab screenshot)*

![Admin Dashboard - Inventory Screenshot](assets/admin_dashboard_inventory_screenshot.png)
*(Please replace with actual Admin Dashboard Asset Inventory tab screenshot)*

### 3.7 New Employees (Self-Service)

**Pages Visible:** Employee Profile Page, Status Notification.

**Available Features:**
- **Acknowledge Hardware:** Log in using credentials sent to your personal email and click **Acknowledge** once you receive your device.
- **Profile Management:** Update personal details (name, phone number, password).
- **OTP Verification:** Any sensitive profile updates require an **OTP Verification** sent to your email to prevent unauthorized changes.

![Employee Profile Screenshot](assets/employee_profile_screenshot.png)
*(Please replace with actual Employee Profile dashboard screenshot)*

---

## 4. Troubleshooting & FAQ

**Q: I didn't receive my OTP email.**
A: Check your spam/junk folder. If it's still missing, verify that the email address you entered is correct. Ensure the system administrator has configured the email service correctly.

**Q: A request disappeared from my queue.**
A: It likely moved to the next stage (WIP tab) or was Sent Back to HR. Check the other tabs in your dashboard.

**Q: The system says "Invalid or gibberish text".**
A: The portal has strict security to prevent fake entries. Please use proper names and complete words without repeating letters (e.g., do not use "asdf" or "test111").

**Q: I cannot approve a request.**
A: Ensure you have filled out all required fields (like assigning an Infra Executive or selecting an Asset Code) before the Approve button becomes active.

---

## 5. Glossary

- **OTP:** One-Time Password used for security verification.
- **HOD:** Head of Department.
- **WIP:** Work in Progress.
- **Asset Code:** A unique identifier for hardware (e.g., LAP-1005).
- **JWT:** A secure token the system uses internally to keep you logged in.
