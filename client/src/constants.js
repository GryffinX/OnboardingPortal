export const pages = {
  submit: "submit",
  login: "login",
  manager: "manager",
  hod: "hod",
  infraAdmin: "infra_admin",
  infraExecutive: "infra_executive",
  hr: "hr",
  admin: "admin",
  status: "status",
  requests: "requests",
};

export const workflowStages = {
  manager: "manager_review",
  hod: "hod_review",
  infraAdmin: "infra_admin_review",
  infraExecutive: "infra_executive_review",
  hr: "hr_review",
  approved: "approved",
  stopped: "stopped",
};

export const pageOptions = [
  { key: pages.submit, label: "HR Dashboard" },
  { key: pages.login, label: "Staff Login" },
  { key: pages.manager, label: "Line Manager" },
  { key: pages.hod, label: "HOD" },
  { key: pages.infraAdmin, label: "Infra Admin" },
  { key: pages.infraExecutive, label: "Infra Exec" },
  { key: pages.requests, label: "All Requests" },
  { key: pages.admin, label: "Admin" },
  { key: pages.status, label: "My Status" },
  { key: "my-profile", label: "My Profile" },
];

export const rolePermissions = {
  Admin: [pages.admin],
  Manager: [pages.manager],
  HOD: [pages.hod],
  "Infrastructure Admin": [pages.infraAdmin],
  "Infrastructure Executive": [pages.infraExecutive],
  Employee: [pages.status],
};

export const STAFF_WORKFLOW_ROLES = [
  "Admin",
  "Manager",
  "HOD",
  "Infrastructure Admin",
  "Infrastructure Executive",
  "HR",
];

export const globalQueueFilters = [
  { key: "wip", label: "In Progress" },
  { key: "hr_review", label: "HR Review" },
  { key: "stopped", label: "Stopped" },
  { key: "approved", label: "Approved" },
];

export const roleQueueFilters = [
  { key: "pending", label: "Pending Review" },
  { key: "approved", label: "Completed" },
  { key: "all", label: "All Mine" },
];
