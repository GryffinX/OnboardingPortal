import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import HRDashboard from "./HRDashboard";

// Components
import AppNotice from "./components/AppNotice";
import PageErrorBoundary from "./components/PageErrorBoundary";
import SummaryStrip from "./components/SummaryStrip";
import RequestTable from "./components/RequestTable";
import RequestDetailPanel from "./components/RequestDetailPanel";
import SoftwareSection from "./components/SoftwareSection";
import DashboardTabBar from "./components/DashboardTabBar";

// Constants & Utils
import { pages, workflowStages, pageOptions, globalQueueFilters, roleQueueFilters } from "./constants";
import {
  normalizeRequestRecord,
  matchesSearch,
  normalizeRole,
  validateName,
  validateEmail,
  validateEmployeePhoneNumber,
  cleanNameInput,
  cleanNumericInput,
  isGlobalQueueViewer,
  isStaffWorkflowUser,
  isHrUser,
  isAdmin,
  filterRequestsForUserScope,
  applyQueueTabFilter,
  countPendingForPage,
  countPendingForUser,
} from "./utils";
import { api } from "./services/api";

const sessionKey = "onboarding_session";

function readStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(sessionKey);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (session) {
    window.localStorage.setItem(sessionKey, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(sessionKey);
  }
}

function getRoutePage() {
  const hash = window.location.hash || "";
  const hashValue = hash.replace("#/", "");
  return pageOptions.some((option) => option.key === hashValue) ? hashValue : null;
}

