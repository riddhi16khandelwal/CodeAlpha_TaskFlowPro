

const API_CONFIG = {
BASE_URL: 'https://taskflow-pro-backend-7k0h.onrender.com/api/v1', 
    USE_MOCK_FALLBACK: false 
};


const MOCK_DB = {
    init() {
        if (!localStorage.getItem('tf_users')) {
            localStorage.setItem('tf_users', JSON.stringify([
                { id: 'usr-1', email: 'admin@taskflow.pro', password: 'password123', name: 'Alex Rivera', role: 'Product Manager', avatar: 'avatar1' }
            ]));
        }
        if (!localStorage.getItem('tf_projects')) {
            localStorage.setItem('tf_projects', JSON.stringify([
                { id: 'proj-1', name: 'TaskFlow Redesign', description: 'Overhaul the core dashboard and landing pages with a clean premium glassmorphic aesthetic.', status: 'Active', progress: 68, deadline: '2026-07-15', team: ['Alex Rivera', 'Sarah Chen', 'Marc Jacobs'] },
                { id: 'proj-2', name: 'Mobile App API', description: 'Develop REST endpoints and web socket services for the upcoming native iOS & Android applications.', status: 'Planning', progress: 25, deadline: '2026-08-30', team: ['Alex Rivera', 'John Doe'] },
                { id: 'proj-3', name: 'Marketing Campaign', description: 'Plan the product relaunch and manage organic social media output for Q3.', status: 'Completed', progress: 100, deadline: '2026-06-20', team: ['Sarah Chen'] }
            ]));
        }
        if (!localStorage.getItem('tf_tasks')) {
            localStorage.setItem('tf_tasks', JSON.stringify([
                { id: 'task-1', title: 'Implement layout skeleton', description: 'Create responsive navigation bars, sidebar, main grid structure, and theme variables.', status: 'completed', priority: 'high', label: 'Feature', dueDate: '2026-06-25', projectId: 'proj-1', assignedUser: 'Alex Rivera', createdAt: '2026-06-22T10:00:00.000Z' },
                { id: 'task-2', title: 'Design SVG charting engine', description: 'Write a canvas/SVG visual charting wrapper to render tasks progress indicators in pure vanilla JS.', status: 'in-progress', priority: 'medium', label: 'UI/UX', dueDate: '2026-06-28', projectId: 'proj-1', assignedUser: 'Sarah Chen', createdAt: '2026-06-23T08:30:00.000Z' },
                { id: 'task-3', title: 'Connect API endpoints', description: 'Integrate real fetch routes and configure local mock database interceptors inside api.js.', status: 'todo', priority: 'high', label: 'Core', dueDate: '2026-06-29', projectId: 'proj-2', assignedUser: 'Alex Rivera', createdAt: '2026-06-23T11:45:00.000Z' },
                { id: 'task-4', title: 'Review marketing newsletters', description: 'Proofread custom copies and review illustrations designed for mailers.', status: 'completed', priority: 'low', label: 'Content', dueDate: '2026-06-18', projectId: 'proj-3', assignedUser: 'Sarah Chen', createdAt: '2026-06-15T09:00:00.000Z' },
                { id: 'task-5', title: 'Setup dark mode triggers', description: 'Add support for root variables substitution, theme preferences caching, and automatic styling.', status: 'todo', priority: 'medium', label: 'UI/UX', dueDate: '2026-07-02', projectId: 'proj-1', assignedUser: 'Marc Jacobs', createdAt: '2026-06-24T00:15:00.000Z' }
            ]));
        }
        if (!localStorage.getItem('tf_notifications')) {
            localStorage.setItem('tf_notifications', JSON.stringify([
                { id: 'notif-1', title: 'Task assigned to you', message: 'Sarah Chen assigned "Design SVG charting engine" to you.', read: false, createdAt: '2026-06-24T00:45:00.000Z' },
                { id: 'notif-2', title: 'Project completed', message: 'The project "Marketing Campaign" was successfully completed.', read: true, createdAt: '2026-06-20T17:00:00.000Z' },
                { id: 'notif-3', title: 'Welcome to TaskFlow Pro', message: 'Get started by creating your first task or custom project boards.', read: false, createdAt: '2026-06-24T01:00:00.000Z' }
            ]));
        }
    },

    getData(key) {
        this.init();
        return JSON.parse(localStorage.getItem(key));
    },

    setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }
};

