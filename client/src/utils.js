import { workflowStages } from "./constants";

export function getTodayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeSoftwareList(csvValue) {
  return csvValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSoftwareItems(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [...fallback];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return normalizeSoftwareList(trimmed);
    }

    return normalizeSoftwareList(trimmed);
  }

  return [...fallback];
}

export function buildRequest(id, formData, overrides = {}) {
  const submittedAt = overrides.submittedAt || getTodayLabel();

  return {
    id,
    requestCode: overrides.requestCode || `ONB-${String(id).padStart(3, "0")}`,
    employeeCode: overrides.employeeCode || "",
    formData: {
      ...formData,
      lineManagerCode: overrides.lineManagerCode || "",
      hodCode: overrides.hodCode || "",
    },
    officialEmail: `${formData.officialEmailUser}${overrides.officialEmailDomain || ""}`,
    stage: overrides.stage || workflowStages.manager,
    submittedAt,
    lastUpdated: overrides.lastUpdated || submittedAt,
    additionalSoftware: normalizeSoftwareItems(overrides.additionalSoftware),
    managerSoftware: normalizeSoftwareItems(overrides.managerSoftware),
    hodSoftware: normalizeSoftwareItems(overrides.hodSoftware),
    preInstalledSoftware: normalizeSoftwareItems(overrides.preInstalledSoftware),
    employeeInstalledSoftware: normalizeSoftwareItems(overrides.employeeInstalledSoftware),
    assetCode: overrides.assetCode || "",
    hodComment: overrides.hodComment || "",
    stopReason: overrides.stopReason || "",
    reviewRequestedBy: overrides.reviewRequestedBy || "",
    reviewReason: overrides.reviewReason || "",
    revisionCount: overrides.revisionCount || 0,
    managerApprovedAt: overrides.managerApprovedAt || "",
    hodApprovedAt: overrides.hodApprovedAt || "",
  };
}

export function validateName(name) {
  if (!name) return "Name is required.";
  if (name.length < 3 || name.length > 50) return "Name must be between 3 and 50 characters.";
  if (name.startsWith(" ") || name.endsWith(" ")) return "Name cannot start or end with a space.";
  if (name.includes("  ")) return "Name cannot contain double spaces.";
  if (!/^[a-zA-Z ]+$/.test(name)) return "Name can only contain letters and spaces.";
  return null;
}

export function validateEmail(email) {
  if (!email) return "Email is required.";
  if (email.length > 100) return "Email must be less than 100 characters.";
  const regex = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+\.[a-zA-Z0-9]+$/;
  if (!regex.test(email)) return "Enter a valid email address (no underscores or special characters).";
  return null;
}

export function validateEmployeePhoneNumber(num) {
  if (!num) return "Employee phone number is required.";
  if (!/^\d+$/.test(num)) return "Employee phone number must contain only digits.";
  if (num.length !== 10) return "Employee phone number must be exactly 10 digits.";
  return null;
}

