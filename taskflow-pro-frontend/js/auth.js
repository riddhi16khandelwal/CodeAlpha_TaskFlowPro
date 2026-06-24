/**
 * TaskFlow Pro - Authentication Module
 */

const Auth = {
    currentUser: null,

    init() {
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents() {
        // Form submissions
        const loginForm = Utils.qs('#login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = Utils.qs('#register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        const forgotForm = Utils.qs('#forgot-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        const resetForm = Utils.qs('#reset-form');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // View toggle links
        this.setupViewToggles();
    },

    setupViewToggles() {
        const triggers = [
            { id: '#link-to-register', show: '#register-card' },
            { id: '#link-to-login', show: '#login-card' },
            { id: '#link-to-forgot', show: '#forgot-card' },
            { id: '#link-forgot-to-login', show: '#login-card' },
            { id: '#link-reset-to-login', show: '#login-card' }
        ];

        triggers.forEach(({ id, show }) => {
            const el = Utils.qs(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchAuthCard(show);
                });
            }
        });
    },

    switchAuthCard(targetSelector) {
        Utils.qsa('.auth-card').forEach(card => {
            card.classList.remove('active');
        });
        const targetCard = Utils.qs(targetSelector);
        if (targetCard) {
            targetCard.classList.add('active');
        }
    },

   
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const email = Utils.qs('#login-email', form).value.trim();
        const password = Utils.qs('#login-password', form).value.trim();
        const rememberMe = Utils.qs('#login-remember', form).checked;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        if (!email || !password) {
            Utils.toast('Please fill in all fields', 'error');
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            const data = await API.auth.login(email, password);
            
            // Remember email if checked
            if (rememberMe) {
                localStorage.setItem('tf_remember_email', email);
            } else {
                localStorage.removeItem('tf_remember_email');
            }

            this.currentUser = data.user;
            Utils.toast(`Welcome back, ${data.user.name}!`, 'success');
            
            // Re-render components and transition to dashboard
            setTimeout(() => {
                this.setLoading(submitBtn, false);
                window.location.hash = '#/dashboard';
                Utils.events.emit('auth-changed', data.user);
            }, 500);

        } catch (err) {
            this.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Login failed. Please check your credentials.', 'error');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const name = Utils.qs('#register-name', form).value.trim();
        const email = Utils.qs('#register-email', form).value.trim();
        const password = Utils.qs('#register-password', form).value;
        const confirmPassword = Utils.qs('#register-confirm-password', form).value;
        const agreeTerms = Utils.qs('#register-agree', form).checked;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        if (!name || !email || !password || !confirmPassword) {
            Utils.toast('Please fill in all required fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            Utils.toast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            Utils.toast('Password must be at least 6 characters long', 'error');
            return;
        }

        if (!agreeTerms) {
            Utils.toast('You must agree to the Terms & Conditions', 'warning');
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            const data = await API.auth.register(name, email, password);
            
            this.currentUser = data.user;
            Utils.toast('Registration successful!', 'success');

            setTimeout(() => {
                this.setLoading(submitBtn, false);
                window.location.hash = '#/dashboard';
                Utils.events.emit('auth-changed', data.user);
            }, 500);

        } catch (err) {
            this.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Registration failed', 'error');
        }
    },

    async handleForgotPassword(e) {
        e.preventDefault();
        const form = e.target;
        const email = Utils.qs('#forgot-email', form).value.trim();
        const submitBtn = Utils.qs('button[type="submit"]', form);

        if (!email) {
            Utils.toast('Please enter your email address', 'error');
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            const data = await API.auth.forgotPassword(email);
            
            Utils.toast(data.message || 'Password reset link sent to your email.', 'success');
            
            setTimeout(() => {
                this.setLoading(submitBtn, false);
                // Pre-populate reset view for showcase testing
                const resetTokenInput = Utils.qs('#reset-token');
                if (resetTokenInput) resetTokenInput.value = 'mock-reset-token';
                this.switchAuthCard('#reset-card');
            }, 1000);

        } catch (err) {
            this.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Failed to send reset code', 'error');
        }
    },

    async handleResetPassword(e) {
        e.preventDefault();
        const form = e.target;
        const token = Utils.qs('#reset-token', form).value;
        const password = Utils.qs('#reset-password', form).value;
        const confirmPassword = Utils.qs('#reset-confirm-password', form).value;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        if (!password || !confirmPassword) {
            Utils.toast('Please complete all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            Utils.toast('Passwords do not match', 'error');
            return;
        }

        try {
            this.setLoading(submitBtn, true);
            await API.auth.resetPassword(token, password);
            Utils.toast('Password reset successful! Please log in.', 'success');
            
            setTimeout(() => {
                this.setLoading(submitBtn, false);
                form.reset();
                this.switchAuthCard('#login-card');
            }, 800);

        } catch (err) {
            this.setLoading(submitBtn, false);
            Utils.toast(err.message || 'Failed to reset password', 'error');
        }
    },

    logout() {
        localStorage.removeItem('tf_token');
        localStorage.removeItem('tf_current_user');
        this.currentUser = null;
        Utils.toast('Logged out successfully', 'info');
        
        setTimeout(() => {
            window.location.hash = '#/login';
            Utils.events.emit('auth-changed', null);
        }, 300);
    },

  
    checkAuth() {
        const token = localStorage.getItem('tf_token');
        const userJson = localStorage.getItem('tf_current_user');

        if (token && userJson) {
            this.currentUser = JSON.parse(userJson);
            document.body.classList.add('logged-in');
            document.body.classList.remove('logged-out');
            
            // Fill profile visuals in sidebar/header
            this.updateUserVisuals();

            // Set remembered email in login form if not logged in
            const remEmail = localStorage.getItem('tf_remember_email');
            if (remEmail) {
                const emailInput = Utils.qs('#login-email');
                const rememberCheckbox = Utils.qs('#login-remember');
                if (emailInput) emailInput.value = remEmail;
                if (rememberCheckbox) rememberCheckbox.checked = true;
            }
        } else {
            this.currentUser = null;
            document.body.classList.remove('logged-in');
            document.body.classList.add('logged-out');
            
            // Redirect to login hash if currently in dashboard territory
            const currentHash = window.location.hash;
            if (currentHash !== '#/login' && currentHash !== '#/register' && !currentHash.startsWith('#/reset')) {
                window.location.hash = '#/login';
            }
        }
    },

    updateUserVisuals() {
        if (!this.currentUser) return;
        
       
        Utils.qsa('.user-display-name').forEach(el => el.textContent = this.currentUser.name);
        Utils.qsa('.user-display-role').forEach(el => el.textContent = this.currentUser.role || 'Member');
        
        // Update avatar classes/sources
        Utils.qsa('.user-display-avatar').forEach(avatarContainer => {
            avatarContainer.className = `user-display-avatar avatar-bg-${this.currentUser.avatar || 'avatar1'}`;
            // Set initials
            const initials = this.currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            avatarContainer.textContent = initials;
        });
    },

    setLoading(button, isLoading) {
        if (!button) return;
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<span class="loader-spinner"></span> Loading...';
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    }
};

window.Auth = Auth;
