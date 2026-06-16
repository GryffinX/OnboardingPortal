const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = {
  async login(email, password) {
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  },

  async forgotPassword(email) {
    const response = await fetch(`${apiBaseUrl}/api/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async verifyOtp(email, otp) {
    const response = await fetch(`${apiBaseUrl}/api/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async resetPassword(email, otp, newPassword, resetToken = "") {
    const response = await fetch(`${apiBaseUrl}/api/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password: newPassword, resetToken }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchUsers() {
    const response = await fetch(`${apiBaseUrl}/api/users`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async createUser(user, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async updateUser(user, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/update-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async requestProfileUpdateOtp(currentEmail) {
    const response = await fetch(`${apiBaseUrl}/api/request-profile-update-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentEmail }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async verifyProfileUpdate(currentEmail, otp, newData) {
    const response = await fetch(`${apiBaseUrl}/api/verify-profile-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentEmail, otp, newData }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async deleteUser(email, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/delete-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async bulkUpdateUsersStatus(isActive, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/bulk-update-users-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async saveRequest(payload) {
    const response = await fetch(`${apiBaseUrl}/api/save-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async sendOnboardingMail(formData, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/onboarding-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async finalizeOnboarding(requestData) {
    const response = await fetch(`${apiBaseUrl}/api/finalize-onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchRequests() {
    const response = await fetch(`${apiBaseUrl}/api/requests`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchWorkflowOptions(department) {
    const query = department ? `?department=${encodeURIComponent(department)}` : "";
    const response = await fetch(`${apiBaseUrl}/api/workflow-options${query}`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchSoftwareCatalog() {
    const response = await fetch(`${apiBaseUrl}/api/software-catalog`);
    const data = await response.json().catch(() => ({ catalog: {} }));
    return { ok: response.ok, data };
  },

  async createSoftwareItem(name, category, department, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/create-software-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, department, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async deleteSoftwareItem(name, category, department, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/delete-software-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, department, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async updateSoftwareItem(originalName, originalCategory, originalDepartment, newName, newCategory, newDepartment, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/update-software-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalName, originalCategory, originalDepartment, newName, newCategory, newDepartment, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async createDepartment(name, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/create-department`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async updateDepartment(originalName, newName, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/update-department`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalName, newName, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async deleteDepartment(name, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/delete-department`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchChangelogs(actorId) {
    const query = actorId ? `?actorId=${encodeURIComponent(actorId)}` : "";
    const response = await fetch(`${apiBaseUrl}/api/changelogs${query}`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async deleteRequest(id, actorId) {
    const response = await fetch(`${apiBaseUrl}/api/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actorId }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async acknowledgeLaptop(id) {
    const response = await fetch(`${apiBaseUrl}/api/acknowledge-laptop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async getAssets() {
    const response = await fetch(`${apiBaseUrl}/api/assets`);
    const data = await response.json().catch(() => ({ assets: [] }));
    return { ok: response.ok, data };
  },

  async createAsset(payload) {
    const response = await fetch(`${apiBaseUrl}/api/create-asset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async updateAsset(payload) {
    const response = await fetch(`${apiBaseUrl}/api/update-asset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async deleteAsset(payload) {
    const response = await fetch(`${apiBaseUrl}/api/delete-asset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  getBaseUrl() {
    return apiBaseUrl;
  }
  };
