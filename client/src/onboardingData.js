export const departmentDirectory = {
  IT: {
    managers: ["Bharat Sinha"],
    hods: ["Anjali Mehta","J. Prasanna Kumar"],
  },
  HR: {
    managers: ["Priya Sharma", "Neha Kapoor"],
    hods: ["Rohit Nair"],
  },
  BGV: {
    managers: ["Amit Verma"],
    hods: ["Sneha Iyer"],
  },
};

export const officialEmailDomain = "@securitas-india.com";

export const preInstalledSoftware = [
  "Windows 11 Enterprise",
  "Microsoft 365",
  "SentinelOne",
  "Cisco AnyConnect VPN",
  "Google Chrome",
  "Zoom Workplace",
];

export const employeeInstalledSoftware = [
  "Slack",
  "Git",
  "Visual Studio Code",
  "Postman",
];

export function getInitialFormData() {
  return {
    name: "",
    personalEmail: "",
    officialEmailUser: "",
    department: "",
    lineManager: "",
    hod: "",
  };
}

export function getAllManagers() {
  return Object.values(departmentDirectory).flatMap(
    (department) => department.managers,
  );
}

export function getAllHods() {
  return Object.values(departmentDirectory).flatMap(
    (department) => department.hods,
  );
}
