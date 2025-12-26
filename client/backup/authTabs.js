

class AuthTabs {
    constructor() {
        this.currentTab = 'login';
        this.tabs = ['login', 'register', 'guest'];

        // DOM Elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabIndicator = document.querySelector('.tab-indicator');
        this.tabPanels = document.querySelector('.tab-panels');
        this.tabPanelElements = document.querySelectorAll('.tab-panel');
        this.contentWrapper = document.querySelector('.tab-content-wrapper');

        // Swipe tracking
        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;
        this.ignoreDrag = false;
        this.threshold = 50; // Min distance to trigger swipe

        this.init();
    }

    init() {
        // Tab button clicks
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Swipe events
        this.tabPanels.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.tabPanels.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.tabPanels.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Mouse events for desktop testing
        this.tabPanels.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        this.tabPanels.addEventListener('mousemove', (e) => this.handleTouchMove(e));
        this.tabPanels.addEventListener('mouseup', (e) => this.handleTouchEnd(e));
        this.tabPanels.addEventListener('mouseleave', (e) => this.handleTouchEnd(e));

        // Fit wrapper height on load + on resize (small laptop heights)
        this.syncAuthHeight();
        window.addEventListener('resize', () => this.syncAuthHeight());

        // If your password rules UI changes height while typing
        const registerPassword = document.getElementById('registerPassword');
        if (registerPassword) {
            registerPassword.addEventListener('input', () => this.syncAuthHeight());
        }

        console.log('✅ Auth Tabs initialized');
    }

    switchTab(tab) {
        if (!this.tabs.includes(tab)) return;

        this.currentTab = tab;

        // Update tab buttons
        this.tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update indicator
        this.tabIndicator.setAttribute('data-active', tab);

        // Update panels
        this.tabPanels.setAttribute('data-current-tab', tab);

        // Update panel visibility
        this.tabPanelElements.forEach(panel => {
            if (panel.getAttribute('data-panel') === tab) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // Clear any error messages when switching tabs
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
        document.getElementById('guestErrorMessage').textContent = '';

        // UI only: fit wrapper to active panel, and enable scroll only for register
        this.syncAuthHeight();
    }

    syncAuthHeight() {
        if (!this.contentWrapper || !this.tabPanels) return;

        const activePanel = this.tabPanels.querySelector('.tab-panel.active');
        if (!activePanel) return;

        // Only Register gets internal scrolling
        const isRegister = this.currentTab === 'register';
        document.body.classList.toggle('is-register', isRegister);

        // Fit wrapper height to the active panel => remove huge empty space on Login/Guest
        requestAnimationFrame(() => {
            this.contentWrapper.style.height = activePanel.scrollHeight + 'px';
        });
    }

    // Touch/Swipe Handlers
    handleTouchStart(e) {
        // Ignore dragging when starting on form controls (inputs, textareas, selects, buttons)
        const target = e.target;
        if (target) {
            const control = target.closest && target.closest('input, textarea, select, button, .input-wrapper');
            if (control) {
                this.isDragging = false;
                this.ignoreDrag = true;
                return;
            }
        }

        this.ignoreDrag = false;
        this.isDragging = true;
        this.startX = e.type.includes('mouse')
            ? e.pageX
            : (e.touches && e.touches[0] && e.touches[0].pageX) || 0;

        this.currentX = this.startX;
    }

    handleTouchMove(e) {
        if (this.ignoreDrag) return;
        if (!this.isDragging) return;

        this.currentX = e.type.includes('mouse')
            ? e.pageX
            : (e.touches && e.touches[0] && e.touches[0].pageX) || this.currentX;

        const diff = this.currentX - this.startX;

        // Optional: Add rubber band effect while dragging
        // (can be added later for more polish)
    }

    handleTouchEnd(e) {
        if (this.ignoreDrag) {
            this.ignoreDrag = false;
            this.isDragging = false;
            this.startX = 0;
            this.currentX = 0;
            return;
        }

        if (!this.isDragging) return;

        this.isDragging = false;
        const diff = this.currentX - this.startX;

        // Determine swipe direction
        if (Math.abs(diff) > this.threshold) {
            if (diff > 0) {
                // Swipe right → previous tab
                this.goToPreviousTab();
            } else {
                // Swipe left → next tab
                this.goToNextTab();
            }
        }

        // Reset
        this.startX = 0;
        this.currentX = 0;
    }

    goToNextTab() {
        const currentIndex = this.tabs.indexOf(this.currentTab);
        if (currentIndex < this.tabs.length - 1) {
            const nextTab = this.tabs[currentIndex + 1];
            this.switchTab(nextTab);
        }
    }

    goToPreviousTab() {
        const currentIndex = this.tabs.indexOf(this.currentTab);
        if (currentIndex > 0) {
            const prevTab = this.tabs[currentIndex - 1];
            this.switchTab(prevTab);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthTabs();
});
