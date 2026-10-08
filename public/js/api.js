/**
 * TaskFlow API & Utility Client
 * Handles authenticated requests, error formatting, toast notifications & theme management.
 */

const API_BASE = '/api';

/**
 * Perform authenticated API request with automatic header injection and error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('taskflow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // If 401 Unauthorized, handle token expiration/logout
      if (response.status === 401) {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
        const isAuthPage = window.location.pathname.includes('login.html') || 
                           window.location.pathname.includes('register.html') ||
                           window.location.pathname === '/' ||
                           window.location.pathname.endsWith('index.html');
        if (!isAuthPage) {
          window.location.href = '/login.html?expired=true';
          return;
        }
      }
      throw new Error(data.message || 'Something went wrong with the request');
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Toast Notification System
 * type: 'success' | 'error' | 'warning' | 'info'
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span>${iconMap[type] || 'ℹ️'}</span>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Theme Toggle & Persistence System (Dark / Light)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('taskflow_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('taskflow_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }
}

// Automatically initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
});
