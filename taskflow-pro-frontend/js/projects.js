/**
 * TaskFlow Pro - Projects Module (CRUD & Dashboard indicators)
 */

const Projects = {
    allProjects: [],
    tasks: [],

    async init() {
        if (!Auth.currentUser) return;
        this.bindEvents();
        await this.loadData();
        this.render();
    },

    bindEvents() {
        // Create Project Modal Trigger
        const btnCreate = Utils.qs('#btn-create-project-modal');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => this.openCreateModal());
        }

        // Form submission
        const projectForm = Utils.qs('#project-modal-form');
        if (projectForm) {
            projectForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    },

    async loadData() {
        try {
            const [projectsData, tasksData] = await Promise.all([
                API.projects.getAll(),
                API.tasks.getAll()
            ]);
            
            this.allProjects = projectsData;
            this.tasks = tasksData;

            // Compute dynamic progress based on tasks for each project
            this.computeProjectsProgress();
        } catch (e) {
            Utils.toast('Failed to load project database', 'error');
        }
    },

    computeProjectsProgress() {
        this.allProjects.forEach(proj => {
           const projTasks = this.tasks.filter(t => t.projectId === proj._id);
            if (projTasks.length === 0) {
                // If no tasks, fall back to stored progress or 0
                proj.totalTasks = 0;
                proj.completedTasks = 0;
                proj.progress = proj.progress || 0;
            } else {
                proj.totalTasks = projTasks.length;
                proj.completedTasks = projTasks.filter(t => t.status === 'completed').length;
                proj.progress = Math.round((proj.completedTasks / proj.totalTasks) * 100);
            }
        });
    },

    render() {
        const grid = Utils.qs('#projects-grid');
        if (!grid) return;

        if (this.allProjects.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <span class="material-icons-round empty-icon">folder_off</span>
                    <h3>No Projects Yet</h3>
                    <p>Get started by creating your first team workspace project.</p>
                    <button class="btn btn-primary" onclick="Projects.openCreateModal()">Create Project</button>
                </div>
            `;
            return;
        }
grid.innerHTML = this.allProjects.map(proj => {

    console.log("PROJECT DATA =", proj);

    const initialsListHtml = (proj.team || []).map(name => {
                const init = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return `<div class="team-bubble" title="${name}">${init}</div>`;
            }).join('');

            return `
                <div class="card project-card">
                    <div class="project-card-header">
                        <h3 class="project-card-title">${proj.name}</h3>
                        <div class="project-card-actions">
                            <button class="btn-icon" onclick="Projects.openEditModalById('${proj._id}')">
                                <span class="material-icons-round">edit</span>
                            </button>
                            <button class="btn-icon danger" onclick="Projects.confirmDelete('${proj._id}')">
                                <span class="material-icons-round">delete</span>
                            </button>
                        </div>
                    </div>
                    <p class="project-card-desc">${proj.description || 'No description provided.'}</p>
                    
                    <div class="project-stats-meta">
                        <div class="meta-stat">
                            <span class="meta-stat-label">Tasks</span>
                            <span class="meta-stat-value">${proj.completedTasks || 0} / ${proj.totalTasks || 0}</span>
                        </div>
                        <div class="meta-stat">
                            <span class="meta-stat-label">Deadline</span>
                            <span class="meta-stat-value text-danger">
                                <span class="material-icons-round inline-icon">event</span>
                ${proj.deadline ? Utils.formatDate(proj.deadline) : 'No deadline'}
                            </span>
                        </div>
                    </div>

                    <div class="project-progress-wrapper">
                        <div class="project-progress-label">
                            <span>Progress</span>
                            <strong>${proj.progress}%</strong>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${proj.progress}%"></div>
                        </div>
                    </div>

                    <div class="project-team-roster">
                        <span class="roster-label">Team:</span>
                        <div class="team-bubbles-group">
                            ${initialsListHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ----------------------------------------------------
    // Modals & CRUD Actions
    // ----------------------------------------------------
    openCreateModal() {
        const modal = Utils.qs('#project-modal');
        if (!modal) return;

        const form = Utils.qs('#project-modal-form');
        form.reset();
        Utils.qs('#project-modal-title').textContent = 'Create Project';
        Utils.qs('#project-form-id').value = '';

        modal.classList.add('active');
    },

    openEditModal(proj) {
        const modal = Utils.qs('#project-modal');
        if (!modal) return;

        Utils.qs('#project-modal-title').textContent = 'Edit Project';
        Utils.qs('#project-form-id').value = proj._id;
        Utils.qs('#project-form-name').value = proj.name;
        Utils.qs('#project-form-desc').value = proj.description || '';
        Utils.qs('#project-form-deadline').value = proj.deadline || '';
       Utils.qs('#project-form-team').value = (proj.team || []).join(', ');

        modal.classList.add('active');
    },

    openEditModalById(id) {
        const proj = this.allProjects.find(p => p._id === id);
        if (proj) this.openEditModal(proj);
    },

    closeModal() {
        const modal = Utils.qs('#project-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        const id = Utils.qs('#project-form-id').value;
        const name = Utils.qs('#project-form-name').value.trim();
        const description = Utils.qs('#project-form-desc').value.trim();
        const deadline = Utils.qs('#project-form-deadline').value;
        const teamRaw = Utils.qs('#project-form-team').value;

        if (!name || !deadline) {
            Utils.toast('Please input project name and deadline date.', 'warning');
            return;
        }

        // Split team names by comma, clean whitespace
        const team = teamRaw.split(',')
            .map(m => m.trim())
            .filter(m => m.length > 0);

        if (team.length === 0) {
            team.push(Auth.currentUser.name); // Default assign creator
        }

        const projData = { name, description, deadline, team };

        try {
            Auth.setLoading(submitBtn, true);
            if (id) {
                await API.projects.update(id, projData);
                Utils.toast('Project details modified', 'success');
            } else {
                await API.projects.create(projData);
                Utils.toast('New project created', 'success');
            }

            setTimeout(async () => {
                Auth.setLoading(submitBtn, false);
                this.closeModal();
                await this.loadData();
                this.render();
                Utils.events.emit('project-updated');
            }, 500);

        } catch (err) {
            Auth.setLoading(submitBtn, false);
            Utils.toast('Operation failed', 'error');
        }
    },

    confirmDelete(id) {
        const confirmModal = Utils.qs('#confirm-modal');
        if (confirmModal) {
            confirmModal.classList.add('active');
            
            const btnConfirm = Utils.qs('#btn-confirm-delete');
            const btnCancel = Utils.qs('#btn-cancel-delete');

            const onConfirm = async () => {
                try {
                    await API.projects.delete(id);
                    Utils.toast('Project deleted', 'info');
                    confirmModal.classList.remove('active');
                    await this.loadData();
                    this.render();
                    Utils.events.emit('project-updated');
                } catch (e) {
                    Utils.toast('Delete failed', 'error');
                }
                cleanup();
            };

            const onCancel = () => {
                confirmModal.classList.remove('active');
                cleanup();
            };

            const cleanup = () => {
                btnConfirm.removeEventListener('click', onConfirm);
                btnCancel.removeEventListener('click', onCancel);
            };

            btnConfirm.addEventListener('click', onConfirm);
            btnCancel.addEventListener('click', onCancel);
        }
    }
};

window.Projects = Projects;
