import { useState, useEffect } from "react";
import "./App.css"; 
import { api } from "./services/api";
import DashboardTabBar from "./components/DashboardTabBar";
import RequestDetailPanel from "./components/RequestDetailPanel";
import { pages } from "./constants";
import {
  validateName, 
  validateEmail, 
  validateGenericInput,
  cleanNameInput,
  cleanNumericInput,
  cleanTextInput
} from "./utils";

function normalizeRole(role) {
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
  };

  return canonicalRoles[role.trim().toLowerCase()] || "Employee";
}

const AdminDashboard = ({ 
  users, 
  currentUser,
  onAddUser, 
  onUpdateUser,
  onDeleteUser,
  onShowConfirm,
  onShowNotice,
  onRefreshRequests,
  apiBaseUrl = "http://127.0.0.1:8000" 
}) => {
  const [activeTab, setActiveTab] = useState("users"); // users, software, hardware, logs
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showModal, setShowModal] = useState(null); // null, 'add', 'edit', 'edit-software', 'edit-dept'
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Employee", password: "", department: "", phoneNumber: "", employeeCode: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [editingSoftware, setEditingSoftware] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [softwareCatalog, setSoftwareCatalog] = useState({});
  const [selectedSoftwareDept, setSelectedSoftwareDept] = useState("Global Software");
  const [newSoftwareName, setNewSoftwareName] = useState("");
  const [newSoftwareCategory, setNewSoftwareCategory] = useState("preinstalled");
  const [newSoftwareDept, setNewSoftwareDept] = useState("Global Software");
  const [isBulkUpdating, setIsLoading] = useState(false);

  const [assets, setAssets] = useState([]);
  const [newAsset, setNewAsset] = useState({ assetCode: '', laptopModel: '', laptopProcessor: '', laptopRam: '', laptopStorage: '', laptopGpu: '' });
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingAssetAssignments, setViewingAssetAssignments] = useState(null); // null or asset object

  const [changelogs, setChangelogs] = useState([]);
  const [changelogSearch, setChangelogSearch] = useState("");
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [viewingArchivedRequest, setViewingArchivedRequest] = useState(null);

  const fetchChangelogs = async () => {
    const { ok, data } = await api.fetchChangelogs(currentUser?.id);
    if (ok && data.changelogs) setChangelogs(data.changelogs);
  };

  const fetchArchivedRequests = async () => {
    const { ok, data } = await api.fetchRequests(true); // includeArchived=true
    if (ok && data.requests) {
      setArchivedRequests(data.requests.filter(r => r.isDeleted));
    }
  };

  const fetchAssets = async () => {
    const { ok, data } = await api.getAssets();
    if (ok) setAssets(data.assets || []);
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    const { ok, data } = await api.createAsset({ ...newAsset, actorId: currentUser?.id });
    if (ok) {
      onShowNotice("success", "Asset Added", "Hardware inventory updated.");
      setNewAsset({ assetCode: '', laptopModel: '', laptopProcessor: '', laptopRam: '', laptopStorage: '', laptopGpu: '' });
      fetchAssets();
      fetchChangelogs();
    } else {
      onShowNotice("error", "Error", data.message);
    }
  };

  const handleEditAssetSubmit = async (e) => {
    e.preventDefault();
    const { ok, data } = await api.updateAsset({ ...editingAsset, actorId: currentUser?.id });
    if (ok) {
      onShowNotice("success", "Asset Updated", "Inventory record modified.");
      setShowModal(null);
      fetchAssets();
      fetchChangelogs();
    } else {
      onShowNotice("error", "Error", data.message);
    }
  };

  const onDeleteAsset = async (id) => {
    const { ok, data } = await api.deleteAsset({ id, actorId: currentUser?.id });
    if (ok) {
      onShowNotice("success", "Asset Deleted", "Removed from inventory.");
      fetchAssets();
      fetchChangelogs();
    } else {
      onShowNotice("error", "Error", data.message);
    }
  };

  const roles = ["All Roles", "Admin", "Manager", "HOD", "Infrastructure Admin", "Infrastructure Executive", "Employee"];

  const fetchDepts = async () => {
    try {
      const { ok, data } = await api.fetchDepartments();
      if (ok && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      } else {
        onShowNotice("error", "Departments Unavailable", data.message || "Failed to load departments.");
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchCatalog = async () => {
    try {
      const { ok, data } = await api.fetchSoftwareCatalog();
      if (ok && data) {
        setSoftwareCatalog(data.catalog || {});
      }
    } catch (err) {
      console.error('Failed to fetch software catalog', err);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      await fetchDepts();
      await fetchCatalog();
      await fetchAssets();
      await fetchChangelogs();
      await fetchArchivedRequests();
    };
    initDashboard();
  }, [apiBaseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeUsers = Array.isArray(users)
    ? users
        .filter((user) => user && typeof user === "object")
        .map((user) => ({
          name: typeof user.name === "string" ? user.name : "",
          email: typeof user.email === "string" ? user.email : "",
          role: normalizeRole(user.role),
          department: typeof user.department === "string" ? user.department : "",
          phoneNumber: typeof user.phoneNumber === "string" ? user.phoneNumber : "",
          employeeCode: typeof user.employeeCode === "string" ? user.employeeCode : "",
          isActive: !!user.isActive
        }))
    : [];

  const filteredUsers = safeUsers.filter((user) => {
    const name = user.name || "";
    const email = user.email || "";
    const code = user.employeeCode || "";
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const nameError = validateName(newUser.name);
    const emailError = validateEmail(newUser.email);
    if (nameError || emailError) { onShowNotice("error", "Validation Error", nameError || emailError); return; }
    if (!newUser.password || newUser.password.length < 8) { onShowNotice("error", "Validation Error", "Password must be at least 8 characters long."); return; }

    const result = await onAddUser(newUser);
    if (result?.ok) {
      setNewUser({ name: "", email: "", role: "Employee", password: "", department: "", phoneNumber: "", employeeCode: "" });
      setShowModal(null);
      fetchChangelogs();
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    const nameError = validateName(editingUser.name);
    const emailError = validateEmail(editingUser.email);
    if (nameError || emailError) { onShowNotice("error", "Validation Error", nameError || emailError); return; }
    if (editingUser.password && editingUser.password.length < 8) { onShowNotice("error", "Validation Error", "Password must be at least 8 characters long."); return; }

    await onUpdateUser(editingUser);
    setShowModal(null);
    setEditingUser(null);
    fetchChangelogs();
  };

  const handleBulkStatusChange = (newStatus) => {
    onShowConfirm({
      title: newStatus ? "Activate All Users" : "Deactivate All Users",
      message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} all staff accounts? This will affect all users except administrators.`,
      confirmLabel: newStatus ? "Activate All" : "Deactivate All",
      tone: newStatus ? "primary" : "danger",
      onConfirm: async () => {
        setIsLoading(true);
        const { ok, data } = await api.bulkUpdateUsersStatus(newStatus, currentUser?.id);
        setIsLoading(false);
        if (ok) {
          onShowNotice("success", "Bulk Action Complete", data.message);
          window.location.reload(); // Refresh to update list
        } else {
          onShowNotice("error", "Action Failed", data.message);
        }
      }
    });
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    const err = validateGenericInput(newDepartmentName, "Department name");
    if (err) { onShowNotice("error", "Validation Error", err); return; }
    
    const { ok, data } = await api.createDepartment(newDepartmentName.trim(), currentUser?.id);
    if (ok) {
      setNewDepartmentName("");
      fetchDepts();
      onShowNotice("success", "Department Created", `"${newDepartmentName}" added successfully.`);
      fetchChangelogs();
    } else {
      onShowNotice("error", "Creation Failed", data.message || "Failed to create department");
    }
  };

  const handleEditSoftwareSubmit = async (e) => {
    e.preventDefault();
    const err = validateGenericInput(editingSoftware.newName, "Software name");
    if (err) { onShowNotice("error", "Validation Error", err); return; }

    const { ok, data } = await api.updateSoftwareItem(
      editingSoftware.originalName, 
      editingSoftware.originalCategory,
      editingSoftware.originalDepartment,
      editingSoftware.newName,
      editingSoftware.newCategory,
      editingSoftware.newDepartment,
      currentUser?.id
    );
    if (ok) {
      onShowNotice("success", "Software Updated", data.message);
      await fetchCatalog();
      setShowModal(null);
      fetchChangelogs();
    } else {
      onShowNotice("error", "Update Failed", data.message);
    }
  };

  const handleEditDeptSubmit = async (e) => {
    e.preventDefault();
    const err = validateGenericInput(editingDept.newName, "Department name");
    if (err) { onShowNotice("error", "Validation Error", err); return; }

    const { ok, data } = await api.updateDepartment(editingDept.originalName, editingDept.newName, currentUser?.id);
    if (ok) {
      onShowNotice("success", "Department Updated", data.message);
      await fetchDepts();
      setShowModal(null);
      fetchChangelogs();
    } else {
      onShowNotice("error", "Update Failed", data.message);
    }
  };

  const allActive = safeUsers.length > 0 && safeUsers.every(u => u.isActive);
  const softwareDeptOptions = ["Global Software", ...departments.filter((dept) => dept !== "Global Software")];
  const softwareDeptKey = selectedSoftwareDept || "Global Software";
  const selectedSoftwareCatalog = softwareCatalog[softwareDeptKey] || { preinstalled: [], employee: [] };

  return (
    <div className="admin-dashboard">
      <DashboardTabBar
        tabs={[
          { key: "users", label: "Staff Accounts" },
          { key: "software", label: "Catalog & Deptartments" },
          { key: "hardware", label: "Hardware Inventory" },
          { key: "archived", label: "Archived Requests" },
          { key: "logs", label: "Audit Log" },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "logs") fetchChangelogs();
          if (tab === "archived") fetchArchivedRequests();
        }}
      />

      {activeTab === 'users' && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>User Management</h2>
              <p>Manage portal users and their access roles</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label className="nav-pill" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  checked={allActive} 
                  disabled={isBulkUpdating}
                  onChange={(e) => handleBulkStatusChange(e.target.checked)} 
                />
                <span>{allActive ? "Deactivate All" : "Activate All"}</span>
              </label>
              <button className="primary-button" onClick={() => setShowModal('add')}>Add New User</button>
            </div>
          </div>

          <div className="dashboard-toolbar" style={{ display: "flex", gap: "16px" }}>
            <input
              className="dashboard-search"
              style={{ flex: 1 }}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email or employee code..."
            />
            <label className="dashboard-actor">
              <span>Filter by Role</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
          </div>

          <div className="request-table">
            <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 0.6fr 1fr" }}>
              <span>Identity</span>
              <span>Email</span>
              <span>Role</span>
              <span style={{ textAlign: "center" }}>Department</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="request-rows">
            {filteredUsers.length === 0 ? (
              <div className="request-empty">No users found matching your filters.</div>
            ) : (
              filteredUsers.map((user, index) => {
                const roleName = normalizeRole(user.role);
                const roleAbbr = {
                  "Admin": "AD",
                  "Manager": "MN",
                  "HOD": "HD",
                  "Infrastructure Admin": "IA",
                  "Infrastructure Executive": "IE",
                  "Employee": "EM",
                  "HR": "HR"
                }[roleName] || "??";

                const roleTone = {
                  "Admin": "admin",
                  "Manager": "pending",
                  "HOD": "hod",
                  "Infrastructure Admin": "infra-admin",
                  "Infrastructure Executive": "infra-exec",
                  "Employee": "employee",
                  "HR": "review"
                }[roleName] || "employee";

                return (
                  <div key={index} className="request-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 0.6fr 1fr" }}>
                    <div><strong>{user.name}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {user.employeeCode || "N/A"} | {user.phoneNumber || "No phone"}</div></div>
                    <span style={{ fontSize: "0.9rem", color: "#475569" }}>{user.email}</span>
                    <div>
                      <span 
                        className={`status-pill status-pill-${roleTone}`}
                        title={roleName}
                        style={{ minWidth: '32px' }}
                      >
                        {roleAbbr}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.9rem", textAlign: "center" }}>{user.department || "N/A"}</span>
                    <span className={`status-pill status-pill-${user.isActive ? 'approved' : 'stopped'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="action-button action-button-edit" style={{ flex: 1 }} onClick={() => { setEditingUser({...user, originalEmail: user.email, password: ""}); setShowModal('edit'); }}>Edit</button>
                      <button type="button" className="action-button action-button-delete" style={{ flex: 1, padding: "4px" }} onClick={() => onShowConfirm({
                        title: "Deletion Options",
                        message: (
                          <div>
                            <p>Remove <strong>{user.name}</strong>:</p>
                            <div style={{ marginTop: "12px", textAlign: "left", fontSize: "0.85rem", color: "#475569" }}>
                              <p><strong>1. Delete User Only:</strong> Removes login access. Employee code and emails become available for reuse. Onboarding request remains visible for audit.</p>
                              <p style={{ marginTop: "8px" }}><strong>2. Delete & Archive Request:</strong> Removes login access AND hides the onboarding request from all operational views (Soft Delete). Delete the user from here and archive the request from the Global Audit.</p>
                            </div>
                          </div>
                        ),
                        confirmLabel: "Delete User Only",
                        secondaryLabel: "Delete & Archive Request",
                        tone: "danger",
                        onConfirm: () => onDeleteUser(user.email, false),
                        onSecondary: () => onDeleteUser(user.email, true)
                      })}>
                        Delete...
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'archived' && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>Archived Onboarding Requests</h2>
              <p>Viewing soft-deleted records. These items are hidden from operational dashboards.</p>
            </div>
          </div>
          <div className="request-table">
            <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr 1.5fr" }}>
              <span>Employee</span>
              <span>Identifiers</span>
              <span>Final Status</span>
              <span>Archived Date</span>
              <span>Actions</span>
            </div>
            <div className="request-rows">
              {archivedRequests.length === 0 ? (
                <div className="request-empty">No archived requests found.</div>
              ) : (
                archivedRequests.map((req) => (
                  <div key={req.id} className="request-row" style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr 1.5fr" }}>
                    <div><strong>{req.formData.name}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.formData.department}</div></div>
                    <div>
                      <div style={{ fontSize: '0.85rem' }}>Code: {req.employeeCode || "N/A"}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.formData.personalEmail}</div>
                    </div>
                    <div>
                      <span className="status-pill status-pill-archived">
                        Archived
                      </span>
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{req.lastUpdated}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        type="button" 
                        className="action-button" 
                        style={{ flex: 1, background: "#0B2D52", color: "white", border: "none" }}
                        onClick={() => setViewingArchivedRequest(req)}
                      >
                        View
                      </button>
                      <button 
                        type="button" 
                        className="action-button" 
                        style={{ flex: 1, background: "#22C55E", color: "white", border: "none" }}
                        onClick={async () => {
                          const { ok, data } = await api.restoreRequest(req.id, currentUser?.id);
                          if (ok) {
                            onShowNotice("success", "Restored", data.message);
                            fetchArchivedRequests();
                            onRefreshRequests?.();
                          } else {
                            onShowNotice("error", "Restore Failed", data.message);
                          }
                        }}
                      >
                        Restore
                      </button>
                      <button 
                        type="button" 
                        className="action-button" 
                        style={{ flex: 1, background: "#EF4444", color: "white", border: "none" }}
                        onClick={() => onShowConfirm({
                          title: "Permanently Delete Archived Request?",
                          message: `CRITICAL: This will PERMANENTLY remove the archived request for "${req.formData.name}" from the database. This cannot be undone.`,
                          confirmLabel: "Delete Permanently",
                          tone: "danger",
                          onConfirm: async () => {
                            const { ok, data } = await api.deleteRequest(req.id, currentUser?.id);
                            if (ok) {
                              onShowNotice("success", "Deleted", data.message || "Archived record removed permanently.");
                              fetchArchivedRequests();
                              onRefreshRequests?.();
                            } else {
                              onShowNotice("error", "Error", data.message || "Failed to delete archived request.");
                            }
                          }
                        })}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {viewingArchivedRequest && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "800px", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-topbar">
              <div>
                <h3>View Archived Request</h3>
                <p>Read-only view of the archived record.</p>
              </div>
              <button className="ghost-button" onClick={() => setViewingArchivedRequest(null)}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "16px" }}>
              <RequestDetailPanel
                request={viewingArchivedRequest}
                role={pages.admin}
                userDepartment={currentUser?.department}
                allUsers={users}
                onShowNotice={onShowNotice}
                onDeleteRequest={async (id) => {
                  onShowConfirm({
                    title: "Permanently Delete Archived Request?",
                    message: "CRITICAL: This will PERMANENTLY remove the archived request from the database. This cannot be undone.",
                    confirmLabel: "Delete Permanently",
                    tone: "danger",
                    onConfirm: async () => {
                      const { ok, data } = await api.deleteRequest(id, currentUser?.id);
                      if (ok) {
                        onShowNotice("success", "Deleted", data.message || "Archived record removed permanently.");
                        setViewingArchivedRequest(null);
                        fetchArchivedRequests();
                        onRefreshRequests?.();
                      } else {
                        onShowNotice("error", "Error", data.message || "Failed to delete archived request.");
                      }
                    }
                  });
                }}
                onRestoreRequest={async (id) => {
                  const { ok, data } = await api.restoreRequest(id, currentUser?.id);
                  if (ok) {
                    onShowNotice("success", "Restored", data.message);
                    fetchArchivedRequests();
                    onRefreshRequests?.();
                    setViewingArchivedRequest(null);
                  } else {
                    onShowNotice("error", "Restore Failed", data.message);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'software' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          <section className="dashboard-panel">
            <div className="dashboard-head" style={{ alignItems: "flex-end" }}>
              <div>
                <h2>Software Catalog</h2>
                <p>View and manage the software assigned to one department at a time</p>
              </div>
              <label className="dashboard-actor">
                <span>Department</span>
                <select value={selectedSoftwareDept} onChange={(e) => setSelectedSoftwareDept(e.target.value)}>
                  {softwareDeptOptions.map((dept) => (
                    <option key={dept} value={dept}>{dept === "Global Software" ? "Global" : dept}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div>
                  <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                  {softwareDeptKey === "Global Software" ? "Global" : softwareDeptKey}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {['preinstalled', 'employee'].map(cat => (
                      <div key={cat}>
                        <h4 style={{ marginTop: 0 }}>{cat === 'preinstalled' ? "Company Provided" : "Employee Installed"}</h4>
                        <div className="software-list-admin" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(selectedSoftwareCatalog[cat] || []).map(item => (
                          <div key={`${cat}-${item}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.9rem' }}>{item}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="action-button action-button-edit" style={{ height: 'auto' }} onClick={() => { setEditingSoftware({ originalName: item, originalCategory: cat, originalDepartment: softwareDeptKey === 'Global Software' ? '' : softwareDeptKey, newName: item, newCategory: cat, newDepartment: softwareDeptKey === 'Global Software' ? '' : softwareDeptKey }); setShowModal('edit-software'); }}>Edit</button>
                              <button className="action-button action-button-delete" style={{ height: 'auto' }} onClick={() => onShowConfirm({
                                title: "Delete Software",
                                message: `Remove "${item}" from catalog?`,
                                confirmLabel: "Delete",
                                tone: "danger",
                                onConfirm: async () => { const dept = softwareDeptKey === 'Global Software' ? '' : softwareDeptKey; const {ok, data} = await api.deleteSoftwareItem(item, cat, dept, currentUser?.id); if(ok) { fetchCatalog(); fetchChangelogs(); } else onShowNotice("error", "Error", data.message); }
                              })}>Delete</button>
                            </div>
                          </div>
                        ))}
                        {(selectedSoftwareCatalog[cat] || []).length === 0 && <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No items</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Add New Software</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const softwareError = validateGenericInput(newSoftwareName, "Software name");
                if (softwareError) { onShowNotice("error", "Validation Error", softwareError); return; }
                const { ok } = await api.createSoftwareItem(newSoftwareName.trim(), newSoftwareCategory, newSoftwareDept, currentUser?.id);
                if (ok) { setNewSoftwareName(''); fetchCatalog(); fetchChangelogs(); onShowNotice("success", "Software Added", "Catalog updated."); }
              }} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input 
                  value={newSoftwareName} 
                  onChange={(e) => setNewSoftwareName(cleanTextInput(e.target.value, 100))} 
                  placeholder="Software name" 
                  className="dashboard-search" 
                  style={{ flex: 2 }}
                  maxLength={100}
                />
                <select value={newSoftwareCategory} onChange={(e) => setNewSoftwareCategory(e.target.value)} className="dashboard-search" style={{ flex: 1.5 }}>
                  <option value="preinstalled">Company Provided</option>
                  <option value="employee">Employee Installed</option>
                </select>
                <select value={newSoftwareDept} onChange={(e) => setNewSoftwareDept(e.target.value)} className="dashboard-search" style={{ flex: 1.5 }}>
                  <option value="Global Software">Global</option>
                  {departments.filter((dept) => dept !== "Global Software").map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <button type="submit" className="primary-button">Add</button>
              </form>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-head"><div><h2>Departments</h2><p>Add or remove organization units</p></div></div>
            <div className="software-list-admin" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {departments.map((dept) => (
                <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{dept}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="action-button action-button-edit" style={{ height: 'auto' }} onClick={() => { setEditingDept({ originalName: dept, newName: dept }); setShowModal('edit-dept'); }}>Edit</button>
                    <button className="action-button action-button-delete" style={{ height: 'auto' }} onClick={() => onShowConfirm({
                      title: "Delete Department",
                      message: `Delete "${dept}"?`,
                      confirmLabel: "Delete",
                      tone: "danger",
                      onConfirm: async () => { const {ok, data} = await api.deleteDepartment(dept, currentUser?.id); if(ok) { fetchDepts(); fetchChangelogs(); } else onShowNotice("error", "Error", data.message); }
                    })}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Add Department</h4>
              <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 12 }}>
                <input 
                  value={newDepartmentName} 
                  onChange={(e) => setNewDepartmentName(cleanTextInput(e.target.value, 100))} 
                  placeholder="Dept Name" 
                  className="dashboard-search" 
                  style={{ flex: 1 }}
                  maxLength={100}
                />
                <button type="submit" className="primary-button">Add</button>
              </form>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'hardware' && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>Hardware Asset Inventory</h2>
              <p>Manage laptop assets and specifications for Infrastructure assignment</p>
            </div>
            <button className="primary-button" onClick={() => setShowModal('add-asset')}>Add New Asset</button>
          </div>
          <div className="request-table">
            <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.2fr 1.5fr 1fr 0.6fr 0.6fr 1fr 1fr 1fr" }}>
              <span>Asset Code</span>
              <span>Laptop Model</span>
              <span>Processor</span>
              <span>RAM</span>
              <span>Storage</span>
              <span>GPU</span>
              <span>Assigned To</span>
              <span>Actions</span>
            </div>
            <div className="request-rows">
              {assets.length === 0 ? (
                <div className="request-empty">Inventory is empty. Add assets to enable Infrastructure assignment.</div>
              ) : (
                assets.map((asset) => (
                  <div key={asset.id} className="request-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 1fr 0.6fr 0.6fr 1fr 1fr 1fr" }}>
                    <strong>{asset.assetCode}</strong>
                    <span style={{ fontSize: "0.9rem" }}>{asset.laptopModel}</span>
                    <span style={{ fontSize: "0.9rem" }}>{asset.laptopProcessor}</span>
                    <span style={{ fontSize: "0.9rem" }}>{asset.laptopRam}</span>
                    <span style={{ fontSize: "0.9rem" }}>{asset.laptopStorage}</span>
                    <span style={{ fontSize: "0.9rem" }}>{asset.laptopGpu || "Integrated Graphics"}</span>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      <button 
                        type="button" 
                        className="ghost-button" 
                        style={{ padding: "4px 8px", fontSize: "0.8rem", border: "1px solid #cbd5e1" }}
                        onClick={() => setViewingAssetAssignments(asset)}
                      >
                        {asset.assignedCount || 0} employee{asset.assignedCount === 1 ? "" : "s"} 🔍
                      </button>
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="action-button action-button-edit" style={{ flex: 1 }} onClick={() => { setEditingAsset({...asset}); setShowModal('edit-asset'); }}>Edit</button>
                      <button type="button" className="action-button action-button-delete" style={{ flex: 1 }} onClick={() => onShowConfirm({
                        title: "Delete Asset",
                        message: `Permanently remove asset "${asset.assetCode}" from inventory?`,
                        confirmLabel: "Delete Asset",
                        tone: "danger",
                        onConfirm: () => onDeleteAsset(asset.id)
                      })}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {viewingAssetAssignments && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "600px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Asset Usage Details</h3>
                <p><strong>Asset:</strong> {viewingAssetAssignments.assetCode} | <strong>Model:</strong> {viewingAssetAssignments.laptopModel}</p>
              </div>
              <button className="ghost-button" onClick={() => setViewingAssetAssignments(null)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <h4 style={{ marginBottom: "16px" }}>Assigned Employees</h4>
              {!viewingAssetAssignments.assignments || viewingAssetAssignments.assignments.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                  No employees are currently assigned to this asset.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {viewingAssetAssignments.assignments.map((emp, idx) => (
                    <div key={idx} style={{ padding: "16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ gridColumn: "span 2", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "1.1rem", color: "#102a43" }}>{emp.employeeName}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Employee Code</span>
                        <strong>{emp.employeeCode}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Request ID</span>
                        <strong>{emp.requestCode}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Department</span>
                        <strong>{emp.department}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Status</span>
                        <span className={`status-pill status-pill-${emp.stage.replace('_', '-')}`} style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                          {emp.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="primary-button" onClick={() => setViewingAssetAssignments(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>System Audit Log</h2>
              <p>Track all approvals, edits, and administrative actions across the onboarding lifecycle</p>
            </div>
            <input
              className="dashboard-search"
              style={{ width: "300px" }}
              type="text"
              value={changelogSearch}
              onChange={(e) => setChangelogSearch(e.target.value)}
              placeholder="Search logs by employee or action..."
            />
          </div>
          <div className="request-table">
            <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr 2fr" }}>
              <span>Timestamp</span>
              <span>Target Employee</span>
              <span>Action Type</span>
              <span>Actor</span>
              <span>Description</span>
            </div>
            <div className="request-rows" style={{ maxHeight: "600px", overflowY: "auto" }}>
              {changelogs.length === 0 ? (
                <div className="request-empty">No audit logs found.</div>
              ) : (
                changelogs
                  .filter(log => 
                    log.employeeName.toLowerCase().includes(changelogSearch.toLowerCase()) ||
                    log.actionType.toLowerCase().includes(changelogSearch.toLowerCase()) ||
                    log.description.toLowerCase().includes(changelogSearch.toLowerCase()) ||
                    log.actorName.toLowerCase().includes(changelogSearch.toLowerCase()) ||
                    (log.actorRole || "").toLowerCase().includes(changelogSearch.toLowerCase())
                  )
                  .map((log) => (
                    <div key={log.id} className="request-row" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr 2fr" }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{log.timestamp}</span>
                      <strong>{log.employeeName}</strong>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>{log.actionType}</span>
                      <div>
                        <span style={{ fontSize: "0.9rem" }}>{log.actorName}</span>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{log.actorRole}</div>
                      </div>
                      <span style={{ fontSize: "0.9rem" }}>{log.description}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      )}

      {showModal === 'add' && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar"><div><h3>Add New User</h3><p>Assign a role and grant access</p></div><button className="ghost-button" onClick={() => setShowModal(null)}>✕</button></div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group"><label>Full Name</label><input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: cleanNameInput(e.target.value, 50) })} className="dashboard-search" maxLength={50} /></div>
                <div className="form-group"><label>Employee Code</label><input type="text" required value={newUser.employeeCode} onChange={(e) => setNewUser({ ...newUser, employeeCode: cleanNumericInput(e.target.value, 5) })} className="dashboard-search" placeholder="e.g. 10001" maxLength={5} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value.replace(/[^a-zA-Z0-9.@-]/g, "").slice(0, 100) })} className="dashboard-search" maxLength={100} /></div>
                <div className="form-group"><label>Phone Number</label><input type="text" required value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: cleanNumericInput(e.target.value, 10) })} className="dashboard-search" placeholder="10-digit number" maxLength={10} /></div>
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={newUser.role} 
                    onChange={(e) => {
                      const role = e.target.value;
                      setNewUser({ ...newUser, role, department: role.includes("Infrastructure") ? "Infrastructure" : newUser.department });
                    }} 
                    className="dashboard-search"
                  >
                    {roles.slice(1).map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    required 
                    value={newUser.department} 
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} 
                    className="dashboard-search"
                    disabled={newUser.role.includes("Infrastructure")}
                  >
                    <option value="">Select Dept</option>
                    {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    {!departments.includes("Infrastructure") && newUser.role.includes("Infrastructure") && (
                      <option value="Infrastructure">Infrastructure</option>
                    )}
                  </select>
                </div>
                <div className="form-group"><label>Initial Password</label><input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value.slice(0, 50) })} className="dashboard-search" placeholder="••••••••" maxLength={50} /></div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>Create User</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal === 'edit' && editingUser && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar"><div><h3>Edit User</h3><p>Update user details or role</p></div><button className="ghost-button" onClick={() => setShowModal(null)}>✕</button></div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleEditUserSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group"><label>Full Name</label><input type="text" required value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: cleanNameInput(e.target.value, 50) })} className="dashboard-search" maxLength={50} /></div>
                <div className="form-group"><label>Employee Code</label><input type="text" required value={editingUser.employeeCode} onChange={(e) => setEditingUser({ ...editingUser, employeeCode: cleanNumericInput(e.target.value, 5) })} className="dashboard-search" placeholder="e.g. 10001" maxLength={5} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" required value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value.replace(/[^a-zA-Z0-9.@-]/g, "").slice(0, 100) })} className="dashboard-search" maxLength={100} /></div>
                <div className="form-group"><label>Phone Number</label><input type="text" required value={editingUser.phoneNumber} onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: cleanNumericInput(e.target.value, 10) })} className="dashboard-search" placeholder="10-digit number" maxLength={10} /></div>
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={editingUser.role} 
                    onChange={(e) => {
                      const role = e.target.value;
                      setEditingUser({ ...editingUser, role, department: role.includes("Infrastructure") ? "Infrastructure" : editingUser.department });
                    }} 
                    className="dashboard-search"
                    disabled={editingUser.originalRole === "Admin"}
                    title={editingUser.originalRole === "Admin" ? "Admin roles cannot be modified." : ""}
                  >
                    {roles.slice(1).map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  {editingUser.originalRole === "Admin" && (
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Admin roles are protected and cannot be changed.</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    required 
                    value={editingUser.department} 
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} 
                    className="dashboard-search"
                    disabled={editingUser.role.includes("Infrastructure")}
                  >
                    <option value="">Select Dept</option>
                    {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    {!departments.includes("Infrastructure") && editingUser.role.includes("Infrastructure") && (
                      <option value="Infrastructure">Infrastructure</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><label style={{ margin: 0 }}>Active Account</label><input type="checkbox" checked={editingUser.isActive} onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })} /></div>
                <div className="form-group"><label>Change Password (Optional)</label><input type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value.slice(0, 50) })} className="dashboard-search" placeholder="Leave blank to keep current" maxLength={50} /></div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal === 'edit-software' && editingSoftware && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar"><div><h3>Edit Software</h3><p>Update item name or category</p></div><button className="ghost-button" onClick={() => setShowModal(null)}>✕</button></div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleEditSoftwareSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group"><label>Software Name</label><input type="text" required value={editingSoftware.newName} onChange={(e) => setEditingSoftware({ ...editingSoftware, newName: cleanTextInput(e.target.value, 150) })} className="dashboard-search" maxLength={150} /></div>
                <div className="form-group"><label>Category</label><select value={editingSoftware.newCategory} onChange={(e) => setEditingSoftware({ ...editingSoftware, newCategory: e.target.value })} className="dashboard-search"><option value="preinstalled">Company Provided</option><option value="employee">Employee Installed</option></select></div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>Update Item</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal === 'edit-dept' && editingDept && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar"><div><h3>Edit Department</h3><p>Update organization unit name</p></div><button className="ghost-button" onClick={() => setShowModal(null)}>✕</button></div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleEditDeptSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group"><label>Department Name</label><input type="text" required value={editingDept.newName} onChange={(e) => setEditingDept({ ...editingDept, newName: cleanTextInput(e.target.value, 100) })} className="dashboard-search" maxLength={100} /></div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>Update Department</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {(showModal === 'add-asset' || showModal === 'edit-asset') && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "450px" }}>
            <div className="modal-topbar">
              <div>
                <h3>{showModal === 'add-asset' ? "Add Hardware Asset" : "Edit Asset Details"}</h3>
                <p>Define laptop specifications for assignment</p>
              </div>
              <button className="ghost-button" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={showModal === 'add-asset' ? handleAddAsset : handleEditAssetSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group">
                  <label>Asset Code (Unique)</label>
                  <input 
                    type="text" required 
                    value={showModal === 'add-asset' ? newAsset.assetCode : editingAsset.assetCode} 
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(0, 8);
                      if(showModal === 'add-asset') setNewAsset({...newAsset, assetCode: val});
                      else setEditingAsset({...editingAsset, assetCode: val});
                    }} 
                    className="dashboard-search" placeholder="e.g. LAP-1001" maxLength={8} 
                  />
                </div>
                <div className="form-group">
                  <label>Laptop Model</label>
                  <input 
                    type="text" required 
                    value={showModal === 'add-asset' ? newAsset.laptopModel : editingAsset.laptopModel} 
                    onChange={(e) => {
                      const val = cleanTextInput(e.target.value, 100);
                      if(showModal === 'add-asset') setNewAsset({...newAsset, laptopModel: val});
                      else setEditingAsset({...editingAsset, laptopModel: val});
                    }} 
                    className="dashboard-search" placeholder="e.g. ThinkPad T14 Gen 4" maxLength={100} 
                  />
                </div>
                <div className="form-group">
                  <label>Processor</label>
                  <input 
                    type="text" required 
                    value={showModal === 'add-asset' ? newAsset.laptopProcessor : editingAsset.laptopProcessor} 
                    onChange={(e) => {
                      const val = cleanTextInput(e.target.value, 100);
                      if(showModal === 'add-asset') setNewAsset({...newAsset, laptopProcessor: val});
                      else setEditingAsset({...editingAsset, laptopProcessor: val});
                    }} 
                    className="dashboard-search" placeholder="e.g. Intel i7-1365U" maxLength={100} 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>RAM</label>
                    <input 
                      type="text" required 
                      value={showModal === 'add-asset' ? newAsset.laptopRam : editingAsset.laptopRam} 
                      onChange={(e) => {
                        const val = cleanTextInput(e.target.value, 20);
                        if(showModal === 'add-asset') setNewAsset({...newAsset, laptopRam: val});
                        else setEditingAsset({...editingAsset, laptopRam: val});
                      }} 
                      className="dashboard-search" placeholder="16GB" maxLength={20} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Storage</label>
                    <input 
                      type="text" required 
                      value={showModal === 'add-asset' ? newAsset.laptopStorage : editingAsset.laptopStorage} 
                      onChange={(e) => {
                        const val = cleanTextInput(e.target.value, 20);
                        if(showModal === 'add-asset') setNewAsset({...newAsset, laptopStorage: val});
                        else setEditingAsset({...editingAsset, laptopStorage: val});
                      }} 
                      className="dashboard-search" placeholder="512GB SSD" maxLength={20} 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>GPU (Optional)</label>
                  <input 
                    type="text" 
                    value={showModal === 'add-asset' ? newAsset.laptopGpu : editingAsset.laptopGpu} 
                    onChange={(e) => {
                      const val = cleanTextInput(e.target.value, 100);
                      if(showModal === 'add-asset') setNewAsset({...newAsset, laptopGpu: val});
                      else setEditingAsset({...editingAsset, laptopGpu: val});
                    }} 
                    className="dashboard-search" placeholder="e.g. NVIDIA RTX 4050" maxLength={100} 
                  />
                </div>
                {showModal === 'edit-asset' && (
                  <div className="form-group" style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#475569" }}>
                    <strong style={{ display: "block", marginBottom: "4px", color: "#1e293b" }}>
                      Assignment Count
                    </strong>
                    <span style={{ fontSize: "0.9rem" }}>
                      This asset is assigned to {editingAsset?.assignedCount || 0} employee{(editingAsset?.assignedCount || 0) === 1 ? "" : "s"}.
                    </span>
                  </div>
                )}
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>
                  {showModal === 'add-asset' ? "Add to Inventory" : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