MOCK_DB.init();

// Helper to simulate request delay
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// Core Request Dispatcher
async function request(path, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${path}`;
    const token = localStorage.getItem('tf_token');

    // Setup headers
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const fetchOptions = {
        ...options,
        headers
    };

    if (API_CONFIG.USE_MOCK_FALLBACK) {
        try {
            // Attempt actual fetch with short timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1500);
            
            const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.warn(`[API] Connection to ${url} failed. Falling back to client-side Mock DB. Reason:`, e.message);
            return await handleMockRequest(options.method || 'GET', path, options.body ? JSON.parse(options.body) : null);
        }
    } else {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
}


async function handleMockRequest(method, path, body) {
    await delay(); // Simulate network latency

    // --- AUTH MODULE ---
    if (path === '/auth/login' && method === 'POST') {
        const users = MOCK_DB.getData('tf_users');
        const user = users.find(u => u.email === body.email && u.password === body.password);
        if (!user) throw new Error('Invalid email or password');
        
        const mockToken = `mock-jwt-token-for-${user.id}-${Date.now()}`;
        localStorage.setItem('tf_token', mockToken);
        localStorage.setItem('tf_current_user', JSON.stringify(user));
        return { token: mockToken, user };
    }

    if (path === '/auth/register' && method === 'POST') {
        const users = MOCK_DB.getData('tf_users');
        if (users.some(u => u.email === body.email)) {
            throw new Error('Email is already registered');
        }

        const newUser = {
            id: `usr-${Date.now()}`,
            email: body.email,
            password: body.password,
            name: body.name || 'New User',
            role: 'Team Member',
            avatar: 'avatar1'
        };

        users.push(newUser);
        MOCK_DB.setData('tf_users', users);

        const mockToken = `mock-jwt-token-for-${newUser.id}-${Date.now()}`;
        localStorage.setItem('tf_token', mockToken);
        localStorage.setItem('tf_current_user', JSON.stringify(newUser));
        return { token: mockToken, user: newUser };
    }

    if (path === '/auth/forgot-password' && method === 'POST') {
        const users = MOCK_DB.getData('tf_users');
        const user = users.find(u => u.email === body.email);
        if (!user) throw new Error('No account found with this email');
        return { message: 'Reset instruction sent to your email.' };
    }

    if (path === '/auth/reset-password' && method === 'POST') {
        return { message: 'Password reset successful.' };
    }

    // --- AUTHENTICATION REQUIRED CHECKS ---
    const token = localStorage.getItem('tf_token');
    if (!token) throw new Error('Unauthorized');

    // --- TASKS MODULE ---
    if (path === '/tasks' && method === 'GET') {
        return MOCK_DB.getData('tf_tasks');
    }

    if (path === '/tasks' && method === 'POST') {
        const tasks = MOCK_DB.getData('tf_tasks');
        const newTask = {
            id: `task-${Date.now()}`,
            ...body,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        MOCK_DB.setData('tf_tasks', tasks);
        
        // Push notification
        createMockNotification('New Task Created', `Task "${newTask.title}" has been successfully added.`);
        return newTask;
    }

    if (path.startsWith('/tasks/') && method === 'PUT') {
        const id = path.split('/').pop();
        const tasks = MOCK_DB.getData('tf_tasks');
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Task not found');

        tasks[index] = { ...tasks[index], ...body };
        MOCK_DB.setData('tf_tasks', tasks);
        return tasks[index];
    }

    if (path.startsWith('/tasks/') && method === 'DELETE') {
        const id = path.split('/').pop();
        let tasks = MOCK_DB.getData('tf_tasks');
        const initialLen = tasks.length;
        tasks = tasks.filter(t => t.id !== id);
        if (tasks.length === initialLen) throw new Error('Task not found');
        MOCK_DB.setData('tf_tasks', tasks);
        return { message: 'Task deleted successfully', id };
    }

    // --- PROJECTS MODULE ---
    if (path === '/projects' && method === 'GET') {
        return MOCK_DB.getData('tf_projects');
    }

    if (path === '/projects' && method === 'POST') {
        const projects = MOCK_DB.getData('tf_projects');
        const newProj = {
            id: `proj-${Date.now()}`,
            progress: 0,
            ...body
        };
        projects.push(newProj);
        MOCK_DB.setData('tf_projects', projects);
        return newProj;
    }

    if (path.startsWith('/projects/') && method === 'PUT') {
        const id = path.split('/').pop();
        const projects = MOCK_DB.getData('tf_projects');
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Project not found');

        projects[index] = { ...projects[index], ...body };
        MOCK_DB.setData('tf_projects', projects);
        return projects[index];
    }

    if (path.startsWith('/projects/') && method === 'DELETE') {
        const id = path.split('/').pop();
        let projects = MOCK_DB.getData('tf_projects');
        projects = projects.filter(p => p.id !== id);
        MOCK_DB.setData('tf_projects', projects);
        
        // Cascade delete or disassociate tasks
        let tasks = MOCK_DB.getData('tf_tasks');
        tasks = tasks.filter(t => t.projectId !== id);
        MOCK_DB.setData('tf_tasks', tasks);

        return { message: 'Project deleted successfully', id };
    }

    // --- PROFILE MODULE ---
    if (path === '/profile' && method === 'GET') {
        return JSON.parse(localStorage.getItem('tf_current_user'));
    }

    if (path === '/profile' && method === 'PUT') {
        const currentUser = JSON.parse(localStorage.getItem('tf_current_user'));
        const users = MOCK_DB.getData('tf_users');
        const index = users.findIndex(u => u.id === currentUser.id);

        if (index === -1) throw new Error('User profile mismatch');

        const updated = { ...users[index], ...body };
        users[index] = updated;

        MOCK_DB.setData('tf_users', users);
        localStorage.setItem('tf_current_user', JSON.stringify(updated));
        return updated;
    }

    // --- NOTIFICATIONS MODULE ---
    if (path === '/notifications' && method === 'GET') {
        return MOCK_DB.getData('tf_notifications');
    }

    if (path.startsWith('/notifications/') && method === 'PATCH') {
        const id = path.split('/').pop();
        const notifs = MOCK_DB.getData('tf_notifications');
        const index = notifs.findIndex(n => n.id === id);
        if (index === -1) throw new Error('Notification not found');
        notifs[index] = { ...notifs[index], ...body };
        MOCK_DB.setData('tf_notifications', notifs);
        return notifs[index];
    }

    if (path.startsWith('/notifications/') && method === 'DELETE') {
        const id = path.split('/').pop();
        let notifs = MOCK_DB.getData('tf_notifications');
        notifs = notifs.filter(n => n.id !== id);
        MOCK_DB.setData('tf_notifications', notifs);
        return { message: 'Notification deleted successfully', id };
    }

    throw new Error(`Endpoint mock handler not found for: ${method} ${path}`);
}

// Internal mock notification creator
function createMockNotification(title, message) {
    const notifs = MOCK_DB.getData('tf_notifications');
    const newNotif = {
        id: `notif-${Date.now()}`,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString()
    };
    notifs.unshift(newNotif);
    MOCK_DB.setData('tf_notifications', notifs);
    
    // Dispatch instant custom browser event so notifications.js can react
    Utils.events.emit('notification-received', newNotif);
}


const API = {
    auth: {
        login: (email, password) => request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        register: (name, email, password) => request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        }),
        forgotPassword: (email) => request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),
        resetPassword: (token, password) => request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        })
    },

    tasks: {
        getAll: () => request('/tasks'),
        create: (taskData) => request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        }),
        update: (id, taskData) => request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        }),
        delete: (id) => request(`/tasks/${id}`, {
            method: 'DELETE'
        })
    },

    projects: {
        getAll: () => request('/projects'),
        create: (projData) => request('/projects', {
            method: 'POST',
            body: JSON.stringify(projData)
        }),
        update: (id, projData) => request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projData)
        }),
        delete: (id) => request(`/projects/${id}`, {
            method: 'DELETE'
        })
    },

    profile: {
        get: () => request('/profile'),
        update: (profileData) => request('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        })
    },

notifications: {
    getAll: async () => {
        const res = await request('/notifications');
        console.log("Notification Response:", res);
        return res;
    },

    markAsRead: (id) => request(`/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true })
    }),

    delete: (id) => request(`/notifications/${id}`, {
        method: 'DELETE'
    })
}

};   // <-- YE MISSING THA

window.API = API;