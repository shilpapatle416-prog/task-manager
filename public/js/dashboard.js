/**
 * TaskFlow Dashboard Management Script
 * Complete client-side controller for stats, task CRUD, filtering, sorting, pagination & modals.
 */

// Application State
const state = {
  tasks: [],
  totalTasks: 0,
  page: 1,
  limit: 9,
  totalPages: 1,
  search: '',
  status: 'All',
  priority: 'All',
  category: 'All',
  isOverdue: false,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  activeTaskId: null,
  activeTaskData: null
};

// DOM Content Loaded - Initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;

  setupUserInterface();
  setupEventListeners();
  await loadDashboardData();
});

/**
 * Setup user identity in header and sidebar
 */
function setupUserInterface() {
  const user = Auth.getUser();
  if (user) {
    const userInitials = (user.name || 'User')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach((el) => (el.textContent = userInitials));

    const nameElements = document.querySelectorAll('.user-name');
    nameElements.forEach((el) => (el.textContent = user.name || 'User'));

    const emailElements = document.querySelectorAll('.user-email');
    emailElements.forEach((el) => (el.textContent = user.email || ''));

    // Populate profile modal inputs
    const profNameInput = document.getElementById('profileNameInput');
    const profEmailInput = document.getElementById('profileEmailInput');
    if (profNameInput) profNameInput.value = user.name || '';
    if (profEmailInput) profEmailInput.value = user.email || '';
  }
}

/**
 * Setup UI Event Listeners
 */
function setupEventListeners() {
  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('appSidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (
      sidebar &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !mobileToggle.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }

  // Sidebar navigation links
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      const filterType = item.getAttribute('data-filter');
      handleSidebarFilter(filterType);

      // On mobile, auto close sidebar
      if (window.innerWidth <= 900 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        state.search = e.target.value;
        state.page = 1;
        loadTasks();
      }, 350);
    });
  }

  // Filter dropdowns
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.status = e.target.value;
      state.isOverdue = false;
      state.page = 1;
      loadTasks();
    });
  }

  const priorityFilter = document.getElementById('priorityFilter');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', (e) => {
      state.priority = e.target.value;
      state.page = 1;
      loadTasks();
    });
  }

  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      state.category = e.target.value;
      state.page = 1;
      loadTasks();
    });
  }

  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'dueAsc') {
        state.sortBy = 'dueDate';
        state.sortOrder = 'asc';
      } else if (val === 'dueDesc') {
        state.sortBy = 'dueDate';
        state.sortOrder = 'desc';
      } else if (val === 'priorityHigh') {
        state.sortBy = 'priority';
        state.sortOrder = 'desc';
      } else if (val === 'oldest') {
        state.sortBy = 'oldest';
        state.sortOrder = 'asc';
      } else {
        state.sortBy = 'newest';
        state.sortOrder = 'desc';
      }
      state.page = 1;
      loadTasks();
    });
  }

  // Create Task Modal triggers
  const openCreateBtns = document.querySelectorAll('.open-create-modal');
  openCreateBtns.forEach((btn) => {
    btn.addEventListener('click', () => openModal('createTaskModal'));
  });

  // Task form submissions
  const createTaskForm = document.getElementById('createTaskForm');
  if (createTaskForm) {
    createTaskForm.addEventListener('submit', handleCreateTask);
  }

  const editTaskForm = document.getElementById('editTaskForm');
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', handleUpdateTask);
  }

  // Delete modal confirm button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDeleteTask);
  }

  // Profile modal form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleUpdateProfile);
  }

  // Modal close handlers (backdrop click or close button)
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });

    modal.querySelectorAll('.modal-close').forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => closeModal(modal.id));
    });
  });
}

/**
 * Handle sidebar filter clicks
 */
function handleSidebarFilter(filterType) {
  state.page = 1;
  const statusSelect = document.getElementById('statusFilter');

  if (filterType === 'all') {
    state.status = 'All';
    state.isOverdue = false;
    if (statusSelect) statusSelect.value = 'All';
  } else if (filterType === 'pending') {
    state.status = 'Pending';
    state.isOverdue = false;
    if (statusSelect) statusSelect.value = 'Pending';
  } else if (filterType === 'inprogress') {
    state.status = 'In Progress';
    state.isOverdue = false;
    if (statusSelect) statusSelect.value = 'In Progress';
  } else if (filterType === 'completed') {
    state.status = 'Completed';
    state.isOverdue = false;
    if (statusSelect) statusSelect.value = 'Completed';
  } else if (filterType === 'overdue') {
    state.status = 'All';
    state.isOverdue = true;
    if (statusSelect) statusSelect.value = 'All';
  }

  loadTasks();
}

