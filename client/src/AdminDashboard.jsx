import { useState, useEffect } from "react";
import "./App.css"; 
import { api } from "./services/api";
import { validateName, validateEmail, validateGenericInput } from "./utils";

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
  onAddUser, 
  onUpdateUser, 
  onDeleteUser, 
  onShowConfirm,
  onShowNotice,
  apiBaseUrl = "http://127.0.0.1:8000" 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showModal, setShowModal] = useState(null); // null, 'add', 'edit', 'edit-software', 'edit-dept'
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Employee", password: "", department: "", phoneNumber: "", employeeCode: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [editingSoftware, setEditingSoftware] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [workflowOptions, setWorkflowOptions] = useState({ preInstalledSoftware: [], employeeInstalledSoftware: [], officialEmailDomain: "" });
  const [newSoftwareName, setNewSoftwareName] = useState("");
  const [newSoftwareCategory, setNewSoftwareCategory] = useState("preinstalled");
  const [isBulkUpdating, setIsLoading] = useState(false);

  const roles = ["All Roles", "Admin", "Manager", "HOD", "Infrastructure Admin", "Infrastructure Executive", "Employee"];

  const fetchDepts = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/departments`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchWorkflow = async () => {
    try {
      const { ok, data } = await api.fetchWorkflowOptions();
      if (ok && data) {
        setWorkflowOptions({
          preInstalledSoftware: Array.isArray(data.preInstalledSoftware) ? data.preInstalledSoftware : [],
          employeeInstalledSoftware: Array.isArray(data.employeeInstalledSoftware) ? data.employeeInstalledSoftware : [],
          officialEmailDomain: typeof data.officialEmailDomain === 'string' ? data.officialEmailDomain : '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch workflow options', err);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      await fetchDepts();
      await fetchWorkflow();
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
    }
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    const nameError = validateName(editingUser.name);
    const emailError = validateEmail(editingUser.email);
    if (nameError || emailError) { onShowNotice("error", "Validation Error", nameError || emailError); return; }
    if (editingUser.password && editingUser.password.length < 8) { onShowNotice("error", "Validation Error", "Password must be at least 8 characters long."); return; }

    onUpdateUser(editingUser);
    setShowModal(null);
    setEditingUser(null);
  };

  const handleBulkStatusChange = (newStatus) => {
    onShowConfirm({
      title: newStatus ? "Activate All Users" : "Deactivate All Users",
      message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} all staff accounts? This will affect all users except administrators.`,
      confirmLabel: newStatus ? "Activate All" : "Deactivate All",
      tone: newStatus ? "primary" : "danger",
      onConfirm: async () => {
        setIsLoading(true);
        const { ok, data } = await api.bulkUpdateUsersStatus(newStatus);
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
    
    const { ok, data } = await api.createDepartment(newDepartmentName.trim());
    if (ok) {
      setNewDepartmentName("");
      fetchDepts();
      onShowNotice("success", "Department Created", `"${newDepartmentName}" added successfully.`);
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
      editingSoftware.newName,
      editingSoftware.newCategory
    );
    if (ok) {
      onShowNotice("success", "Software Updated", data.message);
      await fetchWorkflow();
      setShowModal(null);
    } else {
      onShowNotice("error", "Update Failed", data.message);
    }
  };

  const handleEditDeptSubmit = async (e) => {
    e.preventDefault();
    const err = validateGenericInput(editingDept.newName, "Department name");
    if (err) { onShowNotice("error", "Validation Error", err); return; }

    const { ok, data } = await api.updateDepartment(editingDept.originalName, editingDept.newName);
    if (ok) {
      onShowNotice("success", "Department Updated", data.message);
      await fetchDepts();
      setShowModal(null);
    } else {
      onShowNotice("error", "Update Failed", data.message);
    }
  };

  const allActive = safeUsers.length > 0 && safeUsers.every(u => u.isActive);

  return (
    <div className="admin-dashboard">
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
            filteredUsers.map((user, index) => (
              <div key={index} className="request-row" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 0.6fr 1fr" }}>
                <div><strong>{user.name}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {user.employeeCode || "N/A"} | {user.phoneNumber || "No phone"}</div></div>
                <span style={{ fontSize: "0.9rem", color: "#475569" }}>{user.email}</span>
                <span className={`status-pill status-pill-${normalizeRole(user.role).toLowerCase()}`}>{normalizeRole(user.role)}</span>
                <span style={{ fontSize: "0.9rem", textAlign: "center" }}>{user.department || "N/A"}</span>
                <span className={`status-pill status-pill-${user.isActive ? 'approved' : 'stopped'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="ghost-button" style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1 }} onClick={() => { setEditingUser({...user, originalEmail: user.email, password: ""}); setShowModal('edit'); }}>Edit</button>
                  <button type="button" className="warning-button" style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }} onClick={() => onShowConfirm({
                    title: "Delete User",
                    message: `Are you sure you want to permanently delete user "${user.name}"?`,
                    confirmLabel: "Delete User",
                    tone: "danger",
                    onConfirm: () => onDeleteUser(user.email)
                  })}>Delete</button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 20 }}>
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div><h2>Software Catalog</h2><p>Manage pre-installed and employee-installed software</p></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {['preinstalled', 'employee'].map(cat => (
              <div key={cat}>
                <h4 style={{ marginTop: 0 }}>{cat === 'preinstalled' ? "Company Provided" : "Employee Installed"}</h4>
                <div className="software-list-admin" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(cat === 'preinstalled' ? workflowOptions.preInstalledSoftware : workflowOptions.employeeInstalledSoftware).map(item => (
                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.9rem' }}>{item}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ghost-button" style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }} onClick={() => { setEditingSoftware({ originalName: item, originalCategory: cat, newName: item, newCategory: cat }); setShowModal('edit-software'); }}>Edit</button>
                        <button className="ghost-button" style={{ color: '#ef4444', padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }} onClick={() => onShowConfirm({
                          title: "Delete Software",
                          message: `Remove "${item}" from catalog?`,
                          confirmLabel: "Delete",
                          tone: "danger",
                          onConfirm: async () => { const {ok, data} = await api.deleteSoftwareItem(item, cat); if(ok) fetchWorkflow(); else onShowNotice("error", "Error", data.message); }
                        })}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Add New Software</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const softwareError = validateGenericInput(newSoftwareName, "Software name");
              if (softwareError) { onShowNotice("error", "Validation Error", softwareError); return; }
              const { ok } = await api.createSoftwareItem(newSoftwareName.trim(), newSoftwareCategory);
              if (ok) { setNewSoftwareName(''); fetchWorkflow(); onShowNotice("success", "Software Added", "Catalog updated."); }
            }} style={{ display: 'flex', gap: 12 }}>
              <input value={newSoftwareName} onChange={(e) => setNewSoftwareName(e.target.value)} placeholder="Software name" className="dashboard-search" style={{ flex: 2 }} />
              <select value={newSoftwareCategory} onChange={(e) => setNewSoftwareCategory(e.target.value)} className="dashboard-search" style={{ flex: 1 }}>
                <option value="preinstalled">Company Provided</option>
                <option value="employee">Employee Installed</option>
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
                  <button className="ghost-button" style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }} onClick={() => { setEditingDept({ originalName: dept, newName: dept }); setShowModal('edit-dept'); }}>Edit</button>
                  <button className="ghost-button" style={{ color: '#ef4444', padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }} onClick={() => onShowConfirm({
                    title: "Delete Department",
                    message: `Delete "${dept}"?`,
                    confirmLabel: "Delete",
                    tone: "danger",
                    onConfirm: async () => { const {ok, data} = await api.deleteDepartment(dept); if(ok) fetchDepts(); else onShowNotice("error", "Error", data.message); }
                  })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Add Department</h4>
            <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 12 }}>
              <input value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} placeholder="Dept Name" className="dashboard-search" style={{ flex: 1 }} />
              <button type="submit" className="primary-button">Add</button>
            </form>
          </div>
        </section>
      </div>

      {showModal === 'add' && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar"><div><h3>Add New User</h3><p>Assign a role and grant access</p></div><button className="ghost-button" onClick={() => setShowModal(null)}>✕</button></div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group"><label>Full Name</label><input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value.replace(/[^a-zA-Z ]/g, "").slice(0, 50) })} className="dashboard-search" maxLength={50} /></div>
                <div className="form-group"><label>Employee Code</label><input type="text" required value={newUser.employeeCode} onChange={(e) => setNewUser({ ...newUser, employeeCode: e.target.value.slice(0, 50) })} className="dashboard-search" placeholder="e.g. 1001" maxLength={50} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value.replace(/[^a-zA-Z0-9.@-]/g, "").slice(0, 100) })} className="dashboard-search" maxLength={100} /></div>
                <div className="form-group"><label>Phone Number</label><input type="text" required value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="dashboard-search" placeholder="10-digit number" maxLength={10} /></div>
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
                <div className="form-group"><label>Initial Password</label><input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="dashboard-search" placeholder="••••••••" /></div>
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
                <div className="form-group"><label>Full Name</label><input type="text" required value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value.replace(/[^a-zA-Z ]/g, "").slice(0, 50) })} className="dashboard-search" maxLength={50} /></div>
                <div className="form-group"><label>Employee Code</label><input type="text" required value={editingUser.employeeCode} onChange={(e) => setEditingUser({ ...editingUser, employeeCode: e.target.value.slice(0, 50) })} className="dashboard-search" maxLength={50} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" required value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value.replace(/[^a-zA-Z0-9.@-]/g, "").slice(0, 100) })} className="dashboard-search" maxLength={100} /></div>
                <div className="form-group"><label>Phone Number</label><input type="text" required value={editingUser.phoneNumber} onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="dashboard-search" placeholder="10-digit number" maxLength={10} /></div>
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
                <div className="form-group"><label>Change Password (Optional)</label><input type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} className="dashboard-search" placeholder="Leave blank to keep current" /></div>
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
                <div className="form-group"><label>Software Name</label><input type="text" required value={editingSoftware.newName} onChange={(e) => setEditingSoftware({ ...editingSoftware, newName: e.target.value })} className="dashboard-search" /></div>
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
                <div className="form-group"><label>Department Name</label><input type="text" required value={editingDept.newName} onChange={(e) => setEditingDept({ ...editingDept, newName: e.target.value })} className="dashboard-search" /></div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>Update Department</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
