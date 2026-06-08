export const pages = {
  submit: "submit",
  login: "login",
  manager: "manager",
  hod: "hod",
  hr: "hr",
  admin: "admin",
  status: "status",
  requests: "requests",
};

export const workflowStages = {
  manager: "manager_review",
  hod: "hod_review",
  hr: "hr_review",
  approved: "approved",
  stopped: "stopped",
};

export const pageOptions = [
  { key: pages.submit, label: "Onboarding Form" },
  { key: pages.login, label: "Staff Login" },
  { key: pages.manager, label: "Line Manager" },
  { key: pages.hod, label: "HOD" },
  { key: pages.hr, label: "HR Review" },
  { key: pages.requests, label: "All Requests" },
  { key: pages.admin, label: "Admin" },
  { key: pages.status, label: "My Status" },
  { key: "my-profile", label: "My Profile" },
];

export const rolePermissions = {
  Admin: [pages.admin],
  Manager: [pages.manager],
  HOD: [pages.hod],
  Employee: [pages.status],
};