/**
 * Refresh both stats and task listings
 */
async function loadDashboardData() {
  await Promise.all([loadStats(), loadTasks()]);
}

/**
 * Load dashboard statistics
 */
async function loadStats() {
  try {
    const res = await fetchAPI('/tasks/stats');
    if (res.success && res.stats) {
      renderStats(res.stats);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

/**
 * Render dashboard stats
 */
function renderStats(stats) {
  // Update numbers
  setText('statTotal', stats.total || 0);
  setText('statCompleted', stats.completed || 0);
  setText('statPending', stats.pending || 0);
  setText('statInProgress', stats.inProgress || 0);
  setText('statOverdue', stats.overdue || 0);

  // Update progress bar
  const pct = stats.completionPercentage || 0;
  setText('progressPctText', `${pct}% Completed`);
  const progressBar = document.getElementById('progressBarFill');
  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }

  // Update sidebar badge counters if present
  setText('sidebarBadgeTotal', stats.total || 0);
  setText('sidebarBadgePending', stats.pending || 0);
  setText('sidebarBadgeInProgress', stats.inProgress || 0);
  setText('sidebarBadgeCompleted', stats.completed || 0);
  setText('sidebarBadgeOverdue', stats.overdue || 0);

  // Overdue & Due Soon Reminder Banner
  const reminderBanner = document.getElementById('reminderBanner');
  const reminderMessage = document.getElementById('reminderMessage');

  if (reminderBanner && reminderMessage) {
    if (stats.overdue > 0) {
      reminderBanner.style.display = 'flex';
      reminderMessage.innerHTML = `⚠️ <strong>Attention needed:</strong> You have <strong>${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''}</strong> that require urgent action!`;
    } else if (stats.dueSoon > 0) {
      reminderBanner.style.display = 'flex';
      reminderMessage.innerHTML = `⏰ <strong>Upcoming:</strong> You have <strong>${stats.dueSoon} task${stats.dueSoon > 1 ? 's' : ''}</strong> due in the next 48 hours. Stay focused!`;
    } else {
      reminderBanner.style.display = 'none';
    }
  }
}

/**
 * Load tasks with current active filters
 */
async function loadTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <p style="color: var(--text-muted);">Loading your tasks...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams({
      page: state.page,
      limit: state.limit,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    });

    if (state.search.trim()) params.append('search', state.search.trim());
    if (state.status !== 'All') params.append('status', state.status);
    if (state.priority !== 'All') params.append('priority', state.priority);
    if (state.category !== 'All') params.append('category', state.category);
    if (state.isOverdue) params.append('isOverdue', 'true');

    const res = await fetchAPI(`/tasks?${params.toString()}`);
    if (res.success) {
      state.tasks = res.tasks || [];
      state.totalTasks = res.total || 0;
      state.totalPages = res.totalPages || 1;
      renderTasks(state.tasks);
      renderPagination();
    }
  } catch (error) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <p style="color: var(--danger);">Failed to load tasks: ${escapeHtml(error.message)}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="loadTasks()">Try Again</button>
      </div>
    `;
  }
}

/**
 * Render tasks grid or empty state
 */
function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📝</div>
        <h3>No Tasks Found</h3>
        <p>No tasks match your current criteria. Create a new task or adjust your search filters.</p>
        <button class="btn btn-primary open-create-modal" onclick="openModal('createTaskModal')">
          + Create New Task
        </button>
      </div>
    `;
    return;
  }

  const now = new Date();
  const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

  container.innerHTML = tasks
    .map((task) => {
      const isCompleted = task.status === 'Completed';
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      let dueDateBadge = '';
      let cardSpecialClass = '';

      if (dueDate) {
        const isOverdue = !isCompleted && dueDate < now;
        const isDueSoon = !isCompleted && dueDate >= now && dueDate <= in48Hours;

        const formattedDate = dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        if (isOverdue) {
          dueDateBadge = `<span class="badge badge-overdue">⚠️ Overdue (${formattedDate})</span>`;
          cardSpecialClass = 'is-overdue';
        } else if (isDueSoon) {
          dueDateBadge = `<span class="badge badge-duesoon">⏰ Due Soon (${formattedDate})</span>`;
          cardSpecialClass = 'is-duesoon';
        } else {
          dueDateBadge = `<span class="task-due">📅 ${formattedDate}</span>`;
        }
      } else {
        dueDateBadge = `<span class="task-due" style="opacity: 0.6;">📅 No Due Date</span>`;
      }

      const statusClass = `badge-status-${task.status.replace(/\s+/g, '')}`;
      const statusBorderClass = isCompleted
        ? 'is-completed'
        : task.status === 'In Progress'
        ? 'is-inprogress'
        : 'is-pending';

      return `
        <div class="task-card ${statusBorderClass} ${cardSpecialClass}" id="task-card-${task._id}">
          <div class="task-meta-top">
            <div class="task-tags">
              <span class="badge badge-priority-${task.priority}">${task.priority}</span>
              <span class="badge badge-cat-${task.category}">${task.category}</span>
            </div>
            <div>
              <span class="badge ${statusClass}">${task.status}</span>
            </div>
          </div>

          <h4 class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</h4>
          <p class="task-description">${escapeHtml(task.description || 'No description provided.')}</p>

          <div class="task-footer">
            <div>
              ${dueDateBadge}
            </div>

            <div class="task-actions">
              <!-- Quick Status Toggle -->
              <button 
                class="action-btn btn-complete" 
                title="${isCompleted ? 'Mark as Pending' : 'Mark as Completed'}"
                onclick="toggleTaskStatus('${task._id}', '${isCompleted ? 'Pending' : 'Completed'}')"
              >
                ${isCompleted ? '↩️' : '✔️'}
              </button>

              <!-- View Details -->
              <button 
                class="action-btn" 
                title="View Details"
                onclick="viewTaskDetails('${task._id}')"
              >
                👁️
              </button>

              <!-- Edit Task -->
              <button 
                class="action-btn" 
                title="Edit Task"
                onclick="prepareEditTask('${task._id}')"
              >
                ✏️
              </button>

              <!-- Delete Task -->
              <button 
                class="action-btn btn-delete" 
                title="Delete Task"
                onclick="prepareDeleteTask('${task._id}', '${escapeHtml(task.title)}')"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Render pagination controls
 */
function renderPagination() {
  const container = document.getElementById('paginationContainer');
  if (!container) return;

  if (state.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="page-btn" ${state.page === 1 ? 'disabled' : ''} onclick="goToPage(${state.page - 1})">
      &laquo;
    </button>
  `;

  for (let i = 1; i <= state.totalPages; i++) {
    html += `
      <button class="page-btn ${state.page === i ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="page-btn" ${state.page === state.totalPages ? 'disabled' : ''} onclick="goToPage(${state.page + 1})">
      &raquo;
    </button>
  `;

  container.innerHTML = html;
}

function goToPage(p) {
  if (p < 1 || p > state.totalPages || p === state.page) return;
  state.page = p;
  loadTasks();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

/**
 * Create Task Handler
 */
async function handleCreateTask(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const title = form.title.value.trim();
  const description = form.description.value.trim();
  const priority = form.priority.value;
  const category = form.category.value;
  const status = form.status.value;
  const dueDate = form.dueDate.value;

  if (!title) {
    showToast('Task title is required', 'warning');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const res = await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, priority, category, status, dueDate })
    });

    if (res.success) {
      showToast('Task created successfully! 🎉', 'success');
      form.reset();
      closeModal('createTaskModal');
      await loadDashboardData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Task';
  }
}

