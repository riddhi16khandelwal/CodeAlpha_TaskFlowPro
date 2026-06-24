/**
 * TaskFlow Pro - Tasks Module (CRUD, Kanban, Filters, Sorting, Pagination)
 */

const Tasks = {
    allTasks: [],
    projects: [],
    viewMode: 'kanban', // 'kanban' or 'table'
    currentPage: 1,
    itemsPerPage: 6,
    
    // Filter & Sort state
    filters: {
        search: '',
        status: 'all',
        priority: 'all',
        project: 'all'
    },
    sortBy: 'dueDate-asc', // 'dueDate-asc', 'dueDate-desc', 'priority-high', 'priority-low'

    async init() {
        if (!Auth.currentUser) return;
        this.bindEvents();
        await this.loadData();
        this.render();
    },

    bindEvents() {
        // Search bar
        const searchInput = Utils.qs('#task-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.render();
            });
        }

        // Filter Dropdowns
        const statusFilter = Utils.qs('#task-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }

        const priorityFilter = Utils.qs('#task-filter-priority');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.filters.priority = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }

        const projectFilter = Utils.qs('#task-filter-project');
        if (projectFilter) {
            projectFilter.addEventListener('change', (e) => {
                this.filters.project = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }

        // Sort Selector
        const sortSelect = Utils.qs('#task-sort-by');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.render();
            });
        }

        // View Mode Toggles
        const btnKanban = Utils.qs('#btn-view-kanban');
        const btnTable = Utils.qs('#btn-view-table');

        if (btnKanban && btnTable) {
            btnKanban.addEventListener('click', () => {
                this.viewMode = 'kanban';
                btnKanban.classList.add('active');
                btnTable.classList.remove('active');
                this.render();
            });
            btnTable.addEventListener('click', () => {
                this.viewMode = 'table';
                btnTable.classList.add('active');
                btnKanban.classList.remove('active');
                this.render();
            });
        }

        // Create Task Modal Trigger
        const btnCreate = Utils.qs('#btn-create-task-modal');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => this.openCreateModal());
        }

        // Form submission
        const taskForm = Utils.qs('#task-modal-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    },

    async loadData() {
        try {
            const [tasksData, projectsData] = await Promise.all([
                API.tasks.getAll(),
                API.projects.getAll()
            ]);
            this.allTasks = tasksData;
            this.projects = projectsData;

            // Populate project dropdown filter and form project choices
            this.populateProjectDropdowns();
        } catch (e) {
            Utils.toast('Failed to download tasks database', 'error');
        }
    },

    populateProjectDropdowns() {
        const filterDropdown = Utils.qs('#task-filter-project');
        const formDropdown = Utils.qs('#task-form-project');

        const optionsHtml = `
            <option value="all">All Projects</option>
            ${this.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
        `;

        const formOptionsHtml = `
            <option value="">No Project</option>
            ${this.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
        `;

        if (filterDropdown) filterDropdown.innerHTML = optionsHtml;
        if (formDropdown) formDropdown.innerHTML = formOptionsHtml;
    },

    // ----------------------------------------------------
    // Filtering & Sorting Computations
    // ----------------------------------------------------
    getProcessedTasks() {
        let list = [...this.allTasks];

        // Apply Search
        if (this.filters.search) {
            list = list.filter(t => 
                t.title.toLowerCase().includes(this.filters.search) || 
                t.description.toLowerCase().includes(this.filters.search)
            );
        }

        // Status Filter
        if (this.filters.status !== 'all') {
            list = list.filter(t => t.status === this.filters.status);
        }

        // Priority Filter
        if (this.filters.priority !== 'all') {
            list = list.filter(t => t.priority === this.filters.priority);
        }

        // Project Filter
        if (this.filters.project !== 'all') {
            list = list.filter(t => t.projectId === this.filters.project);
        }

        // Apply Sorting
        const priorityWeight = { low: 1, medium: 2, high: 3 };
        
        list.sort((a, b) => {
            if (this.sortBy === 'dueDate-asc') {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (this.sortBy === 'dueDate-desc') {
                return new Date(b.dueDate) - new Date(a.dueDate);
            }
            if (this.sortBy === 'priority-high') {
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            }
            if (this.sortBy === 'priority-low') {
                return priorityWeight[a.priority] - priorityWeight[b.priority];
            }
            return 0;
        });

        return list;
    },

    // ----------------------------------------------------
    // Rendering Dispatcher
    // ----------------------------------------------------
    render() {
        const kanbanWrapper = Utils.qs('#tasks-view-kanban');
        const tableWrapper = Utils.qs('#tasks-view-table');

        if (this.viewMode === 'kanban') {
            if (kanbanWrapper) kanbanWrapper.style.display = 'grid';
            if (tableWrapper) tableWrapper.style.display = 'none';
            this.renderKanban();
        } else {
            if (kanbanWrapper) kanbanWrapper.style.display = 'none';
            if (tableWrapper) tableWrapper.style.display = 'block';
            this.renderTable();
        }
    },

    // ----------------------------------------------------
    // Kanban Board Render & Drag-and-Drop
    // ----------------------------------------------------
    renderKanban() {
        const columns = {
            'todo': Utils.qs('#kanban-col-todo'),
            'in-progress': Utils.qs('#kanban-col-inprogress'),
            'completed': Utils.qs('#kanban-col-completed')
        };

        // Clear columns
        Object.values(columns).forEach(col => {
            if (col) {
                const listContainer = Utils.qs('.kanban-cards-list', col);
                if (listContainer) listContainer.innerHTML = '';
            }
        });

        const processed = this.getProcessedTasks();

        processed.forEach(task => {
            const col = columns[task.status];
            if (!col) return;

            const listContainer = Utils.qs('.kanban-cards-list', col);
            if (!listContainer) return;

            const project = this.projects.find(p => p.id === task.projectId);
            const projName = project ? project.name : 'Personal';

            const card = Utils.el('div', {
                className: 'card kanban-card',
                draggable: 'true',
                ondragstart: (e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    card.classList.add('dragging');
                },
                ondragend: () => {
                    card.classList.remove('dragging');
                }
            },
                Utils.el('div', { className: 'kanban-card-header' },
                    Utils.el('span', { className: `badge badge-priority-${task.priority}` }, task.priority),
                    Utils.el('span', { className: 'badge badge-label' }, task.label || 'Task')
                ),
                Utils.el('h4', { className: 'kanban-card-title' }, task.title),
                Utils.el('p', { className: 'kanban-card-desc' }, task.description || ''),
                Utils.el('div', { className: 'kanban-card-footer' },
                    Utils.el('span', { className: 'kanban-card-project' },
                        Utils.el('span', { className: 'material-icons-round inline-icon' }, 'folder'),
                        projName
                    ),
                    Utils.el('span', { className: 'kanban-card-date' },
                        Utils.el('span', { className: 'material-icons-round inline-icon' }, 'event'),
                        Utils.formatDate(task.dueDate)
                    )
                ),
                Utils.el('div', { className: 'kanban-card-actions' },
                    Utils.el('button', { 
                        className: 'btn-icon',
                        title: 'Edit Task',
                        onclick: (e) => { e.stopPropagation(); this.openEditModal(task); }
                    }, Utils.el('span', { className: 'material-icons-round' }, 'edit')),
                    Utils.el('button', { 
                        className: 'btn-icon danger',
                        title: 'Delete Task',
                        onclick: (e) => { e.stopPropagation(); this.confirmDelete(task.id); }
                    }, Utils.el('span', { className: 'material-icons-round' }, 'delete'))
                )
            );

            listContainer.appendChild(card);
        });

        // Set up drop zones
        Object.entries(columns).forEach(([statusKey, colEl]) => {
            if (!colEl) return;
            const listContainer = Utils.qs('.kanban-cards-list', colEl);
            if (!listContainer) return;

            // Count label
            const countLabel = Utils.qs('.kanban-col-count', colEl);
            if (countLabel) {
                countLabel.textContent = processed.filter(t => t.status === statusKey).length;
            }

            listContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                listContainer.classList.add('drag-over');
            });

            listContainer.addEventListener('dragleave', () => {
                listContainer.classList.remove('drag-over');
            });

            listContainer.addEventListener('drop', async (e) => {
                e.preventDefault();
                listContainer.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                
                try {
                    const taskIndex = this.allTasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1 && this.allTasks[taskIndex].status !== statusKey) {
                        // Update on local DB
                        this.allTasks[taskIndex].status = statusKey;
                        await API.tasks.update(taskId, { status: statusKey });
                        
                        Utils.toast('Task status updated', 'success');
                        this.render();
                        Utils.events.emit('task-updated');
                    }
                } catch (err) {
                    Utils.toast('Failed to save status update', 'error');
                }
            });
        });
    },

    // ----------------------------------------------------
    // Table View Render & Pagination
    // ----------------------------------------------------
    renderTable() {
        const tableBody = Utils.qs('#task-table-body');
        if (!tableBody) return;

        const processed = this.getProcessedTasks();
        
        // Paginate
        const totalItems = processed.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginated = processed.slice(startIdx, endIdx);

        if (paginated.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-4">
                        <div class="inner-empty-state">
                            <span class="material-icons-round">assignment_late</span>
                            <p>No tasks match the active filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            this.renderPaginationControls(1, 1);
            return;
        }

        tableBody.innerHTML = paginated.map(task => {
            const project = this.projects.find(p => p.id === task.projectId);
            const projName = project ? project.name : 'Personal';
            const statusIcon = task.status === 'completed' ? 'check_circle' : 'radio_button_unchecked';
            const statusClass = task.status === 'completed' ? 'completed' : '';

            return `
                <tr class="${statusClass}">
                    <td>
                        <button class="task-status-btn" onclick="Tasks.toggleStatus('${task.id}')">
                            <span class="material-icons-round">${statusIcon}</span>
                        </button>
                    </td>
                    <td><strong class="task-title-cell">${task.title}</strong></td>
                    <td><span class="badge badge-label">${task.label || 'Task'}</span></td>
                    <td><span class="badge badge-priority-${task.priority}">${task.priority}</span></td>
                    <td>
                        <span class="badge badge-status-${task.status}">
                            ${task.status === 'in-progress' ? 'In Progress' : task.status}
                        </span>
                    </td>
                    <td>${Utils.formatDate(task.dueDate)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon" onclick="Tasks.openEditModalById('${task.id}')">
                                <span class="material-icons-round">edit</span>
                            </button>
                            <button class="btn-icon danger" onclick="Tasks.confirmDelete('${task.id}')">
                                <span class="material-icons-round">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPaginationControls(this.currentPage, totalPages);
    },

    renderPaginationControls(current, total) {
        const container = Utils.qs('#task-pagination');
        if (!container) return;

        container.innerHTML = `
            <button class="btn btn-secondary btn-pagination" ${current === 1 ? 'disabled' : ''} onclick="Tasks.changePage(${current - 1})">
                <span class="material-icons-round">chevron_left</span>
            </button>
            <span class="pagination-info">Page ${current} of ${total}</span>
            <button class="btn btn-secondary btn-pagination" ${current === total ? 'disabled' : ''} onclick="Tasks.changePage(${current + 1})">
                <span class="material-icons-round">chevron_right</span>
            </button>
        `;
    },

    changePage(newPage) {
        this.currentPage = newPage;
        this.renderTable();
    },

    async toggleStatus(id) {
        try {
            const task = this.allTasks.find(t => t.id === id);
            if (!task) return;

            const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
            await API.tasks.update(id, { status: nextStatus });
            
            Utils.toast('Task status updated', 'success');
            await this.loadData();
            this.render();
            Utils.events.emit('task-updated');
        } catch (e) {
            Utils.toast('Failed to change status', 'error');
        }
    },

    // ----------------------------------------------------
    // Modal & CRUD Operations
    // ----------------------------------------------------
    openCreateModal() {
        const modal = Utils.qs('#task-modal');
        if (!modal) return;

        // Reset and configure modal
        const form = Utils.qs('#task-modal-form');
        form.reset();
        Utils.qs('#task-modal-title').textContent = 'Create New Task';
        Utils.qs('#task-form-id').value = '';
        
        // Show modal with animations
        modal.classList.add('active');
    },

    openEditModal(task) {
        const modal = Utils.qs('#task-modal');
        if (!modal) return;

        Utils.qs('#task-modal-title').textContent = 'Edit Task';
        Utils.qs('#task-form-id').value = task.id;
        Utils.qs('#task-form-title').value = task.title;
        Utils.qs('#task-form-desc').value = task.description || '';
        Utils.qs('#task-form-priority').value = task.priority;
        Utils.qs('#task-form-status').value = task.status;
        Utils.qs('#task-form-label').value = task.label || 'Feature';
        Utils.qs('#task-form-date').value = task.dueDate;
        Utils.qs('#task-form-project').value = task.projectId || '';

        modal.classList.add('active');
    },

    openEditModalById(id) {
        const task = this.allTasks.find(t => t.id === id);
        if (task) this.openEditModal(task);
    },

    closeModal() {
        const modal = Utils.qs('#task-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = Utils.qs('button[type="submit"]', form);

        const id = Utils.qs('#task-form-id').value;
        const taskData = {
            title: Utils.qs('#task-form-title').value.trim(),
            description: Utils.qs('#task-form-desc').value.trim(),
            priority: Utils.qs('#task-form-priority').value,
            status: Utils.qs('#task-form-status').value,
            label: Utils.qs('#task-form-label').value,
            dueDate: Utils.qs('#task-form-date').value,
          project: Utils.qs('#task-form-project').value || null,
            assignedUser: Auth.currentUser.name
        };

        if (!taskData.title || !taskData.dueDate) {
            Utils.toast('Please input a title and select a due date.', 'warning');
            return;
        }

        try {
            Auth.setLoading(submitBtn, true);
            if (id) {
                // Update
                await API.tasks.update(id, taskData);
                Utils.toast('Task updated successfully!', 'success');
            } else {
                // Create
                await API.tasks.create(taskData);
                Utils.toast('Task created successfully!', 'success');
            }

            setTimeout(async () => {
                Auth.setLoading(submitBtn, false);
                this.closeModal();
                await this.loadData();
                this.render();
                Utils.events.emit('task-updated');
            }, 500);

        } catch (err) {
            Auth.setLoading(submitBtn, false);
            Utils.toast('Operation failed', 'error');
        }
    },

    confirmDelete(id) {
        // We will build a reusable confirmation modal, but a basic visual fallback works great too.
        // Let's implement confirmation logic.
        const confirmModal = Utils.qs('#confirm-modal');
        if (confirmModal) {
            confirmModal.classList.add('active');
            
            const btnConfirm = Utils.qs('#btn-confirm-delete');
            const btnCancel = Utils.qs('#btn-cancel-delete');

            const onConfirm = async () => {
                try {
                    await API.tasks.delete(id);
                    Utils.toast('Task deleted', 'info');
                    confirmModal.classList.remove('active');
                    await this.loadData();
                    this.render();
                    Utils.events.emit('task-updated');
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

window.Tasks = Tasks;
// Trigger loading if tab already active (will be orchestrated by App)
