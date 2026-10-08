/**
 * TaskFlow Authentication Module
 * Handles login, registration, token persistence, user profiles and route protection.
 */

const Auth = {
  getToken() {
    return localStorage.getItem('taskflow_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('taskflow_user'));
    } catch (e) {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setSession(token, user) {
    localStorage.setItem('taskflow_token', token);
    localStorage.setItem('taskflow_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  },

  async login(email, password) {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.success && data.token) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async register(name, email, password) {
    const data = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    if (data.success && data.token) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async logout() {
    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API warning:', e);
    } finally {
      this.clearSession();
      window.location.href = '/login.html';
    }
  },

  async getProfile() {
    return await fetchAPI('/auth/me');
  },

  async updateProfile(profileData) {
    const data = await fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (data.success && data.user) {
      const current = this.getUser() || {};
      this.setSession(this.getToken(), { ...current, ...data.user });
    }
    return data;
  },

  /**
   * Route Guard: Protect internal pages (e.g. dashboard.html)
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },

  /**
   * Route Guard: Forward logged in users away from login/register/landing
   */
  redirectIfAuthenticated() {
    if (this.isAuthenticated()) {
      window.location.href = '/dashboard.html';
      return true;
    }
    return false;
  }
};