/**
 * Quick toggle task status
 */
async function toggleTaskStatus(taskId, nextStatus) {
  try {
    const res = await fetchAPI(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    if (res.success) {
      showToast(`Task status updated to ${nextStatus}`, 'success');
      await loadDashboardData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Prepare Edit Task Modal
 */
async function prepareEditTask(taskId) {
  try {
    const res = await fetchAPI(`/tasks/${taskId}`);
    if (res.success && res.task) {
      const task = res.task;
      state.activeTaskId = task._id;

      const form = document.getElementById('editTaskForm');
      form.editTitle.value = task.title || '';
      form.editDescription.value = task.description || '';
      form.editPriority.value = task.priority || 'Medium';
      form.editCategory.value = task.category || 'Personal';
      form.editStatus.value = task.status || 'Pending';

      if (task.dueDate) {
        // Format as YYYY-MM-DD for date input
        const d = new Date(task.dueDate);
        form.editDueDate.value = d.toISOString().split('T')[0];
      } else {
        form.editDueDate.value = '';
      }

      openModal('editTaskModal');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Handle Update Task
 */
async function handleUpdateTask(e) {
  e.preventDefault();
  if (!state.activeTaskId) return;

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const title = form.editTitle.value.trim();
  const description = form.editDescription.value.trim();
  const priority = form.editPriority.value;
  const category = form.editCategory.value;
  const status = form.editStatus.value;
  const dueDate = form.editDueDate.value;

  if (!title) {
    showToast('Task title is required', 'warning');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const res = await fetchAPI(`/tasks/${state.activeTaskId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, priority, category, status, dueDate })
    });

    if (res.success) {
      showToast('Task updated successfully!', 'success');
      closeModal('editTaskModal');
      await loadDashboardData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

/**
 * View Task Details in Read-only Modal
 */
async function viewTaskDetails(taskId) {
  try {
    const res = await fetchAPI(`/tasks/${taskId}`);
    if (res.success && res.task) {
      const task = res.task;
      const detailsBody = document.getElementById('taskDetailsBody');

      const dueDateText = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'None';

      const createdDateText = new Date(task.createdAt).toLocaleString();
      const updatedDateText = new Date(task.updatedAt).toLocaleString();

      detailsBody.innerHTML = `
        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span class="badge badge-priority-${task.priority}">${task.priority} Priority</span>
            <span class="badge badge-cat-${task.category}">${task.category}</span>
            <span class="badge badge-status-${task.status.replace(/\s+/g, '')}">${task.status}</span>
          </div>
          <h2 style="font-size: 1.4rem; margin-bottom: 0.75rem;">${escapeHtml(task.title)}</h2>
          <div style="background: var(--bg-elevated); padding: 1rem; border-radius: var(--radius-md); font-size: 0.95rem; white-space: pre-wrap; line-height: 1.6;">
            ${escapeHtml(task.description || 'No description added for this task.')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <div>
            <span style="color: var(--text-muted); display: block;">Due Date:</span>
            <strong>${dueDateText}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block;">Status:</span>
            <strong>${task.status}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block;">Created:</span>
            <span>${createdDateText}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block;">Last Updated:</span>
            <span>${updatedDateText}</span>
          </div>
        </div>
      `;

      openModal('detailsTaskModal');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/**
 * Prepare Delete Confirmation
 */
function prepareDeleteTask(taskId, taskTitle) {
  state.activeTaskId = taskId;
  const titleEl = document.getElementById('deleteTaskTitle');
  if (titleEl) titleEl.textContent = `"${taskTitle}"`;
  openModal('deleteTaskModal');
}

/**
 * Execute Delete Task
 */
async function handleDeleteTask() {
  if (!state.activeTaskId) return;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    const res = await fetchAPI(`/tasks/${state.activeTaskId}`, {
      method: 'DELETE'
    });

    if (res.success) {
      showToast('Task deleted successfully', 'success');
      closeModal('deleteTaskModal');
      await loadDashboardData();
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete Task';
  }
}

/**
 * Handle Profile Update
 */
async function handleUpdateProfile(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const name = form.profileName.value.trim();
  const email = form.profileEmail.value.trim();
  const currentPassword = form.currentPassword.value;
  const newPassword = form.newPassword.value;

  const payload = { name, email };
  if (newPassword) {
    if (!currentPassword) {
      showToast('Current password is required to change password', 'warning');
      return;
    }
    payload.currentPassword = currentPassword;
    payload.newPassword = newPassword;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const res = await Auth.updateProfile(payload);
    if (res.success) {
      showToast('Profile updated successfully!', 'success');
      setupUserInterface();
      closeModal('profileModal');
      form.currentPassword.value = '';
      form.newPassword.value = '';
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Profile';
  }
}

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Helper to safely set text content
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
