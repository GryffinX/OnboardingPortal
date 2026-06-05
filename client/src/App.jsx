import { useEffect, useRef, useState } from "react";
import "./App.css";
import HRForm from "./HRForm";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import {
  getAllHods,
  getAllManagers,
  officialEmailDomain,
} from "./onboardingData";

// Components
import AppNotice from "./components/AppNotice";
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
} from "./utils";

// Services
import { api } from "./services/api";

const managerActors = getAllManagers();
const hodActors = getAllHods();

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
    const { ok, data } = await api.fetchUsers();
    if (ok) {
      setAllUsers(data.users);
    } else {
      console.error("Failed to fetch users");
    }
  };

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  const handleLogin = async (email, password) => {
    const { ok, data } = await api.login(email, password);
    if (ok) {
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
      fetchUsers(); // Refresh the list
    } else {
      showNotice("error", "Failed to Create User", data.message);
    }
  };

  const handleUpdateUser = async (user) => {
    const { ok, data } = await api.updateUser(user);
    if (ok) {
      showNotice("success", "User Updated", data.message);
      fetchUsers(); // Refresh the list
    } else {
      showNotice("error", "Failed to Update User", data.message);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage(pages.submit);
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
    };
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

    const { ok, data } = await api.finalizeOnboarding({
      name: request.formData.name,
      email: request.formData.personalEmail,
      department: request.formData.department
    });
    
    if (!ok) {
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
          <AdminDashboard users={allUsers} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} apiBaseUrl={api.getBaseUrl()} />
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
            apiBaseUrl={api.getBaseUrl()}
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
                        apiBaseUrl={api.getBaseUrl()}
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
