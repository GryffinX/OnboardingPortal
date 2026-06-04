import React, { useState, useEffect } from "react";
import "./App.css"; // Reuse existing dashboard styles

const AdminDashboard = ({ users, onAddUser, onUpdateUser, apiBaseUrl = "http://127.0.0.1:8000" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showModal, setShowModal] = useState(null); // null, 'add', 'edit'
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Employee", password: "", department: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [departments, setDepartments] = useState([]);

  const roles = ["All Roles", "Admin", "Manager", "HOD", "Employee"];

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/departments`);
        const data = await response.json();
        if (response.ok) {
          setDepartments(data.departments);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, [apiBaseUrl]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    onAddUser(newUser);
    setNewUser({ name: "", email: "", role: "Employee", password: "", department: "" });
    setShowModal(null);
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
          <div className="request-row request-row-header" style={{ gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 0.8fr 0.6fr" }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span style={{ textAlign: "center" }}>Department</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="request-empty">No users found matching your filters.</div>
          ) : (
            filteredUsers.map((user, index) => (
              <div key={index} className="request-row" style={{ gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 0.8fr 0.6fr" }}>
                <div>
                  <strong>{user.name}</strong>
                </div>
                <span style={{ fontSize: "0.9rem", color: "#475569" }}>{user.email}</span>
                <span className={`status-pill status-pill-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
                <span style={{ fontSize: "0.9rem", textAlign: "center" }}>{user.department || "-"}</span>
                <span className="status-pill status-pill-approved">Active</span>
                <button 
                  type="button" 
                  className="ghost-button" 
                  style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
                  onClick={() => handleEditClick(user)}
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </section>

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
