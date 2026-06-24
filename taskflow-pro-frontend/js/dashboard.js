/**
 * TaskFlow Pro - Dashboard Module
 */

const Dashboard = {
    async init() {
        if (!Auth.currentUser) return;
        
        // Show skeleton loading initially
        this.renderSkeleton();

        try {
            // Fetch necessary data through API client
            const [tasks, projects] = await Promise.all([
                API.tasks.getAll(),
                API.projects.getAll()
            ]);

            this.renderStats(tasks);
            this.renderProgress(tasks);
            this.renderCharts(tasks);
            this.renderTodaysTasks(tasks);
            this.renderRecentTasks(tasks);
            this.renderUpcomingDeadlines(tasks);
            this.renderRecentProjects(projects);
            this.renderActivityLog(tasks);

        } catch (err) {
            console.error('Error loading dashboard data:', err);
            Utils.toast('Failed to load dashboard statistics', 'error');
            this.renderError();
        }
    },

    renderSkeleton() {
        const statsGrid = Utils.qs('#dashboard-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = Array(4).fill(0).map(() => `
                <div class="card skeleton-card">
                    <div class="skeleton skeleton-icon"></div>
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-value"></div>
                </div>
            `).join('');
        }
    },

    renderError() {
        const main = Utils.qs('#dashboard-view');
        if (main) {
            main.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons-round empty-icon">error_outline</span>
                    <h3>Unable to Load Dashboard</h3>
                    <p>There was an error connecting to the API service. Please try reloading.</p>
                    <button class="btn btn-primary" onclick="Dashboard.init()">Retry</button>
                </div>
            `;
        }
    },

    renderStats(tasks) {
        const statsGrid = Utils.qs('#dashboard-stats-grid');
        if (!statsGrid) return;

        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        
        // Count tasks past/impending due dates (due within 3 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const soonLimit = new Date();
        soonLimit.setDate(soonLimit.getDate() + 3);

        const urgentCount = tasks.filter(t => {
            if (t.status === 'completed') return false;
            const due = new Date(t.dueDate);
            return due >= today && due <= soonLimit;
        }).length;

        statsGrid.innerHTML = `
            <div class="card stat-card">
                <div class="stat-icon-wrapper primary">
                    <span class="material-icons-round">assignment</span>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Total Tasks</span>
                    <h3 class="stat-value">${total}</h3>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon-wrapper info">
                    <span class="material-icons-round">sync</span>
                </div>
                <div class="stat-content">
                    <span class="stat-label">In Progress</span>
                    <h3 class="stat-value">${inProgress}</h3>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon-wrapper success">
                    <span class="material-icons-round">check_circle</span>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Completed</span>
                    <h3 class="stat-value">${completed}</h3>
                </div>
            </div>
            <div class="card stat-card">
                <div class="stat-icon-wrapper danger">
                    <span class="material-icons-round">alarm</span>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Urgent Deadlines</span>
                    <h3 class="stat-value">${urgentCount}</h3>
                </div>
            </div>
        `;
    },

    renderProgress(tasks) {
        const progressCard = Utils.qs('#dashboard-progress-card');
        if (!progressCard) return;

        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        progressCard.innerHTML = `
            <div class="progress-info">
                <h4>Progress Overview</h4>
                <div class="progress-stats">
                    <span class="percent-highlight">${percent}%</span>
                    <span class="fraction-label">${completed} of ${total} tasks finished</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${percent}%"></div>
            </div>
            <p class="progress-subtext">
                ${percent === 100 
                    ? 'Incredible! You have crushed all remaining duties!' 
                    : percent > 50 
                        ? 'Great progress! You are more than halfway through.' 
                        : 'Stay focused! Start knocking down high priority tasks.'}
            </p>
        `;
    },

    renderCharts(tasks) {
        // Render Line chart showing task distribution by priority
        const priorities = ['low', 'medium', 'high'];
        const counts = priorities.map(pri => tasks.filter(t => t.priority === pri).length);
        const labels = ['Low Priority', 'Medium Priority', 'High Priority'];

        // Let's create an alternative: task creation completions over the last 5 days
        const last5Days = [];
        const labelDays = [];
        for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last5Days.push(d.toDateString().slice(4, 10)); // e.g. "Jun 24"
            
            // Count completed tasks on this date (or task creation date as fallback)
            const count = tasks.filter(t => {
                const taskDate = new Date(t.createdAt || t.dueDate).toDateString().slice(4, 10);
                return taskDate === d.toDateString().slice(4, 10);
            }).length;
            labelDays.push(count);
        }

        Utils.renderChart('dashboard-chart-svg-container', labelDays, last5Days);
    },

    renderTodaysTasks(tasks) {
        const container = Utils.qs('#todays-tasks-list');
        if (!container) return;

        const todayStr = new Date().toDateString();
        const todaysTasks = tasks.filter(t => {
            if (t.status === 'completed') return false;
            return new Date(t.dueDate).toDateString() === todayStr;
        });

        if (todaysTasks.length === 0) {
            container.innerHTML = `
                <div class="inner-empty-state">
                    <span class="material-icons-round">celebration</span>
                    <p>No tasks due today. Hooray!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = todaysTasks.map(t => this.createTaskRowHTML(t)).join('');
    },

    renderRecentTasks(tasks) {
        const container = Utils.qs('#recent-tasks-list');
        if (!container) return;

        // Sort by createdAt or id descending, grab top 4
        const sorted = [...tasks]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 4);

        if (sorted.length === 0) {
            container.innerHTML = `<p class="text-muted text-center p-3">No tasks created yet.</p>`;
            return;
        }

        container.innerHTML = sorted.map(t => this.createTaskRowHTML(t)).join('');
    },

    createTaskRowHTML(task) {
        const priorityBadge = `<span class="badge badge-priority-${task.priority}">${task.priority}</span>`;
        const statusIcon = task.status === 'completed' ? 'check_circle' : 'radio_button_unchecked';
        const statusClass = task.status === 'completed' ? 'completed' : '';

        return `
            <div class="task-list-row ${statusClass}" data-id="${task.id}">
                <button class="task-status-btn" onclick="Dashboard.toggleTaskStatus('${task.id}')">
                    <span class="material-icons-round">${statusIcon}</span>
                </button>
                <div class="task-row-details">
                    <span class="task-row-title">${task.title}</span>
                    <div class="task-row-meta">
                        ${priorityBadge}
                        <span class="task-row-date">
                            <span class="material-icons-round inline-icon">event</span>
                            ${Utils.formatDate(task.dueDate)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    async toggleTaskStatus(id) {
        try {
            const tasks = await API.tasks.getAll();
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            const newStatus = task.status === 'completed' ? 'todo' : 'completed';
            await API.tasks.update(id, { status: newStatus });
            
            Utils.toast('Task status updated', 'success');
            
            // Re-render dashboard stats and listings
            this.init();
            
            // Emit task-updated event for tasks module sync
            Utils.events.emit('task-updated');
        } catch (e) {
            Utils.toast('Failed to update task status', 'error');
        }
    },

    renderUpcomingDeadlines(tasks) {
        const container = Utils.qs('#upcoming-deadlines-list');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = tasks
            .filter(t => t.status !== 'completed' && new Date(t.dueDate) >= today)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);

        if (upcoming.length === 0) {
            container.innerHTML = `<p class="text-muted p-2 text-center">No upcoming deadlines.</p>`;
            return;
        }

        container.innerHTML = upcoming.map(t => {
            const daysLeft = Math.ceil((new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24));
            let urgencyClass = 'low';
            if (daysLeft <= 1) urgencyClass = 'high';
            else if (daysLeft <= 3) urgencyClass = 'medium';

            return `
                <div class="deadline-row ${urgencyClass}">
                    <div class="deadline-info">
                        <span class="deadline-title">${t.title}</span>
                        <span class="deadline-date">${Utils.formatDate(t.dueDate)}</span>
                    </div>
                    <span class="deadline-countdown badge-urgency-${urgencyClass}">
                        ${daysLeft === 0 ? 'Due Today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                    </span>
                </div>
            `;
        }).join('');
    },

    renderRecentProjects(projects) {
        const container = Utils.qs('#recent-projects-list');
        if (!container) return;

        const slice = projects.slice(0, 3);
        if (slice.length === 0) {
            container.innerHTML = `<p class="text-muted p-2 text-center">No projects defined.</p>`;
            return;
        }

        container.innerHTML = slice.map(p => `
            <div class="recent-proj-row" onclick="window.location.hash = '#/projects'">
                <div class="proj-row-header">
                    <span class="proj-row-name">${p.name}</span>
                    <span class="proj-row-percentage">${p.progress}%</span>
                </div>
                <div class="progress-bar-container mini">
                    <div class="progress-bar-fill" style="width: ${p.progress}%"></div>
                </div>
            </div>
        `).join('');
    },

    renderActivityLog(tasks) {
        const container = Utils.qs('#activity-feed-list');
        if (!container) return;

        // Generate synthetic activity logs from mock database dates
        const sorted = [...tasks]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 4);

        if (sorted.length === 0) {
            container.innerHTML = `<p class="text-muted p-2 text-center">No recent activities.</p>`;
            return;
        }

        container.innerHTML = sorted.map(t => {
            const time = Utils.formatRelativeTime(t.createdAt || new Date().toISOString());
            const user = t.assignedUser || 'You';
            
            let message = '';
            let icon = 'add_circle';
            let iconClass = 'primary';

            if (t.status === 'completed') {
                message = `<strong>${user}</strong> marked task "${t.title}" as complete.`;
                icon = 'check_circle';
                iconClass = 'success';
            } else if (t.status === 'in-progress') {
                message = `<strong>${user}</strong> started working on "${t.title}".`;
                icon = 'play_circle_filled';
                iconClass = 'info';
            } else {
                message = `<strong>${user}</strong> created task "${t.title}".`;
                icon = 'assignment';
                iconClass = 'primary';
            }

            return `
                <div class="activity-row">
                    <div class="activity-icon-wrapper ${iconClass}">
                        <span class="material-icons-round">${icon}</span>
                    </div>
                    <div class="activity-content">
                        <p class="activity-message">${message}</p>
                        <span class="activity-time">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Bind to event hub to reload dashboard items if updates happen elsewhere
Utils.events.on('task-updated', () => Dashboard.init());
Utils.events.on('project-updated', () => Dashboard.init());

window.Dashboard = Dashboard;