export function validateGenericInput(value, fieldName) {
  if (!value) return `${fieldName} is required.`;
  if (value.startsWith(" ") || value.endsWith(" ")) return `${fieldName} cannot start or end with a space.`;
  if (value.includes("  ")) return `${fieldName} cannot contain double spaces.`;
  if (/[%:;"'<>(){}[\]|\\~`^!*+?]/.test(value)) return `${fieldName} contains restricted special characters.`;
  return null;
}

export function normalizeRequestRecord(request, fallbackId = 0) {
  const requestCode =
    request?.requestCode ||
    request?.request_code ||
    `ONB-${String(fallbackId || 0).padStart(3, "0")}`;
  const normalizedId = Number(request?.id) || fallbackId || 0;
  const sourceFormData = request?.formData || request?.form_data || {};
  const officialEmail =
    request?.officialEmail ||
    request?.official_email ||
    "";
  const officialEmailUser =
    sourceFormData.officialEmailUser ||
    sourceFormData.official_email_user ||
    (officialEmail.includes("@") ? officialEmail.split("@")[0] : "");

  const formData = {
    name: sourceFormData.name || request?.employee_name || "",
    employeePhoneNumber: sourceFormData.employeePhoneNumber || sourceFormData.employee_phone_number || request?.employee_phone_number || "",
    personalEmail:
      sourceFormData.personalEmail ||
      sourceFormData.personal_email ||
      request?.personal_email ||
      "",
    officialEmailUser,
    department: sourceFormData.department || request?.department || "",
    lineManager:
      sourceFormData.lineManager ||
      sourceFormData.line_manager ||
      request?.line_manager ||
      "",
    hod: sourceFormData.hod || request?.hod || "",
  };

  const normalizedRequest = buildRequest(normalizedId, formData, {
    requestCode,
    employeeCode: request?.employeeCode || request?.employee_code || "",
    lineManagerCode: sourceFormData.lineManagerCode || request?.line_manager_code || "",
    hodCode: sourceFormData.hodCode || request?.hod_code || "",
    stage: request?.stage,
    submittedAt: request?.submittedAt || request?.submitted_at,
    lastUpdated: request?.lastUpdated || request?.last_updated,
    additionalSoftware: normalizeSoftwareItems(request?.additionalSoftware),
    managerSoftware: normalizeSoftwareItems(
      request?.managerSoftware || request?.manager_software,
    ),
    hodSoftware: normalizeSoftwareItems(
      request?.hodSoftware || request?.hod_software,
    ),
    preInstalledSoftware: normalizeSoftwareItems(
      request?.preInstalledSoftware || request?.pre_installed_software,
    ),
    employeeInstalledSoftware: normalizeSoftwareItems(
      request?.employeeInstalledSoftware || request?.employee_installed_software,
    ),
    assetCode: request?.assetCode || request?.asset_code || "",
    hodComment: request?.hodComment || request?.hod_comment || "",
    stopReason: request?.stopReason || request?.stop_reason || "",
    reviewRequestedBy: request?.reviewRequestedBy || request?.review_requested_by,
    reviewReason: request?.reviewReason || request?.review_reason,
    revisionCount: request?.revisionCount || request?.revision_count,
    managerApprovedAt: request?.managerApprovedAt || request?.manager_approved_at,
    hodApprovedAt: request?.hodApprovedAt || request?.hod_approved_at,
  });

  const resolvedOfficialEmail = officialEmailUser
    ? `${officialEmailUser}${request?.officialEmailDomain || ""}`
    : officialEmail;

  return {
    ...normalizedRequest,
    officialEmail: resolvedOfficialEmail,
  };
}

export function getStageMeta(stage) {
  if (stage === workflowStages.manager) {
    return {
      label: "Pending Line Manager",
      tone: "pending",
      description: "Waiting for line manager approval",
    };
  }

  if (stage === workflowStages.hod) {
    return {
      label: "Pending HOD",
      tone: "hod",
      description: "Waiting for HOD approval",
    };
  }

  if (stage === workflowStages.hr) {
    return {
      label: "HR Review",
      tone: "review",
      description: "Sent back for HR changes",
    };
  }

  if (stage === workflowStages.stopped) {
    return {
      label: "Stopped",
      tone: "stopped",
      description: "Workflow cancelled by HR",
    };
  }

  return {
    label: "Approved",
    tone: "approved",
    description: "Final approval completed",
  };
}

export function matchesSearch(request, term) {
  if (!term.trim()) {
    return true;
  }

  const haystack = [
    request.requestCode,
    request.employeeCode,
    request.formData?.name,
    request.formData?.department,
    request.formData?.lineManager,
    request.formData?.hod,
    request.assetCode,
    request.officialEmail,
    request.reviewReason,
    request.hodComment,
    request.stopReason,
    getStageMeta(request.stage).label,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term.trim().toLowerCase());
}

export function getInitialFormData() {
  return {
    name: "",
    employeePhoneNumber: "",
    personalEmail: "",
    officialEmailUser: "",
    department: "",
    lineManager: "",
    hod: "",
  };
}

export function normalizeRole(role) {
  if (typeof role !== "string") {
    return "Employee";
  }

  const canonicalRoles = {
    admin: "Admin",
    manager: "Manager",
    hod: "HOD",
    employee: "Employee",
  };

  return canonicalRoles[role.trim().toLowerCase()] || "Employee";
}