function setRoutePage(page) {
  const nextHash = `#/${page}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function isWorkflowDashboardPage(page) {
  return [pages.admin, pages.manager, pages.hod, pages.infraAdmin, pages.infraExecutive, pages.requests, pages.submit].includes(page);
}

function ConfirmationModal({ config, onCancel }) {
  if (!config) return null;
  const { title, message, confirmLabel, onConfirm, tone = "primary", actions } = config;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: "400px" }}>
        <div className="modal-topbar">
          <div>
            <h3>{title}</h3>
          </div>
          <button className="ghost-button" onClick={onCancel}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>
          <p style={{ marginBottom: "24px", color: "#475569", lineHeight: 1.5 }}>{message}</p>
          <div className="detail-actions">
            {Array.isArray(actions) && actions.length > 0 ? (
              actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.tone === "danger" ? "warning-button" : "primary-button"}
                  disabled={!!action.disabled}
                  title={action.title || ""}
                  onClick={() => {
                    if (action.disabled) return;
                    action.onConfirm?.();
                    onCancel();
                  }}
                >
                  {action.label}
                </button>
              ))
            ) : (
              <button 
                type="button" 
                className={tone === "danger" ? "warning-button" : "primary-button"} 
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
              >
                {confirmLabel || "Confirm"}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileDashboard({ user, request, onUpdateProfile, onShowNotice }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    employeeCode: user.employeeCode || "",
    password: "",
    confirmPassword: ""
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartEdit = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      employeeCode: user.employeeCode || "",
      password: "",
      confirmPassword: ""
    });
    setIsEditing(true);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    
    // Validations
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const phoneErr = formData.phoneNumber ? validateEmployeePhoneNumber(formData.phoneNumber) : null;
    
    if (nameErr || emailErr || phoneErr) {
      onShowNotice("error", "Validation Error", nameErr || emailErr || phoneErr);
      return;
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        onShowNotice("error", "Validation Error", "Password must be at least 8 characters.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        onShowNotice("error", "Validation Error", "Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    const { ok, data } = await api.requestProfileUpdateOtp(user.email);
    setLoading(false);
    
    if (ok) {
      setIsVerifying(true);
      onShowNotice("success", "OTP Sent", "A verification code has been sent to your current email.");
    } else {
      onShowNotice("error", "Request Failed", data.message);
    }
  };

  const handleVerifyAndSave = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      onShowNotice("error", "Invalid OTP", "OTP must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    const { ok, data } = await api.verifyProfileUpdate(user.email, otp, formData);
    setLoading(false);

    if (ok) {
      onUpdateProfile(data.user);
      setIsEditing(false);
      setIsVerifying(false);
      setOtp("");
      onShowNotice("success", "Profile Updated", "Your personal details have been updated successfully.");
    } else {
      onShowNotice("error", "Update Failed", data.message);
    }
  };

  const isEmployee = normalizeRole(user.role) === "Employee";

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section className="dashboard-panel">
        <div className="dashboard-head">
          <div>
            <h2>My Profile</h2>
            <p>Manage your personal details and account security</p>
          </div>
          {!isEditing && (
            <button className="primary-button" onClick={handleStartEdit}>Edit Profile</button>
          )}
        </div>

        {!isEditing ? (
          <div className="detail-grid" style={{ marginTop: 24 }}>
            <div><span>Full Name</span><strong>{user.name}</strong></div>
            <div><span>Employee Code</span><strong>{user.employeeCode || "N/A"}</strong></div>
            <div><span>Personal Email</span><strong>{user.email}</strong></div>
            <div><span>Phone Number</span><strong>{user.phoneNumber || "Not provided"}</strong></div>
            <div><span>Role</span><strong>{user.role}</strong></div>
            <div><span>Department</span><strong>{user.department || "N/A"}</strong></div>
            <div><span>Account Status</span><strong style={{ color: user.isActive ? '#10b981' : '#ef4444' }}>{user.isActive ? "Active" : "Inactive"}</strong></div>
          </div>
        ) : isVerifying ? (
          <form onSubmit={handleVerifyAndSave} style={{ maxWidth: 400, marginTop: 24 }}>
            <div className="form-group">
              <label>Enter 6-Digit OTP</label>
              <input 
                type="text" 
                className="dashboard-search" 
                value={otp} 
                onChange={(e) => setOtp(cleanNumericInput(e.target.value, 6))} 
                placeholder="000000"
                maxLength={6}
                required
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>We've sent a code to {user.email} to verify these changes.</p>
            </div>
            <div className="detail-actions" style={{ marginTop: 24 }}>
              <button type="submit" className="primary-button" disabled={loading}>{loading ? "Verifying..." : "Verify & Save Changes"}</button>
              <button type="button" className="secondary-button" onClick={() => setIsVerifying(false)}>Back</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestOtp} style={{ maxWidth: 500, marginTop: 24, display: 'grid', gap: 20 }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="dashboard-search" value={formData.name} onChange={(e) => setFormData({...formData, name: cleanNameInput(e.target.value, 50)})} required maxLength={50} />
            </div>
            <div className="form-group">
              <label>Personal Email</label>
              <input type="email" className="dashboard-search" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.replace(/[^a-zA-Z0-9.@-]/g, "").slice(0, 100)})} required maxLength={100} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" className="dashboard-search" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: cleanNumericInput(e.target.value, 10)})} placeholder="10-digit number" maxLength={10} />
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Change Password</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <input type="password" placeholder="New password (min 8 chars)" className="dashboard-search" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value.slice(0, 50)})} maxLength={50} />
                <input type="password" placeholder="Confirm new password" className="dashboard-search" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value.slice(0, 50)})} maxLength={50} />
              </div>
            </div>
            <div className="detail-actions">
              <button type="submit" className="primary-button" disabled={loading}>{loading ? "Sending OTP..." : "Request OTP to Save"}</button>
              <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      {isEmployee && request && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>IT Assets & Setup</h2>
              <p>Your company-assigned hardware and software configuration</p>
            </div>
          </div>
          
          <div className="detail-grid" style={{ marginTop: 24, marginBottom: 24 }}>
            <div>
              <span>Asset Code</span>
              <strong>{request.assetCode || "N/A"}</strong>
            </div>
            <div>
              <span>Official Email</span>
              <strong>{request.officialEmail || "N/A"}</strong>
            </div>
            {request.laptopModel && (
              <>
                <div><span>Laptop Model</span><strong>{request.laptopModel}</strong></div>
                <div><span>Processor</span><strong>{request.laptopProcessor}</strong></div>
                <div><span>RAM</span><strong>{request.laptopRam}</strong></div>
                <div><span>Storage</span><strong>{request.laptopStorage}</strong></div>
              </>
            )}
          </div>

          <SoftwareSection
            title="Pre-installed on company laptop"
            tone="blue"
            items={request.preInstalledSoftware}
            emptyMessage="No company-provided software has been assigned for this department yet."
            showWhenEmpty
          />

          <SoftwareSection
            title="To be installed by you"
            tone="yellow"
            items={request.employeeInstalledSoftware}
            emptyMessage="No employee-installed software has been assigned for this department yet."
            showWhenEmpty
          />

          <SoftwareSection
            title="Software listed by Manager"
            tone="orange"
            items={request.managerSoftware}
            headerLabel={request.formData.lineManager}
          />

          <SoftwareSection
            title="Software listed by Infrastructure Admin"
            tone="cyan"
            items={request.infraSoftware}
            headerLabel={request.infraAdmin?.name}
          />
        </section>
      )}
    </div>
  );
}

function App() {
  const myProfileKey = "my-profile";

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readStoredSession());
  const [currentUser, setCurrentUser] = useState(() => readStoredSession()?.user || null);
  
  const [currentPage, setCurrentPage] = useState(() => {
    const storedSession = readStoredSession();
    const requestedPage = getRoutePage();
    if (storedSession?.user) {
      return resolveAllowedPage(storedSession.user, null, requestedPage, false);
    }
    return pages.login;
  });

  const [allUsers, setAllUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [workflowOptions, setWorkflowOptions] = useState({
    officialEmailDomain: "",
    preInstalledSoftware: [],
    employeeInstalledSoftware: [],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [requestHistoryFilter, setRequestHistoryFilter] = useState("wip");
  const [roleQueueFilter, setRoleQueueFilter] = useState("pending");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [editingHrRequestId, setEditingHrRequestId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const auditSectionRef = useRef(null);

  const currentUserRequest = useMemo(() => {
    const currentEmail = (currentUser?.email || "").trim().toLowerCase();
    if (!currentEmail) return null;

    return requests.find((request) => {
      const personalEmail = (request.formData?.personalEmail || "").trim().toLowerCase();
      const officialEmail = (request.officialEmail || "").trim().toLowerCase();
      return personalEmail === currentEmail || officialEmail === currentEmail;
    }) || null;
  }, [requests, currentUser]);

  const fetchUsersData = async () => {
    const { ok, data } = await api.fetchUsers();
    return ok && data && Array.isArray(data.users) ? data.users : [];
  };

  const fetchWorkflowOptionsData = async (department) => {
    const { ok, data } = await api.fetchWorkflowOptions(department);
    if (ok && data) {
      return {
        officialEmailDomain: typeof data.officialEmailDomain === 'string' ? data.officialEmailDomain : '',
        preInstalledSoftware: Array.isArray(data.preInstalledSoftware) ? data.preInstalledSoftware : [],
        employeeInstalledSoftware: Array.isArray(data.employeeInstalledSoftware) ? data.employeeInstalledSoftware : [],
      };
    }
    return { officialEmailDomain: '', preInstalledSoftware: [], employeeInstalledSoftware: [] };
  };

  function getAllowedPagesForUser(user, userRequest, requestsReady = true) {
    if (!user) return [pages.login];
    
    // Check if user's own onboarding is complete
    const isApproved = userRequest?.stage === workflowStages.approved;
    const isHrDept = user.department?.trim().toUpperCase() === "HR";
    const role = normalizeRole(user.role);
    const hasUserRequest = requestsReady ? Boolean(userRequest) : true;

    // Hard Gatekeeping: employees with incomplete onboarding stay on status page
    const isStaff = isStaffWorkflowUser(user);
    if (userRequest && !isApproved && !isStaff) {
      return [pages.status, myProfileKey];
    }

    let allowed = [];
    
    // 1. Determine Landing Page (First in array)
    if (isHrDept) {
      allowed.push(pages.submit);
    } else if (role === "Admin") {
      allowed.push(pages.admin);
    } else if (role === "Manager") {
      allowed.push(pages.manager);
    } else if (role === "HOD") {
      allowed.push(pages.hod);
    } else if (role === "Infrastructure Admin") {
      allowed.push(pages.infraAdmin);
    } else if (role === "Infrastructure Executive") {
      allowed.push(pages.infraExecutive);
    } else if (hasUserRequest) {
      allowed.push(pages.status);
    } else {
      allowed.push(myProfileKey);
    }

    // 2. Add other accessible pages
    if (role === "Admin" && !allowed.includes(pages.admin)) allowed.push(pages.admin);
    if (role === "Manager" && !allowed.includes(pages.manager)) allowed.push(pages.manager);
    if (role === "HOD" && !allowed.includes(pages.hod)) allowed.push(pages.hod);
    if (role === "Infrastructure Admin" && !allowed.includes(pages.infraAdmin)) allowed.push(pages.infraAdmin);
    if (role === "Infrastructure Executive" && !allowed.includes(pages.infraExecutive)) allowed.push(pages.infraExecutive);
    
    if (role === "Manager" || role === "HOD" || role === "HR" || isHrDept || role === "Infrastructure Admin" || role === "Infrastructure Executive") {
      if (!allowed.includes(pages.requests)) allowed.push(pages.requests);
    }
    
    if (role === "HR" || isHrDept) {
      if (!allowed.includes(pages.submit)) allowed.push(pages.submit);
    }

    if (hasUserRequest && !allowed.includes(pages.status)) allowed.push(pages.status);
    if (!allowed.includes(myProfileKey)) allowed.push(myProfileKey);

    return allowed;
  }

  function resolveAllowedPage(user, userRequest, requestedPage, requestsReady = true) {
    const allowed = getAllowedPagesForUser(user, userRequest, requestsReady);
    if (requestedPage && allowed.includes(requestedPage)) return requestedPage;
    return allowed[0] || pages.login;
  }

  useEffect(() => {
    const allowed = getAllowedPagesForUser(currentUser, currentUserRequest, requestsLoaded);
    if (!allowed.includes(currentPage)) {
      const targetPage = allowed[0] || pages.login;
      if (currentPage !== targetPage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(targetPage);
      }
    }
    setRoutePage(currentPage);
  }, [currentPage, isAuthenticated, currentUser, currentUserRequest, requestsLoaded]);

  useEffect(() => {
    const initData = async () => {
      const options = await fetchWorkflowOptionsData(currentUser?.department);
      setWorkflowOptions(options);
      if (isAuthenticated) {
        setAllUsers(await fetchUsersData());
        await handleRefreshRequests();
      }
    };
    initData();
  }, [isAuthenticated, currentUser?.department]);

  const showNotice = (type, title, message) => {
    setNotice({ type, title, message });
  };

  const handleRefreshRequests = async () => {
    try {
      const { ok, data } = await api.fetchRequests();
      if (ok && data && Array.isArray(data.requests)) {
        setRequests(data.requests.map((r, idx) => normalizeRequestRecord(r, idx + 1)));
      }
      setRequestsLoaded(true);
    } catch (err) {
      console.error("Failed to load requests", err);
    }
  };

  const handleLogin = async (email, password) => {
    const { ok, data } = await api.login(email, password);
    if (ok) {
      if (!data.user.isActive) {
        showNotice("error", "Account Deactivated", "Your account has been deactivated. Please contact HR.");
        return;
      }
      const normalizedUser = {
        ...data.user,
        role: normalizeRole(data.user?.role),
      };
      setIsAuthenticated(true);
      setCurrentUser(normalizedUser);
      writeStoredSession({ user: normalizedUser, token: data.token });
      
      // We don't have requests yet for the new user, so keep request-based tabs available until data loads
      setCurrentPage(resolveAllowedPage(normalizedUser, null, null, false));
      showNotice("success", "Welcome Back", `Logged in as ${normalizedUser.name}`);
    } else {
      showNotice("error", "Login Failed", data.message || "Invalid email or password.");
    }
  };

  const handleAddUser = async (user) => {
    const { ok, data } = await api.createUser(user, currentUser?.id);
    if (ok) {
      showNotice("success", "User Created", "New portal user has been registered successfully.");
      setAllUsers(await fetchUsersData());
      return { ok: true };
    } else {
      showNotice("error", "Creation Failed", data.message);
      return { ok: false };
    }
  };

  const handleUpdateUser = async (user) => {
    const { ok, data } = await api.updateUser(user, currentUser?.id);
    if (ok) {
      showNotice("success", "User Updated", "User details and permissions updated.");
      setAllUsers(await fetchUsersData());
    } else {
      showNotice("error", "Update Failed", data.message);
    }
  };

  const handleDeleteUser = async (email, archiveRequest = false) => {
    const { ok, data } = await api.deleteUser(email, currentUser?.id, archiveRequest);
    if (ok) {
      showNotice("success", "User Deleted", data.message);
      setAllUsers(await fetchUsersData());
      return { ok: true };
    } else {
      showNotice("error", "Failed to Delete User", data.message);
      return { ok: false };
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    writeStoredSession(null);
    setCurrentPage(pages.login);
    setRoutePage(pages.login);
    showNotice("warning", "Logged Out", "You have been successfully logged out.");
  };

  const getBadgeCount = (key) => {
    if (!userFilteredRequests.length || !currentUser) return 0;

    if (key === pages.manager) {
      return countPendingForPage(userFilteredRequests, pages.manager, pages);
    }
    if (key === pages.hod) {
      return countPendingForPage(userFilteredRequests, pages.hod, pages);
    }
    if (key === pages.infraAdmin) {
      return countPendingForPage(userFilteredRequests, pages.infraAdmin, pages);
    }
    if (key === pages.infraExecutive) {
      return countPendingForPage(userFilteredRequests, pages.infraExecutive, pages);
    }
    if (key === pages.hr || (key === pages.submit && isHrUser(currentUser))) {
      return userFilteredRequests.filter((r) => r.stage === workflowStages.hr).length;
    }
    if (key === pages.requests) {
      return countPendingForUser(userFilteredRequests, currentUser, pages);
    }
    return 0;
  };

  const getQueueTitle = () => {
    if (currentPage === pages.admin) return "Global Workflow Queue";
    if (currentPage === pages.requests) {
      return isGlobalQueueViewer(currentUser) ? "All Requests" : "My Request Queue";
    }
    if (currentPage === pages.submit && isHrUser(currentUser)) return "HR Review Queue";
    const labels = {
      [pages.manager]: "Line Manager Queue",
      [pages.hod]: "HOD Queue",
      [pages.infraAdmin]: "Infrastructure Admin Queue",
      [pages.infraExecutive]: "Infrastructure Executive Queue",
    };
    return labels[currentPage] || "Your Active Queue";
  };

  const getQueueSubtitle = () => {
    if (isGlobalQueueViewer(currentUser) && [pages.admin, pages.requests].includes(currentPage)) {
      return "Full visibility across every onboarding request in the system.";
    }
    if (currentPage === pages.requests) {
      return "Requests assigned to you and cases you have completed.";
    }
    return "Switch tabs to review pending items or completed cases.";
  };

  const handlePageChange = (pageKey) => {
    setCurrentPage(pageKey);
    setSearchTerm("");
    setSelectedRequestId(null);
    if (pageKey === pages.submit && isHrUser(currentUser)) {
      setRequestHistoryFilter("hr_review");
    } else {
      setRoleQueueFilter("pending");
      setRequestHistoryFilter("wip");
    }
  };

  const enhancedSaveRequest = async (payload, defaultActionType = "Update") => {
    return await api.saveRequest({
      ...payload,
      actorId: currentUser?.id,
      actionType: payload.actionType || defaultActionType
    });
  };

  const handleOnboardingSubmit = async (formData) => {
    if (editingHrRequestId) {
      const { ok, data } = await enhancedSaveRequest({ 
      id: editingHrRequestId, 
      stage: workflowStages.manager, 
      officialEmail: `${formData.officialEmailUser}${workflowOptions.officialEmailDomain || ""}`,
      formData,
      actionType: "HR Edit/Resubmit"
      });
      if (ok) {
      showNotice("success", "Update Successful", "The onboarding request has been updated and sent to Manager.");
      await handleRefreshRequests();
      setEditingHrRequestId(null);
      setCurrentPage(pages.submit);
      return { ok: true, message: data.message };
      } else {
        return { ok: false, message: data.message, errors: data.errors };
      }
    } else {
      const { ok, data } = await api.sendOnboardingMail(formData, currentUser?.id);
      if (ok) {
        showNotice("success", "Submission Successful", "The onboarding request has been initiated.");
        await handleRefreshRequests();
        return { ok: true, message: data.message };
      } else {
        return { ok: false, message: data.message, errors: data.errors };
      }
    }
  };

  const handleSaveSoftware = async (id, softwareList, role, overrides = {}) => {
    const payload = {
      id,
      ...overrides,
    };

    if (role === pages.manager || role === pages.infraAdmin) {
      payload.managerSoftware = softwareList;
    }

    if (role === pages.infraAdmin && currentUser?.id) {
      payload.infraAdminId = currentUser.id;
    }

    const saveActionTypes = {
      [pages.manager]: "Manager Update",
      [pages.hod]: "HOD Update",
      [pages.infraAdmin]: "Infra Admin Update",
      [pages.infraExecutive]: "Infra Exec Update",
      [pages.admin]: "Admin Override",
    };

    const { ok, data } = await enhancedSaveRequest(payload, saveActionTypes[role] || "Update");
    if (ok) {
      showNotice("success", "Saved", "Details saved successfully.");
      await handleRefreshRequests();
    } else {
      showNotice("error", "Error", data.message || "Failed to save details. Check for invalid or gibberish text.");
    }
  };

  const userFilteredRequests = useMemo(
    () => filterRequestsForUserScope(requests, currentUser),
    [requests, currentUser],
  );

  const queueTabConfig = useMemo(() => {
    if (!currentUser || !isWorkflowDashboardPage(currentPage)) {
      return { tabs: [], activeTab: null, onTabChange: () => {} };
    }

    const globalViewer = isGlobalQueueViewer(currentUser);
    const usesGlobalTabs = globalViewer && (currentPage === pages.admin || currentPage === pages.requests);

    if (usesGlobalTabs) {
      const wipCount = userFilteredRequests.filter((r) =>
        [workflowStages.manager, workflowStages.hod, workflowStages.hr, workflowStages.infraAdmin, workflowStages.infraExecutive].includes(r.stage),
      ).length;
      const hrCount = userFilteredRequests.filter((r) => r.stage === workflowStages.hr).length;

      return {
        tabs: globalQueueFilters.map((tab) => ({
          ...tab,
          badge: tab.key === "wip" ? wipCount : tab.key === "hr_review" ? hrCount : 0,
        })),
        activeTab: requestHistoryFilter,
        onTabChange: setRequestHistoryFilter,
      };
    }

    const rolePages = [pages.manager, pages.hod, pages.hr, pages.infraAdmin, pages.infraExecutive, pages.requests];
    if (rolePages.includes(currentPage)) {
      const pendingCount = [pages.manager, pages.hod, pages.hr, pages.infraAdmin, pages.infraExecutive].includes(currentPage)
        ? countPendingForPage(userFilteredRequests, currentPage, pages)
        : countPendingForUser(userFilteredRequests, currentUser, pages);

      return {
        tabs: roleQueueFilters.map((tab) => ({
          ...tab,
          badge: tab.key === "pending" ? pendingCount : 0,
        })),
        activeTab: roleQueueFilter,
        onTabChange: setRoleQueueFilter,
      };
    }

    return { tabs: [], activeTab: null, onTabChange: () => {} };
  }, [currentUser, currentPage, userFilteredRequests, requestHistoryFilter, roleQueueFilter]);

  const visibleRequests = useMemo(() => {
    const globalViewer = isGlobalQueueViewer(currentUser);
    let filterKey = null;

    if (isWorkflowDashboardPage(currentPage)) {
      if (globalViewer && (currentPage === pages.admin || currentPage === pages.requests || currentPage === pages.submit)) {
        filterKey = requestHistoryFilter;
      } else if ([pages.manager, pages.hod, pages.infraAdmin, pages.infraExecutive, pages.requests].includes(currentPage)) {
        filterKey = roleQueueFilter;
      }
    }

    let filtered = userFilteredRequests;
    if (filterKey) {
      filtered = applyQueueTabFilter(filtered, filterKey, {
        user: currentUser,
        currentPage,
        pagesMap: pages,
      });
    }

    return filtered.filter((r) => matchesSearch(r, searchTerm)).sort((a, b) => b.id - a.id);
  }, [userFilteredRequests, currentPage, searchTerm, requestHistoryFilter, roleQueueFilter, currentUser]);

  useEffect(() => {
    if (!selectedRequestId) return;
    const selectedVisible = visibleRequests.some((request) => request.id === selectedRequestId);
    if (!selectedVisible) {
      setSelectedRequestId(null);
    }
  }, [selectedRequestId, visibleRequests]);

  const handleSelectRequest = (id) => {
    setSelectedRequestId(id);
    if (currentPage === pages.admin && auditSectionRef.current) {
      auditSectionRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectedRequest = useMemo(() => requests.find(r => r.id === selectedRequestId) || null, [requests, selectedRequestId]);

  return (
    <div className="app-shell">
      <ConfirmationModal config={confirmConfig} onCancel={() => setConfirmConfig(null)} />
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-badge">OA</div>
          <div><small>ONBOARDING CONTROL</small><strong>Workflow Portal</strong></div>
        </div>
        {isAuthenticated && (
          <nav className="app-nav">
              {pageOptions
              .filter((opt) => getAllowedPagesForUser(currentUser, currentUserRequest, requestsLoaded).includes(opt.key))
              .map((pageOption) => (
                <button
                  key={pageOption.key}
                  type="button"
                  className={currentPage === pageOption.key ? "nav-pill nav-pill-active" : "nav-pill"}
                  onClick={() => handlePageChange(pageOption.key)}
                >
                  {pageOption.label}
                  {getBadgeCount(pageOption.key) > 0 && (
                    <span className="nav-badge">{getBadgeCount(pageOption.key)}</span>
                  )}
                </button>
              ))}
            <button type="button" className="nav-pill" onClick={handleLogout} style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)" }}>Logout</button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {isAuthenticated && ![pages.submit, myProfileKey].includes(currentPage) && (isHrUser(currentUser) || isAdmin(currentUser)) && <SummaryStrip requests={userFilteredRequests} />}
        <AppNotice notice={notice} onClear={() => setNotice(null)} />

        <PageErrorBoundary key={currentPage}>
          {!isAuthenticated ? (
            <div style={{ maxWidth: 400, margin: '40px auto 80px' }}>
              <Login onLogin={handleLogin} onForgotPassword={api.forgotPassword} onVerifyOtp={api.verifyOtp} onResetPassword={api.resetPassword} />
            </div>
          ) : (
            <>
              {currentPage === myProfileKey && (
                <ProfileDashboard 
                  user={currentUser} 
                  request={currentUserRequest}
                  onUpdateProfile={(updated) => {
                    setCurrentUser(updated);
                    writeStoredSession({ user: updated });
                  }}
                  onShowNotice={showNotice}
                />
              )}

              {currentPage === pages.admin && (
                <>
                  <AdminDashboard
                    users={allUsers}
                    currentUser={currentUser}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser} 
                    onDeleteUser={handleDeleteUser}
                    onShowConfirm={setConfirmConfig}
                    onShowNotice={showNotice}
                    onRefreshRequests={handleRefreshRequests}
                    apiBaseUrl={api.getBaseUrl()} 
                  />
                  <div ref={auditSectionRef}>
                    {queueTabConfig.tabs.length > 0 ? (
                      <DashboardTabBar
                        tabs={queueTabConfig.tabs}
                        activeTab={queueTabConfig.activeTab}
                        onTabChange={queueTabConfig.onTabChange}
                      />
                    ) : null}
                    <div className="dashboard-layout" style={{ marginTop: queueTabConfig.tabs.length ? 0 : 40 }}>
                    <RequestDetailPanel
                      key={`${selectedRequest?.id}-${selectedRequest?.revisionCount}`}
                      request={selectedRequest}
                      role={pages.admin}
                      userDepartment={currentUser?.department}
                      allUsers={allUsers}
                      onShowNotice={showNotice}
                      onSaveSoftware={handleSaveSoftware}
                      onAcknowledgeLaptop={async (id) => {
                        const { ok, data } = await api.acknowledgeLaptop(id);
                        if (ok) {
                          showNotice("success", "Acknowledged", "You have successfully acknowledged the receipt of your laptop.");
                          handleRefreshRequests();
                        } else {
                          showNotice("error", "Error", data.message || "Failed to acknowledge laptop receipt.");
                        }
                      }}
                      onArchiveRequest={(id) => {
                        setConfirmConfig({
                          title: "Archive Onboarding Request?",
                          message: "This will move the request to 'Archived Requests'. It will be hidden from operational views but can be restored later.",
                          confirmLabel: "Archive Request",
                          tone: "primary",
                          onConfirm: async () => {
                            const { ok, data } = await api.archiveRequest(id, currentUser?.id);
                            if (ok) {
                              showNotice("success", "Archived", data.message || "Request archived successfully.");
                              handleRefreshRequests();
                              setSelectedRequestId(null);
                            } else {
                              showNotice("error", "Error", data.message || "Failed to archive request.");
                            }
                          }
                        });
                      }}
                      onDeleteRequest={(id) => {
                        setConfirmConfig({
                          title: "Permanently Delete Request?",
                          message: "CRITICAL: This will PERMANENTLY remove this record from the database. This action CANNOT be undone. Proceed with extreme caution.",
                          confirmLabel: "Delete Permanently",
                          tone: "danger",
                          onConfirm: async () => {
                            const { ok, data } = await api.deleteRequest(id, currentUser?.id);
                            if (ok) {
                              showNotice("success", "Deleted", data.message || "Request removed permanently.");
                              handleRefreshRequests();
                              setAllUsers(await fetchUsersData());
                              setSelectedRequestId(null);
                            } else {
                              showNotice("error", "Error", data.message || "Failed to delete request.");
                            }
                          }
                        });
                      }}
                    />
                    <RequestTable 
                      title={getQueueTitle()} 
                      subtitle={getQueueSubtitle()} 
                      searchTerm={searchTerm} 
                      onSearchChange={setSearchTerm} 
                      requests={visibleRequests} 
                      selectedRequestId={selectedRequestId} 
                      onSelectRequest={handleSelectRequest} 
                    />
                    </div>
                  </div>
                </>
              )}

              {(currentPage === pages.hr || currentPage === pages.submit) && (
                <HRDashboard
                  requests={requests}
                  currentUser={currentUser}
                  allUsers={allUsers}
                  workflowOptions={workflowOptions}
                  selectedRequestId={selectedRequestId}
                  onSelectRequest={handleSelectRequest}
                  onShowNotice={showNotice}
                  onSubmitForm={handleOnboardingSubmit}
                  onApprove={async (id) => {
                    const { ok, data } = await api.finalizeOnboarding({
                      requestCode: requests.find(r => r.id === id)?.requestCode,
                      name: requests.find(r => r.id === id)?.formData?.name,
                      email: requests.find(r => r.id === id)?.officialEmail,
                      department: requests.find(r => r.id === id)?.formData?.department,
                      employeeCode: requests.find(r => r.id === id)?.employeeCode || "",
                      actorId: currentUser?.id,
                      actionType: "HR Final Approval"
                    });
                    if (ok) {
                      showNotice("success", "Finalized", "Request approved and finalized by HR.");
                      setSelectedRequestId(null);
                      handleRefreshRequests();
                      setAllUsers(await fetchUsersData());
                    } else {
                      showNotice("error", "Error", data.message || "Failed to finalize request.");
                    }
                  }}
                  onSendToHr={async (id, actor, reason) => {
                    const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.hr, reviewRequestedBy: actor, reviewReason: reason }, "Sent to HR Review");
                    if (ok) { showNotice("warning", "Sent to HR", "Request sent back for HR review."); setSelectedRequestId(null); handleRefreshRequests(); }
                    else { showNotice("error", "Error", data?.message || "Failed to send to HR."); }
                  }}
                  onStopCase={async (id, reason) => {
                    const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.stopped, stopReason: reason }, "Stopped Case");
                    if (ok) { showNotice("error", "Stopped", "Onboarding case has been stopped."); setSelectedRequestId(null); handleRefreshRequests(); }
                    else { showNotice("error", "Error", data?.message || "Failed to stop case."); }
                  }}
                  onSaveSoftware={handleSaveSoftware}
                  onStartHrEdit={(id) => {
                    setEditingHrRequestId(id);
                    setCurrentPage(pages.submit);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  editingHrRequestId={editingHrRequestId}
                  setEditingHrRequestId={setEditingHrRequestId}
                  onRefreshRequests={handleRefreshRequests}
                  onFetchUsersData={fetchUsersData}
                  queueTabConfig={queueTabConfig}
                  visibleRequests={visibleRequests}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  getQueueTitle={getQueueTitle}
                  getQueueSubtitle={getQueueSubtitle}
                />
              )}

              {isWorkflowDashboardPage(currentPage) && currentPage !== pages.admin && currentPage !== pages.hr && currentPage !== pages.submit && (
                <>
                  {queueTabConfig.tabs.length > 0 ? (
                    <DashboardTabBar
                      tabs={queueTabConfig.tabs}
                      activeTab={queueTabConfig.activeTab}
                      onTabChange={queueTabConfig.onTabChange}
                    />
                  ) : null}
                <div className="dashboard-layout">
                    <RequestDetailPanel 
                      key={`${selectedRequest?.id}-${selectedRequest?.revisionCount}`}
                      request={selectedRequest} 
                      role={currentPage} 
                      userDepartment={currentUser?.department}
                      allUsers={allUsers}
                      onShowNotice={showNotice}
                      onSaveSoftware={handleSaveSoftware}
                      onStartHrEdit={(id) => {
                        setEditingHrRequestId(id);
                        setCurrentPage(pages.submit);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onApprove={async (id) => {
                        if (currentPage === pages.manager) {
                          const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.hod }, "Approve to HOD");
                          if (ok) { showNotice("success", "Approved", "Request forwarded to HOD."); setSelectedRequestId(null); handleRefreshRequests(); }
                          else { showNotice("error", "Error", data.message || "Failed to approve request."); }
                        } else if (currentPage === pages.hod) {
                          const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.infraAdmin }, "Approve to Infra Admin");
                          if (ok) { showNotice("success", "Approved", "Request forwarded to Infrastructure Admin."); setSelectedRequestId(null); handleRefreshRequests(); }
                          else { showNotice("error", "Error", data.message || "Failed to approve request."); }
                        } else if (currentPage === pages.infraAdmin) {
                          const { ok, data } = await enhancedSaveRequest({ 
                            id, 
                            stage: workflowStages.infraExecutive,
                            infraAdminId: currentUser?.id 
                          }, "Approve to Infra Exec");
                          if (ok) { showNotice("success", "Approved", "Request forwarded to Infrastructure Executive."); setSelectedRequestId(null); handleRefreshRequests(); }
                          else { showNotice("error", "Error", data.message || "Failed to approve request."); }
                        } else if (currentPage === pages.infraExecutive) {
                          const requestToFinalize = requests.find(r => r.id === id);
                          if (!requestToFinalize) return;

                          const { requestCode, formData, officialEmail } = requestToFinalize;
                          const { name, department } = formData;

                          if (!officialEmail) {
                            showNotice("error", "Validation Error", "Official email is missing. Please ensure the official email is set before final approval.");
                            return;
                          }

                          // Finalize and create user (This API call also marks the request as 'approved' in the DB)
                          // Also track it in the changelog via a separate call if needed, but finalizeOnboarding can do it.
                          // Wait, api.finalizeOnboarding doesn't take actorId. Let's send actorId anyway.
                          const { ok, data } = await api.finalizeOnboarding({
                            requestCode: requestCode,
                            name: name,
                            email: officialEmail,
                            department: department,
                            employeeCode: requestToFinalize.employeeCode || "",
                            actorId: currentUser?.id,
                            actionType: "Final Approval"
                          });

                          if (ok) { 
                            const successMsg = `Onboarding finalized for ${name}. Employee Code: ${data.employeeCode || "assigned"}. A welcome email has been sent to the personal and official accounts.`;
                            showNotice("success", "Onboarding Complete", successMsg); 
                            setSelectedRequestId(null);
                            handleRefreshRequests(); 
                            setAllUsers(await fetchUsersData()); 
                          } else {
                            showNotice("error", "Error Finalizing", data.message || "Final approval failed. Please verify the details and try again.");
                            handleRefreshRequests();
                          }
                        }
                      }}
                      onSendToHr={async (id, actor, reason) => {
                        const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.hr, reviewRequestedBy: actor, reviewReason: reason }, "Sent to HR Review");
                        if (ok) { showNotice("warning", "Sent to HR", "Request sent back for HR review."); setSelectedRequestId(null); handleRefreshRequests(); }
                        else { showNotice("error", "Error", data?.message || "Failed to send to HR."); }
                      }}
                      onStopCase={async (id, reason) => {
                        const { ok, data } = await enhancedSaveRequest({ id, stage: workflowStages.stopped, stopReason: reason }, "Stopped Case");
                        if (ok) { showNotice("error", "Stopped", "Onboarding case has been stopped."); setSelectedRequestId(null); handleRefreshRequests(); }
                        else { showNotice("error", "Error", data?.message || "Failed to stop case."); }
                      }}
                    />
                    <RequestTable 
                      title={getQueueTitle()} 
                      subtitle={getQueueSubtitle()} 
                      searchTerm={searchTerm} 
                      onSearchChange={setSearchTerm} 
                      requests={visibleRequests} 
                      selectedRequestId={selectedRequestId} 
                      onSelectRequest={handleSelectRequest} 
                    />
                </div>
                </>
              )}

              {currentPage === pages.status && (
                <section className="dashboard-panel">
                  <div className="dashboard-head">
                    <div>
                      <h2>My Onboarding Record</h2>
                      <p>View your completed onboarding details and software setup</p>
                    </div>
                  </div>
                  {(() => {
                    if (!requestsLoaded) return <div className="request-empty">Loading your onboarding record...</div>;
                    if (!currentUserRequest) return <div className="request-empty">No onboarding record found for your email.</div>;
                    return (
                      <div className="dashboard-layout">
                        <RequestDetailPanel
                          key={`${currentUserRequest?.id}-${currentUserRequest?.revisionCount || 0}`}
                          request={currentUserRequest}
                          role={pages.status} 
                          onShowNotice={showNotice} 
                          onAcknowledgeLaptop={async (id) => {
                            const { ok, data } = await api.acknowledgeLaptop(id);
                            if (ok) {
                              showNotice("success", "Acknowledged", "You have successfully acknowledged the receipt of your laptop.");
                              handleRefreshRequests();
                            } else {
                              showNotice("error", "Error", data.message || "Failed to acknowledge laptop receipt.");
                            }
                          }}
                        />
                      </div>
                    );
                  })()}
                </section>
              )}
            </>
          )}
        </PageErrorBoundary>
      </main>
    </div>
  );
}

export default App;
