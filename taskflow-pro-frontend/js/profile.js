/**
 * TaskFlow Pro - Profile Management Module
 */

const Profile = {
    selectedAvatar: 'avatar1',

    init() {
        if (!Auth.currentUser) return;
        this.bindEvents();
        this.loadProfile();
    },

    bindEvents() {
        // Profile form
        const profileForm = Utils.qs('#profile-info-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Password change form
        const passwordForm = Utils.qs('#profile-password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordUpdate(e));
        }

        // Avatar selector click bindings
        const avatarOptions = Utils.qsa('.avatar-option');
        avatarOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                avatarOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedAvatar = opt.dataset.avatar;
            });
        });
    },

    loadProfile() {
        const user = Auth.currentUser;
        if (!user) return;

        // Fill form fields
        const nameField = Utils.qs('#profile-name');
        const emailField = Utils.qs('#profile-email');
        const roleField = Utils.qs('#profile-role');

        if (nameField) nameField.value = user.name;
        if (emailField) emailField.value = user.email;
        if (roleField) roleField.value = user.role || '';

        // Select active avatar in selector UI
        this.selectedAvatar = user.avatar || 'avatar1';
        const avatarOptions = Utils.qsa('.avatar-option');
        avatarOptions.forEach(opt => {
            if (opt.dataset.avatar === this.selectedAvatar) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    },

    async handleProfileUpdate(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        const name = Utils.qs('#profile-name', form).value.trim();
        const email = Utils.qs('#profile-email', form).value.trim();
        const role = Utils.qs('#profile-role', form).value.trim();

        if (!name || !email) {
            Utils.toast('Name and email are required fields', 'warning');
            return;
        }

        try {
            Auth.setLoading(submitBtn, true);

            const updatedData = await API.profile.update({
                name,
                email,
                role,
                avatar: this.selectedAvatar
            });

            // Update local memory & UI displays in header/sidebar
            Auth.currentUser = updatedData;
            Auth.updateUserVisuals();

            Utils.toast('Profile details updated successfully!', 'success');

            setTimeout(() => {
                Auth.setLoading(submitBtn, false);
            }, 500);

        } catch (err) {
            Auth.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Failed to update profile settings', 'error');
        }
    },

    async handlePasswordUpdate(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        const currentPassword = Utils.qs('#profile-old-password', form).value;
        const newPassword = Utils.qs('#profile-new-password', form).value;
        const confirmPassword = Utils.qs('#profile-confirm-new-password', form).value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            Utils.toast('Please input current and new passwords.', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            Utils.toast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            Utils.toast('New password must be at least 6 characters long', 'error');
            return;
        }

        try {
            Auth.setLoading(submitBtn, true);

            // Fetch current users database to match passwords (in mock scenario)
            if (API_CONFIG.USE_MOCK_FALLBACK) {
                const users = JSON.parse(localStorage.getItem('tf_users'));
                const userIndex = users.findIndex(u => u.id === Auth.currentUser.id);
                
                if (userIndex === -1 || users[userIndex].password !== currentPassword) {
                    throw new Error('Current password is incorrect');
                }

                // Updatepassword in localStorage mock database
                users[userIndex].password = newPassword;
                localStorage.setItem('tf_users', JSON.stringify(users));
            } else {
                // If real backend, we would call an endpoint:
                // API.profile.updatePassword(...)
                // For direct compliance, we utilize existing profile update route mock wrappers
                await API.profile.update({ password: newPassword });
            }

            Utils.toast('Password updated successfully!', 'success');
            form.reset();

            setTimeout(() => {
                Auth.setLoading(submitBtn, false);
            }, 500);

        } catch (err) {
            Auth.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Failed to change password', 'error');
        }
    }
};

window.Profile = Profile;
