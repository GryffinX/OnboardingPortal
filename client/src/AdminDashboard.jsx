import { useState, useEffect } from "react";
import "./App.css"; 
import { api } from "./services/api";

function normalizeRole(role) {
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

const AdminDashboard = ({ users, onAddUser, onUpdateUser, onDeleteUser, apiBaseUrl = "http://127.0.0.1:8000" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showModal, setShowModal] = useState(null); // null, 'add', 'edit', 'delete'
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Employee", password: "", department: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [workflowOptions, setWorkflowOptions] = useState({ preInstalledSoftware: [], employeeInstalledSoftware: [], officialEmailDomain: "" });
  const [newSoftwareName, setNewSoftwareName] = useState("");
  const [newSoftwareCategory, setNewSoftwareCategory] = useState("preinstalled");

  const roles = ["All Roles", "Admin", "Manager", "HOD", "Employee"];

  useEffect(() => {
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
    fetchDepts();
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

    fetchWorkflow();
  }, [apiBaseUrl]);

  const safeUsers = Array.isArray(users)
    ? users
        .filter((user) => user && typeof user === "object")
        .map((user) => ({
          name: typeof user.name === "string" ? user.name : "",
          email: typeof user.email === "string" ? user.email : "",
          role: normalizeRole(user.role),
          department: typeof user.department === "string" ? user.department : "",
        }))
    : [];

  const filteredUsers = safeUsers.filter((user) => {
    const name = user.name || "";
    const email = user.email || "";
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const result = await onAddUser(newUser);
    if (result?.ok) {
      setNewUser({ name: "", email: "", role: "Employee", password: "", department: "" });
      setShowModal(null);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser({ ...user, originalEmail: user.email, password: "" });
    setShowModal('edit');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onUpdateUser(editingUser);
    setShowModal(null);
    setEditingUser(null);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowModal('delete');
  };

  const handleDeleteConfirm = () => {
    onDeleteUser(userToDelete.email);
    setShowModal(null);
    setUserToDelete(null);
  };

  return (
    <div className="admin-dashboard">
      <section className="dashboard-panel">
        <div className="dashboard-head">
          <div>
            <h2>User Management</h2>
            <p>Manage portal users and their access roles</p>
          </div>
          <button
            className="primary-button"
            onClick={() => setShowModal('add')}
          >
            Add New User
          </button>
        </div>

        <div className="dashboard-toolbar" style={{ display: "flex", gap: "16px" }}>
          <input
            className="dashboard-search"
            style={{ flex: 1 }}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
          />
          <label className="dashboard-actor">
            <span>Filter by Role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="request-table">
          <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.2fr 1.5fr 0.8fr 1fr 0.6fr 1fr" }}>
            <span>Name</span>
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
                <div>
                  <strong>{user.name}</strong>
                </div>
                <span style={{ fontSize: "0.9rem", color: "#475569" }}>{user.email}</span>
                <span className={`status-pill status-pill-${normalizeRole(user.role).toLowerCase()}`}>
                  {normalizeRole(user.role)}
                </span>
                <span style={{ fontSize: "0.9rem", textAlign: "center" }}>{user.department || "N/A"}</span>
                <span className="status-pill status-pill-approved">Active</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    type="button" 
                    className="ghost-button" 
                    style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1 }}
                    onClick={() => handleEditClick(user)}
                  >
                    Edit
                  </button>
                  <button 
                    type="button" 
                    className="warning-button" 
                    style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
                    onClick={() => handleDeleteClick(user)}
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

      <section className="dashboard-panel" style={{ marginTop: 20 }}>
        <div className="dashboard-head">
          <div>
            <h2>Software Catalog</h2>
            <p>Manage pre-installed and employee-installed software</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Company Provided</h4>
            <div className="request-empty" style={{ padding: 12, minHeight: 40 }}>{workflowOptions.preInstalledSoftware.join(', ') || 'No items'}</div>
          </div>

          <div>
            <h4 style={{ marginTop: 0 }}>Employee Installed</h4>
            <div className="request-empty" style={{ padding: 12, minHeight: 40 }}>{workflowOptions.employeeInstalledSoftware.join(', ') || 'No items'}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newSoftwareName.trim()) return;
            const category = newSoftwareCategory === 'employee' ? 'employee' : 'preinstalled';
            const { ok, data } = await api.createSoftwareItem(newSoftwareName.trim(), category);
            if (ok) {
              setNewSoftwareName('');
              // refresh
              const wf = await api.fetchWorkflowOptions();
              if (wf.ok) {
                setWorkflowOptions({
                  preInstalledSoftware: Array.isArray(wf.data.preInstalledSoftware) ? wf.data.preInstalledSoftware : [],
                  employeeInstalledSoftware: Array.isArray(wf.data.employeeInstalledSoftware) ? wf.data.employeeInstalledSoftware : [],
                  officialEmailDomain: typeof wf.data.officialEmailDomain === 'string' ? wf.data.officialEmailDomain : '',
                });
              }
            } else {
              alert(data.message || 'Failed to create software item');
            }
          }} style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <input value={newSoftwareName} onChange={(e) => setNewSoftwareName(e.target.value)} placeholder="Software name" className="dashboard-search" />
            <select value={newSoftwareCategory} onChange={(e) => setNewSoftwareCategory(e.target.value)} className="dashboard-search">
              <option value="preinstalled">Company Provided</option>
              <option value="employee">Employee Installed</option>
            </select>
            <button type="submit" className="primary-button">Add</button>
          </form>
        </div>
      </section>

      {showModal === 'delete' && userToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete this user?</p>
              </div>
              <button className="ghost-button" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "24px" }}>
                <p>User: <strong>{userToDelete.name}</strong></p>
                <p>Email: <strong>{userToDelete.email}</strong></p>
                <p style={{ marginTop: "16px", color: "#991b1b", fontSize: "0.9rem" }}>This action cannot be undone. All associated profile data will be removed.</p>
              </div>
              <div className="detail-actions">
                <button type="button" className="warning-button" onClick={handleDeleteConfirm}>
                  Delete User
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowModal(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal === 'add' && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Add New User</h3>
                <p>Assign a role and grant access</p>
              </div>
              <button className="ghost-button" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="dashboard-search"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="dashboard-search"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="dashboard-search"
                  >
                    {roles.slice(1).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    required
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="dashboard-search"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="dashboard-search"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>
                  Create User Account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal === 'edit' && editingUser && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Edit User</h3>
                <p>Update user details or role</p>
              </div>
              <button className="ghost-button" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleEditSubmit} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="dashboard-search"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="dashboard-search"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="dashboard-search"
                  >
                    {roles.slice(1).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    required
                    value={editingUser.department}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="dashboard-search"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Change Password (Optional)</label>
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="dashboard-search"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>
                  Save Changes
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
