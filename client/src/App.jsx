import { useEffect, useRef, useState, useMemo } from "react";
import "./App.css";

import HRForm from "./HRForm";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";

import { officialEmailDomain } from "./onboardingData";

// Components
import AppNotice from "./components/AppNotice";
import PageErrorBoundary from "./components/PageErrorBoundary";
import SummaryStrip from "./components/SummaryStrip";
import RequestTable from "./components/RequestTable";
import SoftwareSection from "./components/SoftwareSection";
import RequestDetailPanel from "./components/RequestDetailPanel";

// Constants & Utils
import { pages, workflowStages, pageOptions, rolePermissions } from "./constants";
import {
  getTodayLabel,
  buildRequest,
  getStageMeta,
  matchesSearch,
  normalizeRequestRecord,
} from "./utils";

// Services
import { api } from "./services/api";

const requestStorageKey = "onboarding-app-requests";
const sessionStorageKey = "onboarding-app-session";

function normalizeRole(role) {
  if (typeof role !== "string") {
    return "";
  }

  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  const canonicalRoles = {
    admin: "Admin",
    manager: "Manager",
    hod: "HOD",
    employee: "Employee",
  };

  return canonicalRoles[normalized] || "Employee";
}

function normalizeDepartment(department) {
  if (typeof department !== "string") {
    return "";
  }

  return department.trim().toUpperCase();
}

function getAllowedPagesForUser(user) {
  const role = normalizeRole(user?.role);
  const allowedPages = [...(rolePermissions[role] || [])];
  const department = normalizeDepartment(user?.department);

  if (department === "HR" && ["Employee", "Manager"].includes(role)) {
    allowedPages.push(pages.submit, pages.hr);
  }

  return Array.from(new Set(allowedPages));
}

function getNextRequestId(requestList) {
  const maxRequestId = requestList.reduce((maxId, request) => {
    const requestId = Number(request.id);
    return Number.isFinite(requestId) ? Math.max(maxId, requestId) : maxId;
  }, 103);

  return maxRequestId + 1;
}

function getDefaultPageForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "Admin") return pages.admin;
  if (normalizedRole === "Manager") return pages.manager;
  if (normalizedRole === "HOD") return pages.hod;
  return pages.status;
}

