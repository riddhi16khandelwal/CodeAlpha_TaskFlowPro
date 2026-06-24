/**
 * TaskFlow Pro - Utilities & Reusable Helper Functions
 */

const Utils = {
    // ----------------------------------------------------
    // DOM Helpers
    // ----------------------------------------------------
    qs(selector, container = document) {
        return container.querySelector(selector);
    },

    qsa(selector, container = document) {
        return Array.from(container.querySelectorAll(selector));
    },

    el(tag, attributes = {}, ...children) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    element.dataset[dataKey] = dataValue;
                }
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        }
        return element;
    },

    // ----------------------------------------------------
    // Date & Time Helpers
    // ----------------------------------------------------
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        if (isNaN(date)) return 'Invalid date';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    formatRelativeTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 0) return 'Just now'; // Future date or minor clock drift
        if (seconds < 60) return 'Just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    // ----------------------------------------------------
    // Toast Notification System
    // ----------------------------------------------------
    toast(message, type = 'success', duration = 3000) {
        let container = this.qs('#toast-container');
        if (!container) {
            container = this.el('div', { id: 'toast-container', className: 'toast-container' });
            document.body.appendChild(container);
        }

        const iconMap = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = this.el('div', { className: `toast toast-${type}` },
            this.el('span', { className: 'material-icons-round toast-icon' }, iconMap[type] || 'info'),
            this.el('span', { className: 'toast-message' }, message),
            this.el('button', { 
                className: 'toast-close', 
                onclick: () => toast.remove() 
            }, '×')
        );

        container.appendChild(toast);

        // Slide/Fade-in is handled by CSS, trigger autohide
        setTimeout(() => {
            toast.classList.add('toast-hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    },

    // ----------------------------------------------------
    // Event Broker (Pub/Sub)
    // ----------------------------------------------------
    events: {
        listeners: {},
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        },
        off(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        },
        emit(event, data) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            });
        }
    },

    // ----------------------------------------------------
    // SVG Dashboard Charting Engine (Interactive & Responsive)
    // ----------------------------------------------------
    renderChart(containerId, dataPoints, labels) {
        const container = this.qs(`#${containerId}`);
        if (!container) return;

        container.innerHTML = ''; // Clear previous contents
        const width = container.clientWidth || 500;
        const height = container.clientHeight || 200;
        const padding = 30;

        const maxVal = Math.max(...dataPoints, 5); // Fallback to scale of 5 if data is empty/zero
        const minVal = 0;

        const getX = (index) => padding + (index / (dataPoints.length - 1)) * (width - padding * 2);
        const getY = (value) => height - padding - ((value - minVal) / (maxVal - minVal)) * (height - padding * 2);

        // Setup SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        // Add Gradients
        svg.innerHTML = `
            <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
        `;

        // Horizontal Gridlines
        const gridLinesCount = 4;
        for (let i = 0; i <= gridLinesCount; i++) {
            const val = minVal + (i / gridLinesCount) * (maxVal - minVal);
            const y = getY(val);

            // Line
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", padding);
            line.setAttribute("y1", y);
            line.setAttribute("x2", width - padding);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", "var(--color-border)");
            line.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(line);

            // Label
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", padding - 5);
            text.setAttribute("y", y + 4);
            text.setAttribute("fill", "var(--color-text-muted)");
            text.setAttribute("font-size", "10px");
            text.setAttribute("text-anchor", "end");
            text.textContent = Math.round(val);
            svg.appendChild(text);
        }

        // Draw Line and Gradient Area paths
        if (dataPoints.length > 0) {
            let linePath = `M ${getX(0)} ${getY(dataPoints[0])}`;
            let areaPath = `M ${getX(0)} ${height - padding} L ${getX(0)} ${getY(dataPoints[0])}`;

            for (let i = 1; i < dataPoints.length; i++) {
                const x = getX(i);
                const y = getY(dataPoints[i]);
                linePath += ` L ${x} ${y}`;
                areaPath += ` L ${x} ${y}`;
            }

            areaPath += ` L ${getX(dataPoints.length - 1)} ${height - padding} Z`;

            // Draw Area
            const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
            area.setAttribute("d", areaPath);
            area.setAttribute("fill", "url(#chart-grad)");
            svg.appendChild(area);

            // Draw Line
            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            line.setAttribute("d", linePath);
            line.setAttribute("fill", "none");
            line.setAttribute("stroke", "var(--color-primary)");
            line.setAttribute("stroke-width", "3");
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);

            // Draw Circles & Labels
            dataPoints.forEach((point, index) => {
                const x = getX(index);
                const y = getY(point);

                // Circle dot
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("cx", x);
                dot.setAttribute("cy", y);
                dot.setAttribute("r", "5");
                dot.setAttribute("fill", "var(--color-card)");
                dot.setAttribute("stroke", "var(--color-primary)");
                dot.setAttribute("stroke-width", "2");
                dot.setAttribute("style", "cursor: pointer; transition: r 0.2s;");

                // Tooltip trigger
                dot.addEventListener('mouseenter', () => {
                    dot.setAttribute("r", "7");
                    // Add micro tooltip
                    const tt = Utils.el('div', { 
                        id: 'chart-tooltip', 
                        className: 'chart-tooltip' 
                    }, `${labels[index]}: ${point} tasks`);
                    const rect = dot.getBoundingClientRect();
                    tt.style.left = `${rect.left + window.scrollX - 40}px`;
                    tt.style.top = `${rect.top + window.scrollY - 35}px`;
                    document.body.appendChild(tt);
                });

                dot.addEventListener('mouseleave', () => {
                    dot.setAttribute("r", "5");
                    const tt = Utils.qs('#chart-tooltip');
                    if (tt) tt.remove();
                });

                svg.appendChild(dot);

                // Draw X-axis label
                const xText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                xText.setAttribute("x", x);
                xText.setAttribute("y", height - 10);
                xText.setAttribute("fill", "var(--color-text-muted)");
                xText.setAttribute("font-size", "10px");
                xText.setAttribute("text-anchor", "middle");
                xText.textContent = labels[index] || '';
                svg.appendChild(xText);
            });
        }

        container.appendChild(svg);
    }
};

window.Utils = Utils;
