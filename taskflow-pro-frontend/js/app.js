
const App = {
    currentRoute: '',

    init() {
        this.bindGlobalEvents();
        this.initTheme();
        
        // Listen to Auth state updates
        Utils.events.on('auth-changed', (user) => this.handleAuthState(user));

        // Initial auth review
        Auth.init();

        // Boot router
        this.initRouter();
    },

    bindGlobalEvents() {
        // Collapsible Sidebar Handler
        const sidebarToggle = Utils.qs('#sidebar-collapse-btn');
        const layoutWrapper = Utils.qs('#app-layout');
        if (sidebarToggle && layoutWrapper) {
            sidebarToggle.addEventListener('click', () => {
                layoutWrapper.classList.toggle('sidebar-collapsed');
                // Save collapsed state
                localStorage.setItem('tf_sidebar_collapsed', layoutWrapper.classList.contains('sidebar-collapsed'));
            });

            // Restore collapsed state
            if (localStorage.getItem('tf_sidebar_collapsed') === 'true') {
                layoutWrapper.classList.add('sidebar-collapsed');
            }
        }

        // Header Profile Dropdown Trigger
        const headerProfile = Utils.qs('#header-profile-trigger');
        const profileDropdown = Utils.qs('#profile-dropdown-panel');
        if (headerProfile && profileDropdown) {
            headerProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
                
                // Close other notifications dropdown if open
                const notifDropdown = Utils.qs('#notif-dropdown-panel');
                if (notifDropdown) notifDropdown.classList.remove('active');
            });

            profileDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        // Close dropdowns on document click
        document.addEventListener('click', () => {
            if (profileDropdown) profileDropdown.classList.remove('active');
        });

        // Theme Toggle Buttons
        const themeBtn = Utils.qs('#theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Global Modal Closure Backdrop clicks
        Utils.qsa('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });

            // Bind Cancel/Close buttons in forms
            const closeBtn = Utils.qs('.modal-close', modal);
            const cancelBtn = Utils.qs('.btn-cancel', modal);
            
            const closeHandler = () => modal.classList.remove('active');
            if (closeBtn) closeBtn.addEventListener('click', closeHandler);
            if (cancelBtn) cancelBtn.addEventListener('click', closeHandler);
        });

        // Current Date Display
        const dateDisplay = Utils.qs('#header-current-date');
        if (dateDisplay) {
            dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }

        // Global search input redirects/focuses Tasks search
        const headerSearch = Utils.qs('#header-search-bar');
        if (headerSearch) {
            headerSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = headerSearch.value.trim();
                    if (query) {
                        window.location.hash = '#/tasks';
                        setTimeout(() => {
                            const taskSearch = Utils.qs('#task-search-input');
                            if (taskSearch) {
                                taskSearch.value = query;
                                taskSearch.dispatchEvent(new Event('input'));
                            }
                        }, 100);
                        headerSearch.value = '';
                    }
                }
            });
        }

        // Logout Triggers
        Utils.qsa('.btn-logout-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        });
    },


    initTheme() {
        const savedTheme = localStorage.getItem('tf_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButtonVisual(savedTheme);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('tf_theme', next);
        this.updateThemeButtonVisual(next);
        Utils.toast(`${next.charAt(0).toUpperCase() + next.slice(1)} Mode Enabled`, 'info', 1500);
    },

    updateThemeButtonVisual(theme) {
        const btnIcon = Utils.qs('#theme-toggle-btn span');
        if (btnIcon) {
            btnIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
    },

    // ----------------------------------------------------
    // Router (Hash-Based SPA)
    // ----------------------------------------------------
    initRouter() {
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Handle initial landing routing
        this.handleRouting();
    },

    handleRouting() {
        let hash = window.location.hash || '#/dashboard';
        
        // Check Session guards
        const isAuthenticated = !!localStorage.getItem('tf_token');

        if (!isAuthenticated) {
            // Unprotected views list
            if (hash !== '#/login' && hash !== '#/register' && !hash.startsWith('#/reset')) {
                window.location.hash = '#/login';
                return;
            }
        } else {
            // Logged in user hitting Auth views -> send to dashboard
            if (hash === '#/login' || hash === '#/register') {
                window.location.hash = '#/dashboard';
                return;
            }
        }

        this.currentRoute = hash;
        this.switchActiveView(hash);
    },

    switchActiveView(hash) {
        // Clean paths
        let viewId = '';
        let sidebarActiveSelector = '';

        switch (hash) {
            case '#/dashboard':
                viewId = '#dashboard-view';
                sidebarActiveSelector = '[href="#/dashboard"]';
                Dashboard.init();
                break;
            case '#/tasks':
                viewId = '#tasks-view';
                sidebarActiveSelector = '[href="#/tasks"]';
                Tasks.init();
                break;
            case '#/projects':
                viewId = '#projects-view';
                sidebarActiveSelector = '[href="#/projects"]';
                Projects.init();
                break;
            case '#/profile':
                viewId = '#profile-view';
                sidebarActiveSelector = '[href="#/profile"]';
                Profile.init();
                break;
            case '#/settings':
                viewId = '#settings-view';
                sidebarActiveSelector = '[href="#/settings"]';
                // Settings simple display initialization
                break;
            case '#/login':
                viewId = '#auth-view';
                Auth.switchAuthCard('#login-card');
                break;
            case '#/register':
                viewId = '#auth-view';
                Auth.switchAuthCard('#register-card');
                break;
            default:
                if (hash.startsWith('#/reset')) {
                    viewId = '#auth-view';
                    Auth.switchAuthCard('#reset-card');
                } else {
                    viewId = '#notfound-view';
                }
                break;
        }

        // Hide all views, display targeted view
        Utils.qsa('.app-view').forEach(view => {
            view.classList.remove('active');
        });

        const activeView = Utils.qs(viewId);
        if (activeView) {
            activeView.classList.add('active');
        }

        // Highlight sidebar selection
        Utils.qsa('.sidebar-menu-list a').forEach(link => {
            link.classList.remove('active');
        });

        if (sidebarActiveSelector) {
            const activeLink = Utils.qs(`.sidebar-menu-list a${sidebarActiveSelector}`);
            if (activeLink) activeLink.classList.add('active');
        }

        // Trigger dynamic notification panel badge loading on every route change
        if (isAuthenticated()) {
            Notifications.init();
        }
    },

    handleAuthState(user) {
        if (user) {
            document.body.classList.add('logged-in');
            document.body.classList.remove('logged-out');
            Auth.updateUserVisuals();
            Notifications.init();
        } else {
            document.body.classList.remove('logged-in');
            document.body.classList.add('logged-out');
        }
    }
};

// Helper check
function isAuthenticated() {
    return !!localStorage.getItem('tf_token');
}

// Global bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
