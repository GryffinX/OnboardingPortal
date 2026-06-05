import { workflowStages } from "./constants";
import {
  employeeInstalledSoftware,
  officialEmailDomain,
  preInstalledSoftware,
} from "./onboardingData";

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

export function buildRequest(id, formData, overrides = {}) {
  const submittedAt = overrides.submittedAt || getTodayLabel();

  return {
    id,
    requestCode: overrides.requestCode || `ONB-${String(id).padStart(3, "0")}`,
    formData: {
      ...formData,
    },
    officialEmail: `${formData.officialEmailUser}${officialEmailDomain}`,
    stage: overrides.stage || workflowStages.manager,
    submittedAt,
    lastUpdated: overrides.lastUpdated || submittedAt,
    additionalSoftware: overrides.additionalSoftware || [],
    managerSoftware: overrides.managerSoftware || [],
    hodSoftware: overrides.hodSoftware || [],
    preInstalledSoftware: overrides.preInstalledSoftware || preInstalledSoftware,
    employeeInstalledSoftware:
      overrides.employeeInstalledSoftware || employeeInstalledSoftware,
    reviewRequestedBy: overrides.reviewRequestedBy || "",
    reviewReason: overrides.reviewReason || "",
    revisionCount: overrides.revisionCount || 0,
    managerApprovedAt: overrides.managerApprovedAt || "",
    hodApprovedAt: overrides.hodApprovedAt || "",
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
    request.formData.name,
    request.formData.department,
    request.formData.lineManager,
    request.formData.hod,
    request.officialEmail,
    getStageMeta(request.stage).label,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term.trim().toLowerCase());
}
