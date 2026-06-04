import { useEffect, useRef, useState } from "react";
import "./App.css";
import HRForm from "./HRForm";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import {
  employeeInstalledSoftware,
  getAllHods,
  getAllManagers,
  officialEmailDomain,
  preInstalledSoftware,
} from "./onboardingData";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const pages = {
  submit: "submit",
  manager: "manager",
  hod: "hod",
  hr: "hr",
  admin: "admin",
  status: "status",
};

const workflowStages = {
  manager: "manager_review",
  hod: "hod_review",
  hr: "hr_review",
  approved: "approved",
};

const pageOptions = [
  { key: pages.submit, label: "Submit Form" },
  { key: pages.manager, label: "Line Manager" },
  { key: pages.hod, label: "HOD" },
  { key: pages.hr, label: "HR Review" },
  { key: pages.admin, label: "Admin" },
  { key: pages.status, label: "My Status" },
];

const rolePermissions = {
  Admin: [pages.admin],
  HR: [pages.submit, pages.hr],
  Manager: [pages.manager],
  HOD: [pages.hod],
  Employee: [pages.status],
};

const managerActors = getAllManagers();
const hodActors = getAllHods();

function getTodayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeSoftwareList(csvValue) {
  return csvValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRequest(id, formData, overrides = {}) {
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

const seededRequests = [
  buildRequest(
    101,
    {
      name: "Rahul Kapoor",
      personalEmail: "rahul.kapoor@example.com",
      officialEmailUser: "rahul.kapoor",
      department: "IT",
      lineManager: "Bharat Sinha",
      hod: "Anjali Mehta",
    },
    {
      requestCode: "ONB-101",
      submittedAt: "03 Jun 2026",
      stage: workflowStages.manager,
      additionalSoftware: ["Docker Desktop", "Notepad++"],
    },
  ),
  buildRequest(
    102,
    {
      name: "Meera Das",
      personalEmail: "meera.das@example.com",
      officialEmailUser: "meera.das",
      department: "IT",
      lineManager: "Bharat Sinha",
      hod: "Anjali Mehta",
    },
    {
      requestCode: "ONB-102",
      submittedAt: "02 Jun 2026",
      stage: workflowStages.hod,
      additionalSoftware: ["Power BI Desktop"],
      managerApprovedAt: "02 Jun 2026",
    },
  ),
  buildRequest(
    103,
    {
      name: "Sanya Nair",
      personalEmail: "sanya.nair@example.com",
      officialEmailUser: "sanya.nair",
      department: "HR",
      lineManager: "Priya Sharma",
      hod: "Rohit Nair",
    },
    {
      requestCode: "ONB-103",
      submittedAt: "01 Jun 2026",
      stage: workflowStages.hr,
      additionalSoftware: ["Canva", "Adobe Acrobat"],
      reviewRequestedBy: "HOD",
      reviewReason: "Please verify the personal email domain.",
      revisionCount: 1,
      managerApprovedAt: "01 Jun 2026",
    },
  ),
];

function getStageMeta(stage) {
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

function matchesSearch(request, term) {
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

function AppNotice({ notice, onClear }) {
  useEffect(() => {
    if (!notice) return;
    
    const timer = setTimeout(() => {
      onClear();
    }, 5000);

    return () => clearTimeout(timer);
  }, [notice, onClear]);

  if (!notice) {
    return null;
  }

  return (
    <div className={`app-notice app-notice-${notice.type}`}>
      <div className="app-notice-content">
        <div className="app-notice-text">
          <strong>{notice.title}</strong>
          <p>{notice.message}</p>
        </div>
        <button type="button" className="ghost-button app-notice-close" onClick={onClear}>
          ✕
        </button>
      </div>
      <div className="app-notice-progress">
        <div className="app-notice-progress-bar"></div>
      </div>
    </div>
  );
}

function SummaryStrip({ requests }) {
  const managerPending = requests.filter(
    (request) => request.stage === workflowStages.manager,
  ).length;
  const hodPending = requests.filter(
    (request) => request.stage === workflowStages.hod,
  ).length;
  const hrReview = requests.filter(
    (request) => request.stage === workflowStages.hr,
  ).length;

  return (
    <section className="summary-strip">
      <div className="summary-card">
        <span>Line Manager Queue</span>
        <strong>{managerPending}</strong>
      </div>
      <div className="summary-card">
        <span>HOD Queue</span>
        <strong>{hodPending}</strong>
      </div>
      <div className="summary-card">
        <span>HR Review Queue</span>
        <strong>{hrReview}</strong>
      </div>
    </section>
  );
}

function RequestTable({
  title,
  subtitle,
  actorLabel,
  actorValue,
  actorOptions,
  onActorChange,
  searchTerm,
  onSearchChange,
  requests,
  selectedRequestId,
  onSelectRequest,
}) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {actorOptions ? (
          <label className="dashboard-actor">
            <span>{actorLabel}</span>
            <select value={actorValue} onChange={(event) => onActorChange(event.target.value)}>
              {actorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="dashboard-toolbar">
        <input
          className="dashboard-search"
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by request ID, employee, department, or status"
        />
      </div>

      <div className="request-table">
        <div className="request-row request-row-header">
          <span>Request Details</span>
          <span>Department</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {requests.length === 0 ? (
          <div className="request-empty">
            No requests match this dashboard view yet.
          </div>
        ) : (
          requests.map((request) => {
            const stageMeta = getStageMeta(request.stage);

            return (
              <div
                key={request.id}
                className={`request-row ${selectedRequestId === request.id ? "request-row-active" : ""}`}
              >
                <div>
                  <strong>{request.formData.name}</strong>
                  <small>{request.requestCode}</small>
                </div>
                <span>{request.formData.department}</span>
                <span>{request.submittedAt}</span>
                <span className={`status-pill status-pill-${stageMeta.tone}`}>
                  {stageMeta.label}
                </span>
                <button
                  type="button"
                  className="table-action"
                  onClick={() => onSelectRequest(request.id)}
                >
                  View Request
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function SoftwareSection({ title, tone, items, headerLabel }) {
  if (!items || items.length === 0) return null;
  return (
    <section className={`software-card software-card-${tone}`}>
      {headerLabel && <div className="software-card-header">{headerLabel}</div>}
      <div>
        <h4>{title}</h4>
        <p>{items.join(", ")}</p>
      </div>
    </section>
  );
}

function RequestDetailPanel({
  request,
  role,
  onApprove,
  onSendToHr,
  onSaveSoftware,
  onStartHrEdit,
}) {
  const [softwareDraft, setSoftwareDraft] = useState("");

  useEffect(() => {
    // Determine draft based on current role
    if (role === pages.manager) {
      setSoftwareDraft(request?.managerSoftware?.join(", ") || "");
    } else if (role === pages.hod) {
      setSoftwareDraft(request?.hodSoftware?.join(", ") || "");
    } else {
      setSoftwareDraft("");
    }
  }, [request, role]);

  if (!request) {
    return (
      <aside className="detail-panel">
        <div className="detail-empty">
          Select a request to view the complete onboarding details.
        </div>
      </aside>
    );
  }

  const stageMeta = getStageMeta(request.stage);
  const isManagerStep = role === pages.manager && request.stage === workflowStages.manager;
  const isHodStep = role === pages.hod && request.stage === workflowStages.hod;
  const isHrStep = role === pages.hr && request.stage === workflowStages.hr;
  const canAct = isManagerStep || isHodStep;

  return (
    <aside className="detail-panel">
      <div className="detail-top">
        <div>
          <h3>{request.formData.name}</h3>
          <p>{request.requestCode}</p>
        </div>
        <span className={`status-pill status-pill-${stageMeta.tone}`}>
          {stageMeta.label}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Personal Email</span>
          <strong>{request.formData.personalEmail}</strong>
        </div>
        <div>
          <span>Official Email</span>
          <strong>{request.officialEmail}</strong>
        </div>
        <div>
          <span>Line Manager</span>
          <strong>{request.formData.lineManager}</strong>
        </div>
        <div>
          <span>HOD</span>
          <strong>{request.formData.hod}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{request.formData.department}</strong>
        </div>
        <div>
          <span>Revision Count</span>
          <strong>{request.revisionCount}</strong>
        </div>
      </div>

      <SoftwareSection
        title="Pre-installed on company laptop"
        tone="blue"
        items={request.preInstalledSoftware}
      />

      <SoftwareSection
        title="To be installed by employee"
        tone="yellow"
        items={request.employeeInstalledSoftware}
      />

      <SoftwareSection
        title="Software listed by Line Manager"
        tone="orange"
        items={request.managerSoftware}
        headerLabel={request.formData.lineManager}
      />

      <SoftwareSection
        title="Software listed by HOD"
        tone="black"
        items={request.hodSoftware}
        headerLabel={request.formData.hod}
      />

      {canAct && (
        <section className="software-input-card">
          <h4>Add/Edit Software List</h4>
          <p>
            {role === pages.manager 
              ? "List any additional software needed for this employee." 
              : "Review or add more software to the HOD software list."}
          </p>
          <textarea
            value={softwareDraft}
            onChange={(event) => setSoftwareDraft(event.target.value)}
            placeholder="Example: Tableau, Figma, Adobe Acrobat"
          />
          <div className="detail-actions detail-actions-compact">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onSaveSoftware(request.id, normalizeSoftwareList(softwareDraft), role)}
            >
              Save My Software List
            </button>
          </div>
        </section>
      )}

      {request.reviewReason ? (
        <div className="review-banner" style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", color: "#92400e" }}>
          <strong>Reason for HR Review:</strong>
          <p style={{ marginTop: "4px" }}>{request.reviewReason}</p>
          <small style={{ display: "block", marginTop: "8px", opacity: 0.8 }}>Requested by: {request.reviewRequestedBy}</small>
        </div>
      ) : null}

      {canAct ? (
        <div className="detail-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onApprove(request.id)}
          >
            {role === pages.manager ? "Approve & Send to HOD" : "Approve Request"}
          </button>
          <button
            type="button"
            className="warning-button"
            onClick={() => {
              const reason = window.prompt("Please provide a reason for sending back to HR:");
              if (reason !== null && reason.trim() !== "") {
                onSendToHr(request.id, role === pages.manager ? "Line Manager" : "HOD", reason);
              } else if (reason !== null) {
                alert("A reason is required to send back to HR.");
              }
            }}
          >
            HR Review
          </button>
        </div>
      ) : null}

      {isHrStep ? (
        <div className="detail-actions">
          <button type="button" className="primary-button" onClick={() => onStartHrEdit(request.id)}>
            Edit and Re-submit
          </button>
        </div>
      ) : null}

      {!canAct && !isHrStep ? (
        <p className="detail-note">{stageMeta.description}</p>
      ) : null}
    </aside>
  );
}

function App() {
  const nextRequestId = useRef(104);
  const [currentPage, setCurrentPage] = useState(pages.submit);
  const [requests, setRequests] = useState(seededRequests);
  const [managerActor, setManagerActor] = useState(managerActors[0]);
  const [hodActor, setHodActor] = useState(hodActors[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(seededRequests[0]?.id || null);
  const [editingHrRequestId, setEditingHrRequestId] = useState(null);
  const [notice, setNotice] = useState(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === "Admin") {
      fetchUsers();
    }
  }, [isAuthenticated, currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/users`);
      const data = await response.json();
      if (response.ok) {
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        
        // Set initial page based on role
        if (data.user.role === "Admin") setCurrentPage(pages.admin);
        else if (data.user.role === "HR") setCurrentPage(pages.submit);
        else if (data.user.role === "Manager") setCurrentPage(pages.manager);
        else if (data.user.role === "HOD") setCurrentPage(pages.hod);
        else setCurrentPage(pages.status);

        showNotice("success", "Login Successful", `Welcome back, ${data.user.name}!`);
      } else {
        showNotice("error", "Login Failed", data.message || "Invalid email or password.");
      }
    } catch (error) {
      showNotice("error", "Error", "Unable to reach the server.");
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Unable to reach the server." };
    }
  };

  const handleVerifyOtp = async (email, otp) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Unable to reach the server." };
    }
  };

  const handleResetPassword = async (email, otp, newPassword) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, password: newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Unable to reach the server." };
    }
  };

  const handleAddUser = async (user) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showNotice("success", "User Created", data.message);
        fetchUsers(); // Refresh the list
      } else {
        showNotice("error", "Failed to Create User", data.message);
      }
    } catch (error) {
      showNotice("error", "Error", "Unable to reach the server.");
    }
  };

  const handleUpdateUser = async (user) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/update-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showNotice("success", "User Updated", data.message);
        fetchUsers(); // Refresh the list
      } else {
        showNotice("error", "Failed to Update User", data.message);
      }
    } catch (error) {
      showNotice("error", "Error", "Unable to reach the server.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage(pages.submit);
    showNotice("warning", "Logged Out", "You have been successfully logged out.");
  };

  async function sendOnboardingMail(formData) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/onboarding-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          ok: false,
          message: payload.message || "Unable to submit the form.",
          errors: payload.errors || {},
        };
      }

      return {
        ok: true,
        message: payload.message || "Mail sent successfully",
      };
    } catch {
      return {
        ok: false,
        message: "Unable to reach the mail service.",
      };
    }
  }

  function addRequest(formData) {
    const request = buildRequest(nextRequestId.current, formData, {
      submittedAt: getTodayLabel(),
      lastUpdated: getTodayLabel(),
      requestCode: `ONB-${String(nextRequestId.current).padStart(3, "0")}`,
    });

    nextRequestId.current += 1;
    setRequests((currentRequests) => [request, ...currentRequests]);
    setSelectedRequestId(request.id);
    setManagerActor(formData.lineManager);
    setHodActor(formData.hod);

    showNotice(
      "success",
      "Request added to workflow",
      `${request.formData.name} is now waiting for line manager review.`,
    );
  }

  function updateRequest(requestId, updater, successNotice) {
    let updatedRequest = null;

    setRequests((currentRequests) =>
      currentRequests.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        updatedRequest = updater(request);
        return updatedRequest;
      }),
    );

    if (updatedRequest && successNotice) {
      showNotice(successNotice.type, successNotice.title, successNotice.message(updatedRequest));
    }
  }

  function handleManagerApprove(requestId) {
    updateRequest(
      requestId,
      (request) => ({
        ...request,
        stage: workflowStages.hod,
        lastUpdated: getTodayLabel(),
        managerApprovedAt: getTodayLabel(),
        reviewRequestedBy: "",
      }),
      {
        type: "success",
        title: "Moved to HOD queue",
        message: (request) =>
          `${request.formData.name} is now ready for HOD approval.`,
      },
    );
  }

  async function handleHodApprove(requestId) {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/finalize-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: request.formData.name,
          email: request.formData.personalEmail,
          department: request.formData.department
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        showNotice("error", "Automation Failed", data.message || "Failed to create user account.");
        return;
      }
      
      updateRequest(
        requestId,
        (req) => ({
          ...req,
          stage: workflowStages.approved,
          lastUpdated: getTodayLabel(),
          hodApprovedAt: getTodayLabel(),
          reviewRequestedBy: "",
        }),
        {
          type: "success",
          title: "Request fully approved",
          message: (req) =>
            `${req.formData.name} has completed onboarding. ${data.password ? `Default Password: ${data.password}` : ""}`,
        },
      );
    } catch (err) {
      showNotice("error", "Network Error", "Unable to reach the server to finalize onboarding.");
    }
  }

  function handleSendToHr(requestId, actorLabel, reason) {
    if (!reason || !reason.trim()) {
      showNotice("error", "Required", "Please provide a reason for HR review.");
      return;
    }
    updateRequest(
      requestId,
      (request) => ({
        ...request,
        stage: workflowStages.hr,
        lastUpdated: getTodayLabel(),
        reviewRequestedBy: actorLabel,
        reviewReason: reason,
      }),
      {
        type: "warning",
        title: "Sent back to HR",
        message: (request) =>
          `${request.formData.name} now needs HR review and re-submission.`,
      },
    );
    setCurrentPage(pages.hr);
    setSelectedRequestId(requestId);
  }

  function handleSaveSoftware(requestId, additionalSoftware, role) {
    updateRequest(
      requestId,
      (request) => {
        const update = {};
        if (role === pages.manager) update.managerSoftware = additionalSoftware;
        if (role === pages.hod) update.hodSoftware = additionalSoftware;
        
        return {
          ...request,
          ...update,
          lastUpdated: getTodayLabel(),
        };
      },
      {
        type: "success",
        title: "Software list updated",
        message: (request) =>
          `Software list updated by ${role === pages.manager ? "Manager" : "HOD"} for ${request.formData.name}.`,
      },
    );
  }

  function handleHrEditStart(requestId) {
    setEditingHrRequestId(requestId);
  }

  function handleHrEditCancel() {
    setEditingHrRequestId(null);
  }

  function handleHrResubmitSuccess(submittedData) {
    updateRequest(
      editingHrRequestId,
      (request) => ({
        ...request,
        formData: {
          ...submittedData,
        },
        officialEmail: `${submittedData.officialEmailUser}${officialEmailDomain}`,
        stage: workflowStages.manager,
        lastUpdated: getTodayLabel(),
        reviewRequestedBy: "",
        revisionCount: request.revisionCount + 1,
      }),
      {
        type: "success",
        title: "Request re-submitted",
        message: (request) =>
          `${request.formData.name} has been sent back to line manager and HOD with the updated form and mail notification.`,
      },
    );

    setManagerActor(submittedData.lineManager);
    setHodActor(submittedData.hod);
    setEditingHrRequestId(null);
  }

  function getRequestsForPage() {
    if (currentPage === pages.manager) {
      return requests.filter(
        (request) =>
          request.formData.lineManager === managerActor &&
          matchesSearch(request, searchTerm),
      );
    }

    if (currentPage === pages.hod) {
      return requests.filter(
        (request) =>
          request.formData.hod === hodActor && matchesSearch(request, searchTerm),
      );
    }

    if (currentPage === pages.hr) {
      return requests.filter(
        (request) =>
          request.stage === workflowStages.hr && matchesSearch(request, searchTerm),
      );
    }

    return requests.filter((request) => matchesSearch(request, searchTerm));
  }

  const visibleRequests = getRequestsForPage().sort((left, right) => right.id - left.id);
  const selectedRequest =
    visibleRequests.find((request) => request.id === selectedRequestId) ||
    visibleRequests[0] ||
    null;
  const hrEditingRequest =
    requests.find((request) => request.id === editingHrRequestId) || null;

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-block">
            <div className="brand-badge">OA</div>
            <div>
              <small>ONBOARDING CONTROL</small>
              <strong>Portal Access</strong>
            </div>
          </div>
        </header>
        <main className="app-main">
          <AppNotice notice={notice} onClear={() => setNotice(null)} />
          <Login 
            onLogin={handleLogin} 
            onForgotPassword={handleForgotPassword}
            onVerifyOtp={handleVerifyOtp}
            onResetPassword={handleResetPassword}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-badge">OA</div>
          <div>
            <small>ONBOARDING CONTROL</small>
            <strong>Workflow Testing Client</strong>
          </div>
        </div>

        <nav className="app-nav">
          {pageOptions
            .filter((opt) => rolePermissions[currentUser?.role]?.includes(opt.key))
            .map((pageOption) => (
              <button
                key={pageOption.key}
                type="button"
                className={currentPage === pageOption.key ? "nav-pill nav-pill-active" : "nav-pill"}
                onClick={() => {
                  setCurrentPage(pageOption.key);
                  setSearchTerm("");
                }}
              >
                {pageOption.label}
              </button>
            ))}
          <button
            type="button"
            className="nav-pill"
            onClick={handleLogout}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentPage !== pages.admin && <SummaryStrip requests={requests} />}
        <AppNotice notice={notice} onClear={() => setNotice(null)} />

        {currentPage === pages.admin ? (
          <AdminDashboard users={allUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} apiBaseUrl={apiBaseUrl} />
        ) : null}

        {currentPage === pages.status ? (
          <section className="dashboard-panel">
            <div className="dashboard-head">
              <div>
                <h2>My Onboarding Record</h2>
                <p>View your completed onboarding details and software setup</p>
              </div>
            </div>
            {(() => {
              const myRequest = requests.find(
                (r) => r.formData.personalEmail === currentUser.email || r.officialEmail === currentUser.email
              );
              
              if (!myRequest) {
                return (
                  <div className="request-empty">
                    No onboarding record found for your account email ({currentUser.email}).
                  </div>
                );
              }

              if (myRequest.stage !== workflowStages.approved) {
                return (
                  <div className="status-container" style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "16px", marginTop: "24px" }}>
                    <div style={{ marginBottom: "24px" }}>
                      <span className={`status-pill status-pill-${getStageMeta(myRequest.stage).tone}`} style={{ fontSize: "1.2rem", padding: "12px 24px" }}>
                        {getStageMeta(myRequest.stage).label}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "8px" }}>{myRequest.formData.name}</h3>
                    <p style={{ color: "#64748b", marginBottom: "32px" }}>Onboarding in progress...</p>
                    <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "left", background: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      <p style={{ margin: "0", color: "#475569" }}>{getStageMeta(myRequest.stage).description}</p>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="status-record-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
                  <div className="record-card" style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 16px", color: "#1e293b" }}>Employee Details</h4>
                    <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
                      <div><span>Name</span><strong>{myRequest.formData.name}</strong></div>
                      <div><span>Official Email</span><strong>{myRequest.officialEmail}</strong></div>
                      <div><span>Department</span><strong>{myRequest.formData.department}</strong></div>
                      <div><span>Joining Date</span><strong>{myRequest.submittedAt}</strong></div>
                    </div>
                  </div>

                  <div className="software-summary">
                    <SoftwareSection title="Company Provided" tone="blue" items={myRequest.preInstalledSoftware} />
                    <SoftwareSection title="To Be Installed" tone="yellow" items={myRequest.employeeInstalledSoftware} />
                    <SoftwareSection title="Manager Recommended" tone="orange" items={myRequest.managerSoftware} headerLabel={myRequest.formData.lineManager} />
                    <SoftwareSection title="HOD Recommended" tone="black" items={myRequest.hodSoftware} headerLabel={myRequest.formData.hod} />
                  </div>
                </div>
              );
            })()}
          </section>
        ) : null}

        {currentPage === pages.submit ? (
          <HRForm
            onSubmitForm={sendOnboardingMail}
            onSuccess={addRequest}
            successPrimaryMessage="Successfully submitted."
            subtitle="Create a new onboarding request. It will enter the line manager queue first, then move to HOD approval."
            apiBaseUrl={apiBaseUrl}
          />
        ) : null}

        {currentPage === pages.manager ? (
          <section className="dashboard-layout">
            <RequestTable
              title="Line Manager Dashboard"
              subtitle="Track requests assigned to a specific line manager and move them forward to HOD or back to HR."
              actorLabel="Acting as"
              actorValue={managerActor}
              actorOptions={managerActors}
              onActorChange={(value) => {
                setManagerActor(value);
                setSelectedRequestId(null);
              }}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              requests={visibleRequests}
              selectedRequestId={selectedRequest?.id || null}
              onSelectRequest={setSelectedRequestId}
            />

            <RequestDetailPanel
              request={selectedRequest}
              role={pages.manager}
              onApprove={handleManagerApprove}
              onSendToHr={(requestId, actor, reason) => handleSendToHr(requestId, actor, reason)}
              onSaveSoftware={handleSaveSoftware}
            />
          </section>
        ) : null}

        {currentPage === pages.hod ? (
          <section className="dashboard-layout">
            <RequestTable
              title="HOD Dashboard"
              subtitle="Review requests that have already cleared line manager approval and either approve them or route them back to HR."
              actorLabel="Acting as"
              actorValue={hodActor}
              actorOptions={hodActors}
              onActorChange={(value) => {
                setHodActor(value);
                setSelectedRequestId(null);
              }}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              requests={visibleRequests}
              selectedRequestId={selectedRequest?.id || null}
              onSelectRequest={setSelectedRequestId}
            />

            <RequestDetailPanel
              request={selectedRequest}
              role={pages.hod}
              onApprove={handleHodApprove}
              onSendToHr={(requestId, actor, reason) => handleSendToHr(requestId, actor, reason)}
              onSaveSoftware={handleSaveSoftware}
            />
          </section>
        ) : null}

        {currentPage === pages.hr ? (
          <section className="dashboard-layout">
            <RequestTable
              title="HR Review Dashboard"
              subtitle="Requests sent back for HR correction appear here. Edit the form and re-submit to send the mail and workflow back through manager and HOD."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              requests={visibleRequests}
              selectedRequestId={selectedRequest?.id || null}
              onSelectRequest={(requestId) => {
                setSelectedRequestId(requestId);
                setEditingHrRequestId(null);
              }}
            />

            <div className="hr-review-column">
              <RequestDetailPanel
                request={selectedRequest}
                role={pages.hr}
                onSaveSoftware={handleSaveSoftware}
                onStartHrEdit={handleHrEditStart}
              />

              {hrEditingRequest ? (
                <div className="modal-backdrop">
                  <div className="modal-card" style={{ width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}>
                    <div className="modal-topbar">
                      <div>
                        <h3>HR Re-submit Request</h3>
                        <p>Update the request details and send the onboarding mail back through the same flow.</p>
                      </div>
                      <button className="ghost-button" onClick={handleHrEditCancel}>✕</button>
                    </div>
                    <div style={{ padding: "24px" }}>
                      <HRForm
                        title=""
                        subtitle=""
                        submitLabel="Re-submit Request"
                        successPrimaryMessage="HR review submitted."
                        initialData={hrEditingRequest.formData}
                        onSubmitForm={sendOnboardingMail}
                        onSuccess={handleHrResubmitSuccess}
                        onCancel={handleHrEditCancel}
                        resetOnSuccess={false}
                        embedded
                        apiBaseUrl={apiBaseUrl}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
