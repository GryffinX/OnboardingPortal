export const pages = {
  submit: "submit",
  manager: "manager",
  hod: "hod",
  hr: "hr",
  admin: "admin",
  status: "status",
};

export const workflowStages = {
  manager: "manager_review",
  hod: "hod_review",
  hr: "hr_review",
  approved: "approved",
};

export const pageOptions = [
  { key: pages.submit, label: "Submit Form" },
  { key: pages.manager, label: "Line Manager" },
  { key: pages.hod, label: "HOD" },
  { key: pages.hr, label: "HR Review" },
  { key: pages.admin, label: "Admin" },
  { key: pages.status, label: "My Status" },
];

export const rolePermissions = {
  Admin: [pages.admin],
  HR: [pages.submit, pages.hr],
  Manager: [pages.manager],
  HOD: [pages.hod],
  Employee: [pages.status],
};
