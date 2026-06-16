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
    infraAdminComment: overrides.infraAdminComment || "",
    infraAdmin: overrides.infraAdmin || null,
    infraExecutive: overrides.infraExecutive || null,
    infraSoftware: normalizeSoftwareItems(overrides.infraSoftware),
    laptopModel: overrides.laptopModel || "",
    laptopRam: overrides.laptopRam || "",
    laptopStorage: overrides.laptopStorage || "",
    laptopProcessor: overrides.laptopProcessor || "",
    laptopGpu: overrides.laptopGpu || "Integrated Graphics",
    stopReason: overrides.stopReason || "",
    reviewRequestedBy: overrides.reviewRequestedBy || "",
    reviewReason: overrides.reviewReason || "",
    revisionCount: overrides.revisionCount || 0,
    managerApprovedAt: overrides.managerApprovedAt || "",
    hodApprovedAt: overrides.hodApprovedAt || "",
    dateOfJoining: overrides.dateOfJoining || "",
    laptopAcknowledged: overrides.laptopAcknowledged || false,
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
  const regex = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]+$/;
  if (!regex.test(email)) return "Enter a valid email address (no underscores, hyphens allowed).";
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
  if (value.length < 2) return `${fieldName} must be at least 2 characters long.`;
  if (validateGibberish(value)) return `${fieldName} contains invalid or gibberish text. Please use meaningful words.`;
  return null;
}

