# TaskFlow Pro - Premium Frontend Dashboard

TaskFlow Pro is a highly polished, production-ready SaaS dashboard application built using **pure HTML5, CSS3, and Vanilla JavaScript (ES6+)**. The visual system is inspired by industry-leading SaaS platforms like Notion, Linear, and ClickUp, featuring modern gradients, soft shadows, backdrop blur filters, and dual light/dark color themes.

---

## 🚀 Key Features

1. **Authentication Module**: Complete standalone workspace registration, login, forgot password, and reset password validation.
2. **Interactive Dashboard**: Real-time stats calculations, product progress indicator meters, upcoming deadline trackers, and dynamic SVG line charts.
3. **Comprehensive Tasks Module**: Includes a drag-and-drop Kanban Board alongside a paginate-able task table with advanced search, status/priority filtering, and sorting.
4. **Projects Hub**: Manage workspaces, add team members, and track completion progress calculated dynamically from tasks.
5. **Real-time Notifications**: Droplist center for reading/unread flags, counts indicator badge, and modal Toast alert banners.
6. **User Settings & Profile**: Edit profile details, change passwords, and customize visual avatar themes.
7. **Premium Styling**: Fully responsive desktop/tablet/mobile layouts, high-end transitions, custom scrollbars, and native Dark Mode.

---

## 📂 Project Directory Structure

```
taskflow-pro-frontend/
├── index.html           # Main SPA layout structure, forms, and modal elements
├── README.md            # Project technical handbook and execution details
├── css/
│   └── style.css        # Clean, documented responsive layout and visual styling rules
└── js/
    ├── utils.js         # Core helpers, custom relative dates, SVG charting, and toast alerts
    ├── api.js           # Fetch-based API client wrapper (with Mock DB fallback)
    ├── auth.js          # Forms verification and auth session guards
    ├── dashboard.js     # Analytical metrics computations and dashboard layout hooks
    ├── tasks.js         # Complete Task CRUD, Kanban drag-and-drop, and filters
    ├── projects.js      # Project workspace creators, statistics, and rosters
    ├── profile.js       # Profile modifications, avatar triggers, and password rules
    ├── notifications.js # Notifications bell dropdown and unread counting
    └── app.js           # Theme initialization, collapsers, and hash router orchestrator
```

---

## 💻 How to Run Standalone (Demo Mode)

TaskFlow Pro works 100% out of the box in standalone browser mode. The API layer (`js/api.js`) contains a transparent `localStorage` fallback DB that acts as a client-side mock backend, allowing you to perform full CRUD on tasks/projects, register accounts, and edit profiles without running any server commands.

### Option A: Direct Execution
1. Open the folder and double-click `index.html` to launch it immediately in your default browser.
2. Use the mock login credentials:
   - **Email**: `admin@taskflow.pro`
   - **Password**: `password123`

### Option B: Local Static Server
To ensure smooth routing, asset loading, and SVG rendering, run a local development server in the root directory:

**Using Python:**
```bash
python -m http.server 3000
```
Then open `http://localhost:3000` in your browser.

**Using Node.js:**
```bash
npx live-server
```

---

## 🔌 Connecting to your Real Backend

TaskFlow Pro is architected to integrate with your existing backend instantly by changing a single configuration inside `js/api.js`:

1. Open `js/api.js` in your editor.
2. Locate the `API_CONFIG` object at the top:
   ```javascript
   const API_CONFIG = {
       BASE_URL: 'http://localhost:5000/api', // Point to your backend server URL
       USE_MOCK_FALLBACK: false               // Set to false to disable local Storage Mock DB
   };
   ```
3. Set `USE_MOCK_FALLBACK: false`.
4. Ensure your server endpoints match the standard routes:
   - `POST /api/auth/login` (Returns `{ token, user }`)
   - `POST /api/auth/register` (Returns `{ token, user }`)
   - `GET /api/tasks` (Returns array of tasks)
   - `POST /api/tasks` (Creates and returns task object)
   - `PUT /api/tasks/:id` (Updates and returns task object)
   - `DELETE /api/tasks/:id` (Deletes task)
   - `GET /api/projects` (Returns array of projects)
   - `POST /api/projects` (Creates project)
   - `PUT /api/projects/:id` (Updates project)
   - `DELETE /api/projects/:id` (Deletes project)
   - `GET /api/profile` (Returns current user object)
   - `PUT /api/profile` (Updates user profile)
   - `GET /api/notifications` (Returns array of notifications)
   - `PATCH /api/notifications/:id` (Marks notification as read)
   - `DELETE /api/notifications/:id` (Deletes notification)