function getRoutePage() {
  const hashValue = window.location.hash.replace(/^#\/?/, "").trim();
  return pageOptions.some((option) => option.key === hashValue) ? hashValue : null;
}

function setRoutePage(page) {
  const nextHash = `#/${page}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function readStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(sessionStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    return parsed?.user ? parsed : null;
  } catch (error) {
    console.error("Failed to read stored session", error);
    return null;
  }
}

function writeStoredSession(session) {
  try {
    if (!session) {
      window.localStorage.removeItem(sessionStorageKey);
      return;
    }

    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to store session", error);
  }
}

function resolveAllowedPage(user, requestedPage) {
  const allowedPages = getAllowedPagesForUser(user);
  if (requestedPage && allowedPages.includes(requestedPage)) {
    return requestedPage;
  }

  if (normalizeDepartment(user?.department) === "HR" && ["Employee", "Manager"].includes(normalizeRole(user?.role))) {
    return pages.submit;
  }

  return getDefaultPageForRole(user?.role);
}

function isWorkflowDashboardPage(page) {
  return [pages.admin, pages.manager, pages.hod, pages.hr].includes(page);
}

function getWorkflowBuckets(requests, searchTerm, currentUser, currentPage) {
  let filteredRequests = requests;

  if (currentPage === pages.manager) {
    filteredRequests = requests.filter(
      (r) => r.formData.lineManager === (currentUser?.name || ""),
    );
  } else if (currentPage === pages.hod) {
    filteredRequests = requests.filter((r) => r.formData.hod === (currentUser?.name || ""));
  }

  const searchFiltered = filteredRequests.filter((request) => matchesSearch(request, searchTerm));

  return {
    current: searchFiltered.filter(
      (request) =>
        [workflowStages.manager, workflowStages.hod].includes(request.stage) &&
        request.stage !== workflowStages.stopped &&
        request.stage !== workflowStages.approved,
    ),
    rejected: searchFiltered.filter((request) => request.stage === workflowStages.hr),
    approved: searchFiltered.filter((request) => request.stage === workflowStages.approved),
    stopped: searchFiltered.filter((request) => request.stage === workflowStages.stopped),
  };
}

function readStoredRequests() {
  try {
    const rawValue = window.localStorage.getItem(requestStorageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.map((request, index) => normalizeRequestRecord(request, index + 1))
      : [];
  } catch (error) {
    console.error("Failed to read locally stored requests", error);
    return [];
  }
}

function writeStoredRequests(requestList) {
  try {
    window.localStorage.setItem(requestStorageKey, JSON.stringify(requestList));
  } catch (error) {
    console.error("Failed to store requests locally", error);
  }
}

async function fetchUsersData() {
  try {
    const { ok, data } = await api.fetchUsers();
    if (ok && data && Array.isArray(data.users)) {
      return data.users;
    }

    console.error("Failed to fetch users: invalid response format", data);
    return [];
  } catch (err) {
    console.error("Failed to fetch users: network or parsing error", err);
    return [];
  }
}

async function fetchWorkflowOptionsData() {
  try {
    const { ok, data } = await api.fetchWorkflowOptions();
    if (ok && data) {
      return {
        officialEmailDomain:
          typeof data.officialEmailDomain === "string" && data.officialEmailDomain.trim()
            ? data.officialEmailDomain.trim()
            : officialEmailDomain,
        preInstalledSoftware: Array.isArray(data.preInstalledSoftware)
          ? data.preInstalledSoftware
          : [],
        employeeInstalledSoftware: Array.isArray(data.employeeInstalledSoftware)
          ? data.employeeInstalledSoftware
          : [],
      };
    }

    console.error("Failed to fetch workflow options: invalid response format", data);
  } catch (err) {
    console.error("Failed to fetch workflow options: network or parsing error", err);
  }

  return {
    officialEmailDomain,
    preInstalledSoftware: [],
    employeeInstalledSoftware: [],
  };
}

function App() {
  const nextRequestId = useRef(104);
  const [currentPage, setCurrentPage] = useState(() => {
    const storedSession = readStoredSession();
    const requestedPage = getRoutePage();

    if (storedSession?.user) {
      return resolveAllowedPage(storedSession.user, requestedPage);
    }

    return requestedPage || pages.submit;
  });
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [managerActor, setManagerActor] = useState("");
  const [hodActor, setHodActor] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [editingHrRequestId, setEditingHrRequestId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [workflowOptions, setWorkflowOptions] = useState({
    officialEmailDomain,
    preInstalledSoftware: [],
    employeeInstalledSoftware: [],
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readStoredSession()?.user));
  const [currentUser, setCurrentUser] = useState(() => readStoredSession()?.user ?? null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const [users, workflowCatalog] = await Promise.all([
        fetchUsersData(),
        fetchWorkflowOptionsData(),
      ]);

      if (!isActive) {
        return;
      }

      setAllUsers(users);
      setWorkflowOptions(workflowCatalog);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchRequests() {
      const storedRequests = readStoredRequests();

      try {
        const { ok, data } = await api.fetchRequests();
        if (!isActive) {
          return;
        }

        if (ok && Array.isArray(data.requests)) {
          const normalizedRequests = data.requests.map((request, index) =>
            normalizeRequestRecord(request, index + 1),
          );
          setRequests(normalizedRequests);
          nextRequestId.current = getNextRequestId(normalizedRequests);
          writeStoredRequests(normalizedRequests);
        } else {
          const fallbackRequests = storedRequests.length > 0 ? storedRequests : [];
          setRequests(fallbackRequests);
          nextRequestId.current = getNextRequestId(fallbackRequests);
          console.error("Failed to fetch requests: invalid response format", data);
        }
      } catch (err) {
        if (!isActive) {
          return;
        }

        const fallbackRequests = storedRequests.length > 0 ? storedRequests : [];
        setRequests(fallbackRequests);
        nextRequestId.current = getNextRequestId(fallbackRequests);
        console.error("Failed to fetch requests: network or parsing error", err);
      } finally {
        if (isActive) {
          setRequestsLoaded(true);
        }
      }
    }

    fetchRequests();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    nextRequestId.current = getNextRequestId(requests);
  }, [requests]);

  useEffect(() => {
    if (requestsLoaded) {
      writeStoredRequests(requests);
    }
  }, [requests, requestsLoaded]);

  // For manager/HOD views, filter requests by the logged-in user's name

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    setRoutePage(resolveAllowedPage(currentUser, currentPage));
  }, [currentPage, currentUser, isAuthenticated]);

  useEffect(() => {
    const handleHashChange = () => {
      const requestedPage = getRoutePage();

      if (!isAuthenticated || !currentUser) {
        setCurrentPage(requestedPage || pages.submit);
        return;
      }

      setCurrentPage(resolveAllowedPage(currentUser, requestedPage));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser, isAuthenticated]);

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  async function persistRequest(request) {
    const { ok, data } = await api.saveRequest(request);
    if (!ok) {
      throw new Error(data.message || "Unable to save the onboarding request.");
    }

    return normalizeRequestRecord(data.request || request, request.id);
  }

  const handleLogin = async (email, password) => {
    const { ok, data } = await api.login(email, password);
    if (ok) {
      const normalizedUser = {
        ...data.user,
        role: normalizeRole(data.user?.role),
      };

      setIsAuthenticated(true);
      setCurrentUser(normalizedUser);
      writeStoredSession({ user: normalizedUser });
      setCurrentPage(resolveAllowedPage(normalizedUser, getRoutePage()));

      showNotice("success", "Login Successful", `Welcome back, ${normalizedUser.name}!`);
    } else {
      showNotice("error", "Login Failed", data.message || "Invalid email or password.");
    }
  };

  const handleForgotPassword = async (email) => {
    const { ok, data } = await api.forgotPassword(email);
    return { success: ok, message: data.message };
  };

  const handleVerifyOtp = async (email, otp) => {
    const { ok, data } = await api.verifyOtp(email, otp);
    return { success: ok, message: data.message };
  };

  const handleResetPassword = async (email, otp, newPassword) => {
    const { ok, data } = await api.resetPassword(email, otp, newPassword);
    return { success: ok, message: data.message };
  };

  const handleAddUser = async (user) => {
    const { ok, data } = await api.createUser(user);
    if (ok) {
      showNotice("success", "User Created", data.message);
      setAllUsers(await fetchUsersData());
      return { ok: true, data };
    } else {
      showNotice("error", "Failed to Create User", data.message);
      return { ok: false, data };
    }
  };

  const handleUpdateUser = async (user) => {
    const { ok, data } = await api.updateUser(user);
    if (ok) {
      showNotice("success", "User Updated", data.message);
      setAllUsers(await fetchUsersData());
    } else {
      showNotice("error", "Failed to Update User", data.message);
    }
  };

  const handleDeleteUser = async (email) => {
    const { ok, data } = await api.deleteUser(email);
    if (ok) {
      showNotice("success", "User Deleted", data.message);
      setAllUsers(await fetchUsersData());
    } else {
      showNotice("error", "Failed to Delete User", data.message);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    writeStoredSession(null);
    setCurrentPage(pages.submit);
    setRoutePage(pages.submit);
    showNotice("warning", "Logged Out", "You have been successfully logged out.");
  };

  async function sendOnboardingMail(formData) {
    const { ok, data } = await api.sendOnboardingMail(formData);
    if (!ok) {
      return {
        ok: false,
        message: data.message || "Unable to submit the form.",
        errors: data.errors || {},
      };
    }
    return {
      ok: true,
      message: data.message || "Mail sent successfully",
      officialEmail: data.officialEmail || "",
    };
  }

  async function addRequest(formData, payload) {
    const draftRequest = buildRequest(nextRequestId.current, formData, {
      submittedAt: getTodayLabel(),
      lastUpdated: getTodayLabel(),
      requestCode: `ONB-${String(nextRequestId.current).padStart(3, "0")}`,
      preInstalledSoftware: workflowOptions.preInstalledSoftware,
      employeeInstalledSoftware: workflowOptions.employeeInstalledSoftware,
      officialEmailDomain: workflowOptions.officialEmailDomain,
    });

    const request = payload?.officialEmail
      ? { ...draftRequest, officialEmail: payload.officialEmail }
      : draftRequest;

    try {
      const savedRequest = await persistRequest(request);
      setRequests((currentRequests) => [savedRequest, ...currentRequests.filter((item) => item.requestCode !== savedRequest.requestCode)]);
      setSelectedRequestId(savedRequest.id);
      setManagerActor(formData.lineManager);
      setHodActor(formData.hod);
      showNotice(
        "success",
        "Request added to workflow",
        `${savedRequest.formData.name} is now waiting for line manager review.`,
      );
    } catch (err) {
      setRequests((currentRequests) => [request, ...currentRequests.filter((item) => item.requestCode !== request.requestCode)]);
      setSelectedRequestId(request.id);
      setManagerActor(formData.lineManager);
      setHodActor(formData.hod);
      showNotice(
        "warning",
        "Request Saved Locally",
        `${request.formData.name} was saved in the browser, but the server request store is unavailable. ${err.message}`,
      );
    }
  }

  async function updateRequest(requestId, updater, successNotice) {
    if (!requestId) return null;

    const currentRequest = requests.find((request) => request.id === requestId);
    if (!currentRequest) {
      return null;
    }

    const nextRequest = updater(currentRequest);
    if (!nextRequest) return currentRequest;

    try {
      const savedRequest = await persistRequest(nextRequest);
      setRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === requestId ? savedRequest : request)),
      );

      if (successNotice) {
        showNotice(successNotice.type, successNotice.title, successNotice.message(savedRequest));
      }

      return savedRequest;
    } catch (err) {
      setRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === requestId ? nextRequest : request)),
      );

      if (successNotice) {
        showNotice(
          "warning",
          `${successNotice.title} (Local Only)`,
          `${successNotice.message(nextRequest)} Server sync failed: ${err.message}`,
        );
      } else {
        showNotice("warning", "Request Updated Locally", `Server sync failed: ${err.message}`);
      }

      return nextRequest;
    }
  }

  async function handleManagerApprove(requestId) {
    const request = requests.find((r) => r.id === requestId);
    if (!request?.assetCode) {
      showNotice("error", "Asset Code Required", "Please save an asset code before approving the request.");
      return;
    }

    await updateRequest(
      requestId,
      (request) => ({
        ...request,
        stage: workflowStages.hod,
        lastUpdated: getTodayLabel(),
        managerApprovedAt: getTodayLabel(),
        reviewRequestedBy: "",
        reviewReason: "",
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

    const { ok, data } = await api.finalizeOnboarding({
      name: request.formData.name,
      email: request.formData.personalEmail,
      department: request.formData.department
    });
    
    if (!ok) {
      showNotice("error", "Automation Failed", data.message || "Failed to create user account.");
      return;
    }
    
    await updateRequest(
      requestId,
      (req) => ({
        ...req,
        stage: workflowStages.approved,
        lastUpdated: getTodayLabel(),
        hodApprovedAt: getTodayLabel(),
        reviewRequestedBy: "",
        reviewReason: "",
      }),
      {
        type: "success",
        title: "Request fully approved",
        message: (req) =>
          `${req.formData.name} has completed onboarding. ${data.password ? `Default Password: ${data.password}` : ""}`,
      },
    );
  }

  async function handleSendToHr(requestId, actorLabel, reason) {
    if (!reason || !reason.trim()) {
      showNotice("error", "Required", "Please provide a reason for HR review.");
      return;
    }
    const savedRequest = await updateRequest(
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

    if (savedRequest) {
      setCurrentPage(pages.hr);
      setSelectedRequestId(savedRequest.id);
    }
  }

  async function handleSaveSoftware(requestId, additionalSoftware, role, metadata = {}) {
    if (metadata.assetCode) {
      const duplicate = requests.find(
        (r) =>
          r.id !== requestId &&
          r.assetCode?.trim().toLowerCase() === metadata.assetCode.trim().toLowerCase() &&
          r.stage !== workflowStages.stopped,
      );

      if (duplicate) {
        showNotice(
          "error",
          "Duplicate Asset Code",
          `Asset code "${metadata.assetCode}" is already assigned to ${duplicate.formData.name}.`,
        );
        return;
      }
    }

    await updateRequest(
      requestId,
      (request) => {
        const update = {};
        if (role === pages.manager) update.managerSoftware = additionalSoftware;
        if (role === pages.manager && metadata.assetCode !== undefined) update.assetCode = metadata.assetCode;
        if (role === pages.hod && metadata.hodComment !== undefined) update.hodComment = metadata.hodComment;
        
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

  async function handleStopCase(requestId, reason) {
    await updateRequest(
      requestId,
      (request) => ({
        ...request,
        stage: workflowStages.stopped,
        stopReason: reason,
        lastUpdated: getTodayLabel(),
      }),
      {
        type: "warning",
        title: "Case stopped",
        message: (request) => `${request.formData.name} onboarding has been cancelled.`,
      },
    );
  }

  function handleHrEditStart(requestId) {
    setEditingHrRequestId(requestId);
  }

  function handleHrEditCancel() {
    setEditingHrRequestId(null);
  }

  async function handleHrResubmitSuccess(submittedData, payload) {
    const savedRequest = await updateRequest(
      editingHrRequestId,
      (request) => ({
        ...request,
        formData: {
          ...submittedData,
        },
        officialEmail: payload?.officialEmail || `${submittedData.officialEmailUser}${officialEmailDomain}`,
        stage: workflowStages.manager,
        lastUpdated: getTodayLabel(),
        reviewRequestedBy: "",
        reviewReason: "",
        revisionCount: request.revisionCount + 1,
      }),
      {
        type: "success",
        title: "Request re-submitted",
        message: (request) =>
          `${request.formData.name} has been sent back to line manager and HOD with the updated form and mail notification.`,
      },
    );

    if (savedRequest) {
      setManagerActor(submittedData.lineManager);
      setHodActor(submittedData.hod);
      setEditingHrRequestId(null);
      setSelectedRequestId(savedRequest.id);
    }
  }

  const handleSelectRequest = (id) => {
    setSelectedRequestId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Memoize filtered requests to prevent expensive recalculation on every render
  const visibleRequests = useMemo(() => {
    let filtered = requests;

    if (currentPage === pages.manager) {
      filtered = requests.filter(
        (request) =>
          request.stage === workflowStages.manager &&
          request.formData.lineManager === (currentUser?.name || ""),
      );
    } else if (currentPage === pages.hod) {
      filtered = requests.filter(
        (request) =>
          request.stage === workflowStages.hod &&
          request.formData.hod === (currentUser?.name || ""),
      );
    } else if (currentPage === pages.hr) {
      filtered = requests.filter((request) => request.stage === workflowStages.hr);
    }

    // Apply search filter and sort
    return filtered
      .filter((request) => matchesSearch(request, searchTerm))
      .sort((left, right) => right.id - left.id);
  }, [requests, currentPage, managerActor, hodActor, searchTerm, currentUser]);

  const workflowBuckets = useMemo(
    () => getWorkflowBuckets(requests, searchTerm, currentUser, currentPage),
    [requests, searchTerm, currentUser, currentPage],
  );

  // Memoize selected request
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) {
      // For HR page, we don't auto-select the first request (it shows in a modal)
      if (currentPage === pages.hr) return null;
      // For other dashboards, auto-select the first visible request if nothing is chosen
      return (visibleRequests && visibleRequests.length > 0) ? visibleRequests[0] : null;
    }

    // Try to find the selected request in the current visible list
    const foundInVisible = (visibleRequests || []).find((request) => request && String(request.id) === String(selectedRequestId));
    if (foundInVisible) return foundInVisible;

    // If not in visible (e.g. from a bucket), look through all workflow buckets
    const allBuckets = Object.values(workflowBuckets || {}).flat();
    const foundInBuckets = allBuckets.find((request) => request && String(request.id) === String(selectedRequestId));
    if (foundInBuckets) return foundInBuckets;

    // If still not found (e.g. search narrowed out the selected ID), return null to avoid showing stale data
    return null;
  }, [visibleRequests, workflowBuckets, selectedRequestId, currentPage]);

  const hrEditingRequest = useMemo(() => {
    return requests.find((request) => request.id === editingHrRequestId) || null;
  }, [requests, editingHrRequestId]);

  const currentUserRequest = useMemo(() => {
    if (!currentUser?.email) {
      return null;
    }

    const matchingRequests = requests
      .filter((request) => {
        const personalEmail = request.formData.personalEmail?.toLowerCase();
        const officialEmail = request.officialEmail?.toLowerCase();
        const currentEmail = currentUser.email.toLowerCase();

        return personalEmail === currentEmail || officialEmail === currentEmail;
      })
      .sort((left, right) => right.id - left.id);

    return (
      matchingRequests.find((request) => request.stage === workflowStages.approved) ||
      matchingRequests[0] ||
      null
    );
  }, [currentUser, requests]);

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

  // Safety check: wait for currentUser and requests to be loaded
  if (!currentUser || !requestsLoaded) {
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
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "60vh",
            color: "#64748b"
          }}>
            <div style={{ 
              fontSize: "2rem", 
              marginBottom: "16px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" 
            }}>⌛</div>
            <p style={{ fontSize: "1.1rem" }}>Initializing dashboard and fetching requests...</p>
          </div>
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
            .filter((opt) => getAllowedPagesForUser(currentUser).includes(opt.key))
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

        <PageErrorBoundary key={currentPage}>
          {currentPage === pages.admin ? (
            <AdminDashboard 
              users={allUsers} 
              onAddUser={handleAddUser} 
              onUpdateUser={handleUpdateUser} 
              onDeleteUser={handleDeleteUser}
              apiBaseUrl={api.getBaseUrl()} 
            />
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
              if (!requestsLoaded) {
                return <div className="request-empty">Loading your onboarding record...</div>;
              }

              const myRequest = currentUserRequest;

              if (!myRequest) {
                return (
                  <div className="request-empty">
                    No onboarding record found for your account email ({currentUser.email}).
                  </div>
                );
              }

              if (myRequest.stage === workflowStages.stopped) {
                return (
                  <div className="status-container" style={{ padding: "40px", textAlign: "center", background: "#fff1f2", borderRadius: "16px", marginTop: "24px" }}>
                    <div style={{ marginBottom: "24px" }}>
                      <span className="status-pill status-pill-stopped" style={{ fontSize: "1.2rem", padding: "12px 24px" }}>
                        {getStageMeta(myRequest.stage).label}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.5rem", color: "#7f1d1d", marginBottom: "8px" }}>{myRequest.formData.name}</h3>
                    <p style={{ color: "#991b1b", marginBottom: "32px" }}>This onboarding case has been stopped.</p>
                    <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "left", background: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      <p style={{ margin: "0", color: "#475569" }}>{myRequest.stopReason || "No stop reason was recorded."}</p>
                    </div>
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
                    <SoftwareSection
                      title="Company Provided"
                      tone="blue"
                      items={myRequest.preInstalledSoftware}
                      showWhenEmpty
                      emptyMessage="No company-provided software has been listed yet."
                    />
                    <SoftwareSection
                      title="To Be Installed"
                      tone="yellow"
                      items={myRequest.employeeInstalledSoftware}
                      showWhenEmpty
                      emptyMessage="No employee-installed software has been listed yet."
                    />
                    <SoftwareSection
                      title="Manager Recommended"
                      tone="orange"
                      items={myRequest.managerSoftware}
                      headerLabel={myRequest.formData.lineManager}
                      showWhenEmpty
                      emptyMessage="No line manager software recommendations have been added yet."
                    />
                    <div className="software-card software-card-black">
                      <div className="software-card-header">{myRequest.formData.hod}</div>
                      <div>
                        <h4>HOD Comment</h4>
                        <p>{myRequest.hodComment || "No HOD comment has been added yet."}</p>
                      </div>
                    </div>
                    <div className="software-card software-card-orange">
                      <div>
                        <h4>Asset Code</h4>
                        <p>{myRequest.assetCode || "No asset code has been assigned yet."}</p>
                      </div>
                    </div>
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
            officialEmailDomain={workflowOptions.officialEmailDomain}
            apiBaseUrl={api.getBaseUrl()}
          />
          ) : null}

          {currentPage === pages.manager ? (
            <section className="dashboard-layout">
              <RequestDetailPanel
                key={`${pages.manager}-${selectedRequest?.id || "none"}`}
                request={selectedRequest}
                role={pages.manager}
                onApprove={handleManagerApprove}
                onSendToHr={(requestId, actor, reason) => handleSendToHr(requestId, actor, reason)}
                onSaveSoftware={handleSaveSoftware}
              />

              <RequestTable
                title="Line Manager Dashboard"
                subtitle="Track requests assigned to you and move them forward to HOD or back to HR."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                requests={visibleRequests}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
              />
            </section>
          ) : null}

          {currentPage === pages.hod ? (
            <section className="dashboard-layout">
              <RequestDetailPanel
                key={`${pages.hod}-${selectedRequest?.id || "none"}`}
                request={selectedRequest}
                role={pages.hod}
                onApprove={handleHodApprove}
                onSendToHr={(requestId, actor, reason) => handleSendToHr(requestId, actor, reason)}
                onSaveSoftware={handleSaveSoftware}
              />

              <RequestTable
                title="HOD Dashboard"
                subtitle="Review requests assigned to you and either approve them or route them back to HR."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                requests={visibleRequests}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
              />
            </section>
          ) : null}

          {currentPage === pages.hr ? (
            <section className="dashboard-layout">
              <RequestDetailPanel
                key={`${pages.hr}-${selectedRequest?.id || "none"}`}
                request={selectedRequest}
                role={pages.hr}
                onSendToHr={(requestId, actor, reason) => handleSendToHr(requestId, actor, reason)}
                onSaveSoftware={handleSaveSoftware}
                onStartHrEdit={handleHrEditStart}
                onStopCase={handleStopCase}
              />

              <RequestTable
                title="HR Review Dashboard"
                subtitle="Requests sent back for HR correction appear here. Edit the form and re-submit to send the mail and workflow back through manager and HOD."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                requests={visibleRequests}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={(requestId) => {
                  handleSelectRequest(requestId);
                  setEditingHrRequestId(null);
                }}
              />
            </section>
          ) : null}

          {currentPage === pages.hr && hrEditingRequest ? (
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
                    key={`hr-edit-${hrEditingRequest?.id || "none"}`}
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
                    apiBaseUrl={api.getBaseUrl()}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </PageErrorBoundary>

        {isWorkflowDashboardPage(currentPage) ? (
          <section className="dashboard-panel workflow-board-shell" style={{ marginTop: "40px" }}>
            <div className="dashboard-head">
              <div>
                <h2>Workflow Buckets</h2>
                <p>Track current work, rejected cases, approvals, and stopped cases from one place.</p>
              </div>
            </div>

            <div className="dashboard-toolbar">
              <input
                className="dashboard-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search across all workflow buckets..."
              />
            </div>

            <div className="workflow-bucket-grid">
              <RequestTable
                title="WIP (Current)"
                subtitle="Active requests in progress"
                requests={workflowBuckets.current}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
                showSearch={false}
              />
              <RequestTable
                title="Past Rejected (HR Review)"
                subtitle="Requests routed back for HR correction"
                requests={workflowBuckets.rejected}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
                showSearch={false}
              />
              <RequestTable
                title="Past Approved"
                subtitle="Completed onboarding cases"
                requests={workflowBuckets.approved}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
                showSearch={false}
              />
              <RequestTable
                title="Past Stopped"
                subtitle="Cancelled cases"
                requests={workflowBuckets.stopped}
                selectedRequestId={selectedRequest?.id || null}
                onSelectRequest={handleSelectRequest}
                showSearch={false}
              />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