export function validateDepartmentName(dept) {
  const fieldName = "Department Name";
  const value = dept;
  if (!value) return `${fieldName} is required.`;
  if (value.startsWith(" ") || value.endsWith(" ")) return `${fieldName} cannot start or end with a space.`;
  if (value.includes("  ")) return `${fieldName} cannot contain double spaces.`;
  if (/[%:;"'<>(){}[\]|\\~`^!*+?]/.test(value)) return `${fieldName} contains restricted special characters.`;
  if (value.length < 2) return `${fieldName} must be at least 2 characters long.`;
  if (validateGibberish(value)) return `${fieldName} contains invalid or gibberish text. Please use meaningful words.`;
  if (/[0-9]/.test(value)) return `${fieldName} cannot contain numbers.`;
  return null;
}
export function validateGibberish(value) {
  if (!value) return false;
  
  const alnumCount = (value.match(/[a-zA-Z0-9]/g) || []).length;
  // Require at least 1 alphanumeric
  if (alnumCount < 1) return true;
  // If string is long enough, require 40% alnum
  if (value.length > 3 && alnumCount / value.length < 0.4) return true;

  // Check for 4 or more identical characters in a row
  if (/([a-zA-Z0-9])\1{3,}/.test(value)) return true;

  const words = value.toLowerCase().split(/[\s,.:;!?]+/);
  const mashes = ["asdf", "qwer", "zxcv", "qwe", "asd", "zxc", "wef", "sdf", "xcv", "ert", "dfg", "cvb", "rty", "fgh", "vbn", "tyu", "ghj", "bnm", "hjkl", "uiop"];
  
  for (const word of words) {
    if (mashes.includes(word)) return true;
  }

  return false;
}

export function validateCommentInput(value, fieldName) {
  if (!value) return `${fieldName} is required.`;
  if (value.startsWith(" ") || value.endsWith(" ")) return `${fieldName} cannot start or end with a space.`;
  if (value.includes("  ")) return `${fieldName} cannot contain double spaces.`;
  if (/[<>|\\~`^*+]/.test(value)) return `${fieldName} contains restricted special characters.`;
  if (value.length > 500) return `${fieldName} must be less than 500 characters.`;
  if (validateGibberish(value)) return `${fieldName} contains invalid or gibberish text. Please use meaningful words.`;
  if (/^\d+$/.test(value)) return `${fieldName} cannot consist only of numbers.`;
  return null;
}

export function validateEmployeeCode(code) {
  if (!code) return "Employee code is required.";
  if (!/^[1-9]\d{4}$/.test(code)) return "Employee code must be exactly 5 digits and cannot start with 0.";
  return null;
}

export function validateAssetCode(code) {
  if (!code) return "Asset code is required.";
  if (!/^LAP-\d{4}$/.test(code)) return "Asset code must follow the format 'LAP-XXXX' (e.g. LAP-1001).";
  return null;
}

export function cleanNumericInput(value, maxLength) {
  const digits = value.replace(/\D/g, "");
  // Prevent leading zero if it's the first digit and not the only digit
  if (digits.length > 1 && digits.startsWith("0")) {
    return digits.slice(1, maxLength + 1);
  }
  return digits.slice(0, maxLength);
}

export function cleanTextInput(value, maxLength) {
  return value.replace(/[^a-zA-Z0-9 . -]/g, "").replace(/\s\s+/g, ' ').slice(0, maxLength);
}

export function cleanCommentInput(value, maxLength) {
  return value.replace(/[^a-zA-Z0-9 .,!?-]/g, "").replace(/\s\s+/g, ' ').slice(0, maxLength);
}

export function cleanNameInput(value, maxLength) {
  return value.replace(/[^a-zA-Z ]/g, "").slice(0, maxLength);
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
    infraAdminComment: request?.infraAdminComment || request?.infra_admin_comment || "",
    infraAdmin: request?.infraAdmin || request?.infra_admin || null,
    infraExecutive: request?.infraExecutive || request?.infra_executive || null,
    infraSoftware: normalizeSoftwareItems(
      request?.infraSoftware || request?.infra_software,
    ),
    laptopModel: request?.laptopModel || request?.laptop_model || "",
    laptopRam: request?.laptopRam || request?.laptop_ram || "",
    laptopStorage: request?.laptopStorage || request?.laptop_storage || "",
    laptopProcessor: request?.laptopProcessor || request?.laptop_processor || "",
    laptopGpu: request?.laptopGpu || request?.laptop_gpu || "",
    stopReason: request?.stopReason || request?.stop_reason || "",
    reviewRequestedBy: request?.reviewRequestedBy || request?.review_requested_by,
    reviewReason: request?.reviewReason || request?.review_reason,
    revisionCount: request?.revisionCount || request?.revision_count,
    managerApprovedAt: request?.managerApprovedAt || request?.manager_approved_at,
    hodApprovedAt: request?.hodApprovedAt || request?.hod_approved_at,
    dateOfJoining: request?.dateOfJoining || request?.date_of_joining,
    laptopAcknowledged: request?.laptopAcknowledged || request?.laptop_acknowledged,
  });

  const resolvedOfficialEmail = officialEmail || (officialEmailUser ? `${officialEmailUser}${request?.officialEmailDomain || ""}` : "");

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

  if (stage === workflowStages.infraAdmin) {
    return {
      label: "Pending Infra Admin",
      tone: "infra-admin",
      description: "Waiting for Infrastructure Admin assignment",
    };
  }

  if (stage === workflowStages.infraExecutive) {
    return {
      label: "Pending Infra Exec",
      tone: "infra-exec",
      description: "Waiting for Infrastructure Executive hardware assignment",
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
    "infrastructure admin": "Infrastructure Admin",
    "infrastructure executive": "Infrastructure Executive",
    employee: "Employee",
    hr: "HR",
  };

  return canonicalRoles[role.trim().toLowerCase()] || "Employee";
}

const WIP_STAGES = [
  workflowStages.manager,
  workflowStages.hod,
  workflowStages.hr,
  workflowStages.infraAdmin,
  workflowStages.infraExecutive,
];

function sameUserId(left, right) {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

export function isHrUser(user) {
  if (!user) return false;
  return normalizeRole(user.role) === "HR" || user.department?.trim().toUpperCase() === "HR";
}

export function isAdmin(user) {
  if (!user) return false;
  return normalizeRole(user.role) === "Admin";
}

export function isGlobalQueueViewer(user) {
  if (!user) return false;
  return isAdmin(user) || isHrUser(user);
}

export function isStaffWorkflowUser(user) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  return role === "Admin" || role === "Manager" || role === "HOD"
    || role === "Infrastructure Admin" || role === "Infrastructure Executive"
    || isHrUser(user);
}

export function getPendingStageForPage(page, pagesMap) {
  const stageByPage = {
    [pagesMap.manager]: workflowStages.manager,
    [pagesMap.hod]: workflowStages.hod,
    [pagesMap.hr]: workflowStages.hr,
    [pagesMap.infraAdmin]: workflowStages.infraAdmin,
    [pagesMap.infraExecutive]: workflowStages.infraExecutive,
    [pagesMap.submit]: workflowStages.hr,
  };
  return stageByPage[page] || null;
}

export function requestBelongsToUserScope(request, user) {
  if (!user || !request) return false;

  const role = normalizeRole(user.role);
  const name = user.name || "";
  const userId = user.id;

  if (isGlobalQueueViewer(user)) return true;

  if (role === "Manager") {
    return request.formData?.lineManager === name;
  }

  if (role === "HOD") {
    return request.formData?.hod === name;
  }

  if (role === "Infrastructure Admin") {
    if (request.stage === workflowStages.infraAdmin) {
      return !request.infraAdmin || sameUserId(request.infraAdmin.id, userId);
    }
    if ([workflowStages.infraExecutive, workflowStages.approved].includes(request.stage)) {
      return request.infraAdmin && sameUserId(request.infraAdmin.id, userId);
    }
    return false;
  }

  if (role === "Infrastructure Executive") {
    if (request.stage === workflowStages.infraExecutive) {
      return request.infraExecutive && sameUserId(request.infraExecutive.id, userId);
    }
    if (request.stage === workflowStages.approved) {
      return request.infraExecutive && sameUserId(request.infraExecutive.id, userId);
    }
    return false;
  }

  return false;
}

export function filterRequestsForUserScope(requests, user) {
  if (!user) return [];
  if (isGlobalQueueViewer(user)) return requests;
  return requests.filter((request) => requestBelongsToUserScope(request, user));
}

export function getPendingStageForUser(user, pagesMap) {
  if (!user) return null;
  if (isHrUser(user)) return workflowStages.hr;

  const role = normalizeRole(user.role);
  const pageByRole = {
    Manager: pagesMap.manager,
    HOD: pagesMap.hod,
    "Infrastructure Admin": pagesMap.infraAdmin,
    "Infrastructure Executive": pagesMap.infraExecutive,
  };
  return getPendingStageForPage(pageByRole[role], pagesMap);
}

export function applyQueueTabFilter(requests, filterKey, { user, currentPage, pagesMap }) {
  if (!filterKey) return requests;

  if (filterKey === "wip") {
    return requests.filter((r) => WIP_STAGES.includes(r.stage));
  }
  if (filterKey === "hr_review") {
    return requests.filter((r) => r.stage === workflowStages.hr);
  }
  if (filterKey === "stopped") {
    return requests.filter((r) => r.stage === workflowStages.stopped);
  }
  if (filterKey === "approved") {
    return requests.filter((r) => r.stage === workflowStages.approved);
  }
  if (filterKey === "all") {
    return requests;
  }
  if (filterKey === "pending") {
    const pendingStage = getPendingStageForPage(currentPage, pagesMap)
      || getPendingStageForUser(user, pagesMap);
    if (!pendingStage) return requests;
    return requests.filter((r) => r.stage === pendingStage);
  }

  return requests;
}

export function countPendingForPage(requests, page, pagesMap) {
  const pendingStage = getPendingStageForPage(page, pagesMap);
  if (!pendingStage) return 0;
  return requests.filter((r) => r.stage === pendingStage).length;
}

export function countPendingForUser(requests, user, pagesMap) {
  const pendingStage = getPendingStageForUser(user, pagesMap);
  if (!pendingStage) return 0;
  return requests.filter((r) => r.stage === pendingStage).length;
}
