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

  async resetPassword(email, otp, newPassword) {
    const response = await fetch(`${apiBaseUrl}/api/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password: newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async fetchUsers() {
    const response = await fetch(`${apiBaseUrl}/api/users`);
    const data = await response.json();
    return { ok: response.ok, data };
  },

  async createUser(user) {
    const response = await fetch(`${apiBaseUrl}/api/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async updateUser(user) {
    const response = await fetch(`${apiBaseUrl}/api/update-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  },

  async sendOnboardingMail(formData) {
    const response = await fetch(`${apiBaseUrl}/api/onboarding-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
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
    const data = await response.json();
    return { ok: response.ok, data };
  },
  
  getBaseUrl() {
    return apiBaseUrl;
  }
};
