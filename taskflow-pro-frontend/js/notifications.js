/**
 * TaskFlow Pro - Notifications Module
 */

const Notifications = {
    allNotifications: [],

    async init() {
        if (!Auth.currentUser) return;
        this.bindEvents();
        await this.loadNotifications();
    },

    bindEvents() {
        // Toggle notification panel dropdown in header
        const bellBtn = Utils.qs('#header-notif-bell');
        const notifDropdown = Utils.qs('#notif-dropdown-panel');

        if (bellBtn && notifDropdown) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('active');
                
                // Close other profile dropdown if open
                const profileDropdown = Utils.qs('#profile-dropdown-panel');
                if (profileDropdown) profileDropdown.classList.remove('active');
            });

            // Prevent dropdown closure on inner click
            notifDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        // Close dropdown on body click
        document.addEventListener('click', () => {
            if (notifDropdown) notifDropdown.classList.remove('active');
        });

        // Listen for new mock notification event
        Utils.events.off('notification-received', this.handleNewNotification);
        Utils.events.on('notification-received', (notif) => this.handleNewNotification(notif));
    },

    async loadNotifications() {
        try {
            const data = await API.notifications.getAll();
            this.allNotifications = data;
            this.render();
        } catch (e) {
            console.error('Failed to load notifications:', e);
        }
    },

    render() {
        const listContainer = Utils.qs('#notif-dropdown-list');
        const badge = Utils.qs('#header-notif-badge');
        
        if (!listContainer) return;

        const unreadCount = this.allNotifications.filter(n => !n.read).length;

        // Render header count badge
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }

        // Check empty states
        if (this.allNotifications.length === 0) {
            listContainer.innerHTML = `
                <div class="inner-empty-state py-4 text-center">
                    <span class="material-icons-round text-muted" style="font-size: 32px;">notifications_off</span>
                    <p class="text-muted mt-2">All caught up! No notifications.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.allNotifications.map(n => {
            const readClass = n.read ? 'read' : 'unread';
            const dot = n.read ? '' : '<span class="notif-dot"></span>';
            const time = Utils.formatRelativeTime(n.createdAt);

            return `
                <div class="notif-item ${readClass}" onclick="Notifications.markAsRead('${n.id}')">
                    <div class="notif-content-wrapper">
                        <h5 class="notif-item-title">${n.title}</h5>
                        <p class="notif-item-desc">${n.message}</p>
                        <span class="notif-item-time">${time}</span>
                    </div>
                    <div class="notif-actions">
                        ${dot}
                        <button class="btn-icon mini danger" onclick="Notifications.deleteNotification(event, '${n.id}')" title="Delete notification">
                            <span class="material-icons-round" style="font-size: 16px;">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async markAsRead(id) {
        try {
            const notif = this.allNotifications.find(n => n.id === id);
            if (notif && !notif.read) {
                await API.notifications.markAsRead(id);
                await this.loadNotifications();
            }
        } catch (e) {
            console.error('Failed to mark read:', e);
        }
    },

    async deleteNotification(e, id) {
        e.stopPropagation(); // Avoid triggering markAsRead click
        try {
            await API.notifications.delete(id);
            Utils.toast('Notification deleted', 'info');
            await this.loadNotifications();
        } catch (err) {
            Utils.toast('Failed to delete notification', 'error');
        }
    },

    handleNewNotification(notif) {
        // Play visual Toast alert immediately
        Utils.toast(`${notif.title}: ${notif.message}`, 'info', 4000);
        
        // Reload notifications list
        this.loadNotifications();
    }
};

window.Notifications = Notifications;
