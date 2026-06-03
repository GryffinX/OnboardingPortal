import React, { useState } from "react";
import "./App.css"; // Reuse existing dashboard styles

const AdminDashboard = ({ users, onAddUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Employee" });

  const roles = ["All Roles", "Admin", "Manager", "HOD", "HR", "Employee"];

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
    setNewUser({ name: "", email: "", role: "Employee" });
    setShowAddModal(false);
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
            onClick={() => setShowAddModal(true)}
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
          <div className="request-row request-row-header">
            <span>User Details</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="request-empty">No users found matching your filters.</div>
          ) : (
            filteredUsers.map((user, index) => (
              <div key={index} className="request-row">
                <div>
                  <strong>{user.name}</strong>
                </div>
                <span>{user.email}</span>
                <span className={`status-pill status-pill-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
                <span className="status-pill status-pill-approved">Active</span>
                <button type="button" className="ghost-button" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Add New User</h3>
                <p>Assign a role and grant access</p>
              </div>
              <button className="ghost-button" onClick={() => setShowAddModal(false)}>✕</button>
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
                <button type="submit" className="primary-button" style={{ marginTop: "8px" }}>
                  Create User Account
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
