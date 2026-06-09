import { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

import HRForm from "./HRForm";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";

// Components
import AppNotice from "./components/AppNotice";
import PageErrorBoundary from "./components/PageErrorBoundary";
import SummaryStrip from "./components/SummaryStrip";
import RequestTable from "./components/RequestTable";
import RequestDetailPanel from "./components/RequestDetailPanel";
import SoftwareSection from "./components/SoftwareSection";

// Constants & Utils
import { pages, workflowStages, pageOptions } from "./constants";
import {
  normalizeRequestRecord,
  matchesSearch,
  normalizeRole,
  validateName,
  validateEmail,
  validateEmployeePhoneNumber,
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
  return [pages.admin, pages.manager, pages.hod, pages.hr, pages.requests].includes(page);
}

function ConfirmationModal({ config, onCancel }) {
  if (!config) return null;
  const { title, message, confirmLabel, onConfirm, tone = "primary" } = config;

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
                onChange={(e) => setOtp(e.target.value)} 
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
              <input type="text" className="dashboard-search" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Personal Email</label>
              <input type="email" className="dashboard-search" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" className="dashboard-search" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder="10-digit number" />
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Change Password</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                <input type="password" placeholder="New password (min 8 chars)" className="dashboard-search" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <input type="password" placeholder="Confirm new password" className="dashboard-search" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
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
              <strong>{request.assetCode || "Pending Assignment"}</strong>
            </div>
            <div>
              <span>Official Email</span>
              <strong>{request.officialEmail || "Pending Creation"}</strong>
            </div>
          </div>

          <SoftwareSection
            title="Pre-installed on company laptop"
            tone="blue"
            items={request.preInstalledSoftware}
          />

          <SoftwareSection
            title="To be installed by you"
            tone="yellow"
            items={request.employeeInstalledSoftware}
          />

          <SoftwareSection
            title="Special software approved by Manager"
            tone="orange"
            items={request.managerSoftware}
            headerLabel={request.formData.lineManager}
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
      return resolveAllowedPage(storedSession.user, requestedPage);
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
  const [requestHistoryFilter, setRequestHistoryFilter] = useState("wip"); // wip, stopped, approved
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [editingHrRequestId, setEditingHrRequestId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const auditSectionRef = useRef(null);

  const fetchUsersData = async () => {
    const { ok, data } = await api.fetchUsers();
    return ok && data && Array.isArray(data.users) ? data.users : [];
  };

  const fetchWorkflowOptionsData = async () => {
    const { ok, data } = await api.fetchWorkflowOptions();
    if (ok && data) {
      return {
        officialEmailDomain: typeof data.officialEmailDomain === 'string' ? data.officialEmailDomain : '',
        preInstalledSoftware: Array.isArray(data.preInstalledSoftware) ? data.preInstalledSoftware : [],
        employeeInstalledSoftware: Array.isArray(data.employeeInstalledSoftware) ? data.employeeInstalledSoftware : [],
      };
    }
    return { officialEmailDomain: '', preInstalledSoftware: [], employeeInstalledSoftware: [] };
  };

  function getAllowedPagesForUser(user) {
    if (!user) return [pages.login];
    const role = normalizeRole(user.role);
    const isHrDept = user.department?.trim().toUpperCase() === "HR";
    
    let allowed = [];
    
    // 1. Determine Landing Page (First in array)
    if (isHrDept) {
      allowed.push(pages.submit); // HR lands on the Form
    } else if (role === "Admin") {
      allowed.push(pages.admin);
    } else if (role === "Manager") {
      allowed.push(pages.manager);
    } else if (role === "HOD") {
      allowed.push(pages.hod);
    } else {
      allowed.push(pages.status); // Default for General Employee
    }

    // 2. Add other accessible pages
    if (role === "Admin" && !allowed.includes(pages.admin)) allowed.push(pages.admin);
    if (role === "Manager" && !allowed.includes(pages.manager)) allowed.push(pages.manager);
    if (role === "HOD" && !allowed.includes(pages.hod)) allowed.push(pages.hod);
    
    if (role === "Manager" || role === "HOD" || role === "HR" || isHrDept) {
      if (!allowed.includes(pages.requests)) allowed.push(pages.requests);
    }
    
    // HR role members can see the HR dashboard regardless of department? 
    // Usually HR role = HR Dept, but let's be safe.
    if (role === "HR" || isHrDept) {
      if (!allowed.includes(pages.hr)) allowed.push(pages.hr);
      if (!allowed.includes(pages.submit)) allowed.push(pages.submit);
    }

    if (!allowed.includes(pages.status)) allowed.push(pages.status);
    if (!allowed.includes(myProfileKey)) allowed.push(myProfileKey);

    return allowed;
  }

  function resolveAllowedPage(user, requestedPage) {
    const allowed = getAllowedPagesForUser(user);
    if (requestedPage && allowed.includes(requestedPage)) return requestedPage;
    return allowed[0] || pages.login;
  }

  useEffect(() => {
    const allowed = getAllowedPagesForUser(currentUser);
    if (!allowed.includes(currentPage)) {
      const targetPage = allowed[0] || pages.login;
      if (currentPage !== targetPage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(targetPage);
      }
    }
    setRoutePage(currentPage);
  }, [currentPage, isAuthenticated, currentUser]);

  useEffect(() => {
    const initData = async () => {
      const options = await fetchWorkflowOptionsData();
      setWorkflowOptions(options);
      if (isAuthenticated) {
        setAllUsers(await fetchUsersData());
        await handleRefreshRequests();
      }
    };
    initData();
  }, [isAuthenticated]);

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
      writeStoredSession({ user: normalizedUser });
      setCurrentPage(resolveAllowedPage(normalizedUser, null));
      showNotice("success", "Welcome Back", `Logged in as ${normalizedUser.name}`);
    } else {
      showNotice("error", "Login Failed", data.message || "Invalid email or password.");
    }
  };

  const handleAddUser = async (user) => {
    const { ok, data } = await api.createUser(user);
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
    const { ok, data } = await api.updateUser(user);
    if (ok) {
      showNotice("success", "User Updated", "User details and permissions updated.");
      setAllUsers(await fetchUsersData());
    } else {
      showNotice("error", "Update Failed", data.message);
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
    setCurrentPage(pages.login);
    setRoutePage(pages.login);
    showNotice("warning", "Logged Out", "You have been successfully logged out.");
  };

  const getBadgeCount = (key) => {
    if (!userFilteredRequests.length || !currentUser) return 0;
    const role = normalizeRole(currentUser.role);
    const isHrDept = currentUser.department?.trim().toUpperCase() === "HR";
    
    if (key === pages.manager) {
      return userFilteredRequests.filter(r => r.stage === workflowStages.manager).length;
    }
    if (key === pages.hod) {
      return userFilteredRequests.filter(r => r.stage === workflowStages.hod).length;
    }
    if (key === pages.hr) {
      return userFilteredRequests.filter(r => r.stage === workflowStages.hr).length;
    }
    if (key === pages.requests) {
      // For the history/global tab, only show a badge for what the user can ACT on
      if (role === "Manager") {
        return userFilteredRequests.filter(r => r.stage === workflowStages.manager).length;
      }
      if (role === "HOD") {
        return userFilteredRequests.filter(r => r.stage === workflowStages.hod).length;
      }
      if (role === "HR" || isHrDept) {
        return userFilteredRequests.filter(r => r.stage === workflowStages.hr).length;
      }
    }
    return 0;
  };

  const handleOnboardingSubmit = async (formData) => {
    if (editingHrRequestId) {
      const { ok, data } = await api.saveRequest({ 
        id: editingHrRequestId, 
        stage: workflowStages.manager, 
        formData 
      });
      if (ok) {
        showNotice("success", "Update Successful", "The onboarding request has been updated and sent to Manager.");
        await handleRefreshRequests();
        setEditingHrRequestId(null);
        setCurrentPage(pages.hr);
        return { ok: true, message: data.message };
      } else {
        return { ok: false, message: data.message, errors: data.errors };
      }
    } else {
      const { ok, data } = await api.sendOnboardingMail(formData);
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

    if (role === pages.manager) {
      payload.managerSoftware = softwareList;
    }

    const { ok, data } = await api.saveRequest(payload);
    if (ok) {
      showNotice("success", "Saved", "Software and asset details updated.");
      await handleRefreshRequests();
    } else {
      showNotice("error", "Error", data.message || "An unexpected error occurred while saving details.");
    }
  };

  const userFilteredRequests = useMemo(() => {
    if (!currentUser) return [];
    const isHrDept = currentUser.department?.trim().toUpperCase() === "HR";
    const role = normalizeRole(currentUser.role);
    if (isHrDept || role === "Admin") return requests;
    if (role === "Manager") return requests.filter(r => r.formData.lineManager === currentUser.name);
    if (role === "HOD") return requests.filter(r => r.formData.hod === currentUser.name);
    return [];
  }, [requests, currentUser]);

  const handleSelectRequest = (id) => {
    setSelectedRequestId(id);
    if (currentPage === pages.admin && auditSectionRef.current) {
      auditSectionRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const visibleRequests = useMemo(() => {
    let filtered = userFilteredRequests;
    if (currentPage === pages.manager) {
      filtered = userFilteredRequests.filter(r => r.stage === workflowStages.manager);
    } else if (currentPage === pages.hod) {
      filtered = userFilteredRequests.filter(r => r.stage === workflowStages.hod);
    } else if (currentPage === pages.hr) {
      filtered = userFilteredRequests.filter(r => r.stage === workflowStages.hr);
    } else if (currentPage === pages.requests || currentPage === pages.admin) {
      if (requestHistoryFilter === "wip") {
        filtered = userFilteredRequests.filter(r => [workflowStages.manager, workflowStages.hod, workflowStages.hr].includes(r.stage));
      } else if (requestHistoryFilter === "hr_review") {
        filtered = userFilteredRequests.filter(r => r.stage === workflowStages.hr);
      } else if (requestHistoryFilter === "stopped") {
        filtered = userFilteredRequests.filter(r => r.stage === workflowStages.stopped);
      } else if (requestHistoryFilter === "approved") {
        filtered = userFilteredRequests.filter(r => r.stage === workflowStages.approved);
      }
    }
    return filtered.filter(r => matchesSearch(r, searchTerm)).sort((a, b) => b.id - a.id);
  }, [userFilteredRequests, currentPage, searchTerm, requestHistoryFilter]);

  const selectedRequest = useMemo(() => requests.find(r => r.id === selectedRequestId) || null, [requests, selectedRequestId]);
  const currentUserRequest = useMemo(() => requests.find(r => r.formData.personalEmail === currentUser?.email) || null, [requests, currentUser]);

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
              .filter((opt) => getAllowedPagesForUser(currentUser).includes(opt.key))
              .map((pageOption) => (
                <button
                  key={pageOption.key}
                  type="button"
                  className={currentPage === pageOption.key ? "nav-pill nav-pill-active" : "nav-pill"}
                  onClick={() => { setCurrentPage(pageOption.key); setSearchTerm(""); setSelectedRequestId(null); }}
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
        {isAuthenticated && ![pages.submit, myProfileKey].includes(currentPage) && (normalizeRole(currentUser?.role) === "HR" || currentUser?.department?.trim().toUpperCase() === "HR") && <SummaryStrip requests={userFilteredRequests} />}
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
                    onAddUser={handleAddUser} 
                    onUpdateUser={handleUpdateUser} 
                    onDeleteUser={handleDeleteUser}
                    onShowConfirm={setConfirmConfig}
                    onShowNotice={showNotice}
                    apiBaseUrl={api.getBaseUrl()} 
                  />
                  <div ref={auditSectionRef} className="dashboard-layout" style={{ marginTop: 40 }}>
                    <RequestDetailPanel
                      request={selectedRequest}
                      role={pages.admin}
                      userDepartment={currentUser?.department}
                      onShowNotice={showNotice}
                      onSaveSoftware={handleSaveSoftware}
                      onDeleteRequest={(id) => {
                        setConfirmConfig({
                          title: "Delete Permanently?",
                          message: "This will permanently remove the onboarding request AND the employee's user account (including asset codes, codes etc) from the database. This action cannot be undone.",
                          confirmLabel: "Delete Permanently",
                          tone: "danger",
                          onConfirm: async () => {
                            const { ok, data } = await api.deleteRequest(id);
                            if (ok) {
                              showNotice("success", "Deleted", "Request and associated user account removed permanently.");
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
                      title="Global Audit" 
                      subtitle="Full visibility and administrative control" 
                      searchTerm={searchTerm} 
                      onSearchChange={setSearchTerm} 
                      filterValue={requestHistoryFilter}
                      filterOptions={[
                        { key: "wip", label: "WIP (Current)" },
                        { key: "hr_review", label: "HR Review" },
                        { key: "stopped", label: "Stopped" },
                        { key: "approved", label: "Approved" },
                      ]}
                      onFilterChange={setRequestHistoryFilter}
                      requests={visibleRequests} 
                      selectedRequestId={selectedRequestId} 
                      onSelectRequest={handleSelectRequest} 
                    />
                  </div>
                </>
              )}

              {isWorkflowDashboardPage(currentPage) && currentPage !== pages.admin && (
                <div className="dashboard-layout">
                    <RequestDetailPanel 
                      request={selectedRequest} 
                      role={currentPage} 
                      userDepartment={currentUser?.department}
                      onShowNotice={showNotice}
                      onSaveSoftware={handleSaveSoftware}
                      onStartHrEdit={(id) => {
                        setEditingHrRequestId(id);
                        setCurrentPage(pages.submit);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onApprove={async (id) => {
                        if (currentPage === pages.manager) {
                          const { ok, data } = await api.saveRequest({ id, stage: workflowStages.hod });
                          if (ok) { showNotice("success", "Approved", "Request forwarded to HOD."); handleRefreshRequests(); }
                          else { showNotice("error", "Error", data.message || "Failed to approve request."); }
                        } else if (currentPage === pages.hod) {
                          const requestToFinalize = requests.find(r => r.id === id);
                          if (!requestToFinalize) return;
                          
                          // We first save the request as approved
                          const { ok: saveOk, data: saveData } = await api.saveRequest({ id, stage: workflowStages.approved });
                          if (!saveOk) {
                            showNotice("error", "Error", saveData.message || "Failed to save request stage.");
                            return;
                          }

                          // Then we finalize it to create the user account
                          const { ok, data } = await api.finalizeOnboarding({
                            requestCode: requestToFinalize.requestCode,
                            name: requestToFinalize.formData.name,
                            email: requestToFinalize.formData.personalEmail,
                            department: requestToFinalize.formData.department,
                          });
                          
                          if (ok) { 
                            showNotice("success", "Approved", "Request fully approved and user account created."); 
                            handleRefreshRequests(); 
                            setAllUsers(await fetchUsersData()); // Refresh users list for admin
                          } else {
                            showNotice("error", "Error Finalizing", data.message || "Request approved but failed to create user account.");
                            handleRefreshRequests();
                          }
                        }
                      }}
                      onSendToHr={async (id, actor, reason) => {
                        const { ok } = await api.saveRequest({ id, stage: workflowStages.hr, reviewRequestedBy: actor, reviewReason: reason });
                        if (ok) { showNotice("warning", "Sent to HR", "Request sent back for HR review."); handleRefreshRequests(); }
                      }}
                      onStopCase={async (id, reason) => {
                        const { ok } = await api.saveRequest({ id, stage: workflowStages.stopped, stopReason: reason });
                        if (ok) { showNotice("error", "Stopped", "Onboarding case has been stopped."); handleRefreshRequests(); }
                      }}
                    />
                    <RequestTable 
                      title={currentPage === pages.requests ? "All Requests" : "Your Active Queue"} 
                      subtitle={currentPage === pages.requests ? "View and search through your complete workflow history." : "Requests requiring your attention"} 
                      searchTerm={searchTerm} 
                      onSearchChange={setSearchTerm} 
                      filterValue={currentPage === pages.requests ? requestHistoryFilter : null}
                      filterOptions={currentPage === pages.requests ? [
                        { key: "wip", label: "WIP (Current)" },
                        { key: "hr_review", label: "HR Review" },
                        { key: "stopped", label: "Stopped" },
                        { key: "approved", label: "Approved" },
                      ] : null}
                      onFilterChange={setRequestHistoryFilter}
                      requests={visibleRequests} 
                      selectedRequestId={selectedRequestId} 
                      onSelectRequest={handleSelectRequest} 
                    />
                </div>
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
                        <RequestDetailPanel request={currentUserRequest} role={pages.status} onShowNotice={showNotice} />
                      </div>
                    );
                  })()}
                </section>
              )}
              
              {currentPage === pages.submit && (
                <section className="dashboard-panel">
                  <div className="dashboard-head">
                    <div>
                      <h2>{editingHrRequestId ? "Edit Onboarding Request" : "Submit New Onboarding"}</h2>
                      <p>{editingHrRequestId ? "Update details and re-submit to Manager" : "Initiate a new onboarding request for a team member"}</p>
                    </div>
                  </div>
                  <HRForm 
                    key={editingHrRequestId || "new-onboarding"}
                    apiBaseUrl={api.getBaseUrl()} 
                    onShowNotice={showNotice} 
                    officialEmailDomain={workflowOptions.officialEmailDomain}
                    onSubmitForm={handleOnboardingSubmit}
                    initialData={editingHrRequestId ? requests.find(r => r.id === editingHrRequestId)?.formData : null}
                    onCancel={editingHrRequestId ? () => { setEditingHrRequestId(null); setCurrentPage(pages.hr); } : null}
                  />
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
