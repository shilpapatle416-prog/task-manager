# 📋 TaskFlow - Modern Task Manager Web Application

A full-stack, responsive, and modern **Task Manager Web Application** built with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and Supabase PostgreSQL**.

Designed to serve as a complete college or portfolio project, it includes secure JWT authentication, password hashing, CRUD task management, priority and category filtering, automated due date reminders, dark/light theme switching, and real-time dashboard analytics.

---

## 🌟 Key Features

### 1. 🔐 User Authentication & Security
- **User Registration & Login:** Clean registration with live password strength indicator.
- **Secure Password Hashing:** Utilizes `bcryptjs` with salt rounds.
- **JWT Authorization:** Stateless authentication via JSON Web Tokens (Bearer token and HTTP-only cookie support).
- **Protected Routes:** Middleware guards ensuring each user only accesses their own tasks.
- **User Profile Management:** Edit user profile and safely update password.

### 2. 📝 Comprehensive Task Management (CRUD)
- **Create, Read, Update, Delete:** Seamless task creation with modal dialogs.
- **Task Details:** Detailed inspection modal with creation and update timestamps.
- **One-Click Status Toggle:** Quickly cycle status between **Pending**, **In Progress**, and **Completed**.
- **Categorization:** Color-coded badges for **College**, **Personal**, **Project**, **Work**, and **Other**.
- **Priority Levels:** Clearly tagged **High** (Crimson), **Medium** (Amber), and **Low** (Emerald) priorities.

### 3. 📊 Interactive Dashboard & Productivity Metrics
- **Visual Metric Cards:** Real-time counters for Total Tasks, In Progress, Pending, Completed, and Overdue.
- **Productivity Progress Gauge:** Dynamic progress bar showing the percentage of tasks completed.
- **Automated Due Date Reminders:** Urgent notification banner highlighting overdue tasks and tasks due in the next 48 hours.

### 4. 🔍 Search, Filter & Sort
- **Debounced Instant Search:** Search across task titles and descriptions with zero lag.
- **Multi-Filter Controls:** Filter simultaneously by status, priority, and category.
- **Versatile Sorting:** Sort by newest, oldest, earliest due date, latest due date, or priority hierarchy.
- **Clean Pagination:** Seamless page navigation for large task lists.

### 5. 🎨 UI/UX & Responsive Design
- **Modern Aesthetics:** Tailored color palette, glassmorphic header, subtle box shadows, and smooth micro-animations.
- **Dark & Light Mode:** 1-click theme switch persisted across sessions using `localStorage`.
- **Responsive Sidebar:** Collapses into a mobile-friendly drawer on smaller screens.
- **Toast Notifications:** Floating alerts for instant user feedback on actions and errors.
- **Delete Confirmation Modal:** Safety prompt before permanently removing any task.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Modern CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | **Supabase PostgreSQL** (`@supabase/supabase-js`, Relational Schema with RLS & Triggers) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv` |

---

## 📁 Project Structure

```text
Task Manager/
├── config/
│   ├── db.js                 # Database wrapper & connection tester
│   └── supabase.js           # Supabase client & local development fallback store
├── controllers/
│   ├── authController.js     # User registration, login, logout, profile
│   └── taskController.js     # Task CRUD, stats aggregation, status patch
├── middleware/
│   ├── authMiddleware.js     # JWT token validation & route protection
│   └── errorMiddleware.js    # 404 handler and PostgreSQL/Supabase error processing
├── models/
│   ├── Task.js               # Supabase PostgreSQL model for tasks
│   └── User.js               # Supabase PostgreSQL model for users with bcrypt
├── public/                   # Frontend assets
│   ├── index.html            # Landing / Hero page
│   ├── login.html            # User login page with 1-click demo fill
│   ├── register.html         # User registration with password meter
│   ├── dashboard.html        # Interactive main task management dashboard
│   ├── css/
│   │   └── style.css         # Design system, CSS tokens, dark/light themes
│   └── js/
│       ├── api.js            # Fetch client, toast alerts, theme toggle
│       ├── auth.js           # Auth state, login/logout, route guards
│       └── dashboard.js      # Dashboard controller, modals, filters, pagination
├── routes/
│   ├── authRoutes.js         # /api/auth endpoints
│   └── taskRoutes.js         # /api/tasks endpoints
├── .env                      # Environment configuration
├── .env.example              # Template environment variables
├── package.json              # Project metadata & npm dependencies
├── schema.sql                # Supabase PostgreSQL table schema, indexes & RLS policies
├── seed.js                   # Seed script with demo user & realistic tasks
├── server.js                 # Main Express server entry point
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started with Supabase PostgreSQL

### 1. Prerequisites
- **Node.js** (v16.0.0 or higher) - [Download Node.js](https://nodejs.org/)
- **Supabase Account** (Free tier available) - [Supabase Sign Up](https://supabase.com/)

### 2. Setup Supabase Database Schema
1. Create a new project in your [Supabase Dashboard](https://app.supabase.com).
2. Go to the **SQL Editor** from the left navigation.
3. Open `schema.sql` from this repository, paste its contents into the SQL Editor, and click **Run**.
   - This creates `public.users` and `public.tasks` tables.
   - Sets up foreign keys, indexes, auto-updating triggers, and Row Level Security (RLS) policies.

### 3. Configure Environment Variables
Copy `.env.example` to `.env` if not already done:

```env
PORT=5000
NODE_ENV=development

# Supabase PostgreSQL Configuration
# Found in Supabase Dashboard -> Project Settings -> API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# JWT Secret Key
JWT_SECRET=super_secret_jwt_key_task_manager_2026_modern_secure
JWT_EXPIRES_IN=7d
```

*(Note: If `SUPABASE_URL` is not yet configured, the server includes a local development fallback store so you can test the application and UI immediately without interruption).*

### 4. Installation & Seeding
Install dependencies and populate sample data:

```bash
# Install dependencies
npm install

# Seed demo data
npm run seed
```

**Demo Credentials:**
- **Email:** `demo@example.com`
- **Password:** `password123`

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Or standard start
npm start
```

Open your browser at: **`http://localhost:5000`**

---

## 🌐 API Reference

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `POST` | `/api/auth/logout` | Clear auth cookie | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | Yes |
| `PUT` | `/api/auth/profile` | Update profile info or password | Yes |

### Task Endpoints (`/api/tasks`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/tasks` | Get tasks (supports search, filters, sort & pagination) | Yes |
| `GET` | `/api/tasks/stats` | Get dashboard statistics & metrics | Yes |
| `GET` | `/api/tasks/:id` | Get single task by ID | Yes |
| `POST` | `/api/tasks` | Create new task | Yes |
| `PUT` | `/api/tasks/:id` | Update task details | Yes |
| `PATCH` | `/api/tasks/:id/status` | Quick update task status | Yes |
| `DELETE` | `/api/tasks/:id` | Delete task permanently | Yes |

---

## 📄 License
ISC License. Built for modern web application workflows with Node.js, Express, Supabase PostgreSQL, and Vanilla JavaScript.
