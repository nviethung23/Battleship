/**
 * Shared State Management for Battleship Game
 * Handles sessionStorage for persisting state across hub/lobby/game pages
 */

const BattleshipState = {
    // Keys for sessionStorage
    KEYS: {
        TOKEN: 'bs_token',
        USER_ID: 'bs_userId',
        USERNAME: 'bs_username',
        IS_GUEST: 'bs_isGuest',
        GUEST_DISPLAY_NAME: 'bs_guestDisplayName',
        ROOM_CODE: 'bs_roomCode',
        MODE: 'bs_mode' // 'queue' | 'private'
    },

    // Get auth token
    getToken() {
        return sessionStorage.getItem(this.KEYS.TOKEN) || localStorage.getItem('token');
    },

    // Set auth token
    setToken(token) {
        sessionStorage.setItem(this.KEYS.TOKEN, token);
        localStorage.setItem('token', token); // Keep in localStorage for backward compatibility
    },

    // Get user ID
    getUserId() {
        return sessionStorage.getItem(this.KEYS.USER_ID) || localStorage.getItem('userId');
    },

    // Set user ID
    setUserId(userId) {
        sessionStorage.setItem(this.KEYS.USER_ID, userId);
        localStorage.setItem('userId', userId);
    },

    // Get username
    getUsername() {
        return sessionStorage.getItem(this.KEYS.USERNAME) || localStorage.getItem('username');
    },

    // Set username
    setUsername(username) {
        sessionStorage.setItem(this.KEYS.USERNAME, username);
        localStorage.setItem('username', username);
    },

    // Get guest flag
    isGuest() {
        return sessionStorage.getItem(this.KEYS.IS_GUEST) === 'true' || 
               localStorage.getItem('isGuest') === 'true';
    },

    // Set guest flag
    setIsGuest(isGuest) {
        sessionStorage.setItem(this.KEYS.IS_GUEST, String(isGuest));
        localStorage.setItem('isGuest', String(isGuest));
    },

    // Get guest display name
    getGuestDisplayName() {
        return sessionStorage.getItem(this.KEYS.GUEST_DISPLAY_NAME) || 
               localStorage.getItem('guestDisplayName');
    },

    // Set guest display name
    setGuestDisplayName(name) {
        sessionStorage.setItem(this.KEYS.GUEST_DISPLAY_NAME, name);
        localStorage.setItem('guestDisplayName', name);
    },

    // Get room code
    getRoomCode() {
        return sessionStorage.getItem(this.KEYS.ROOM_CODE) || localStorage.getItem(this.KEYS.ROOM_CODE);
    },

    // Set room code
    setRoomCode(roomCode) {
        sessionStorage.setItem(this.KEYS.ROOM_CODE, roomCode);
        localStorage.setItem(this.KEYS.ROOM_CODE, roomCode);
    },

    // Clear room code
    clearRoomCode() {
        sessionStorage.removeItem(this.KEYS.ROOM_CODE);
        localStorage.removeItem(this.KEYS.ROOM_CODE);
    },

    // Get mode (queue or private)
    getMode() {
        return sessionStorage.getItem(this.KEYS.MODE);
    },

    // Set mode
    setMode(mode) {
        sessionStorage.setItem(this.KEYS.MODE, mode);
    },

    // Clear mode
    clearMode() {
        sessionStorage.removeItem(this.KEYS.MODE);
    },

    // Clear all room-related state (when leaving room)
    clearRoomState() {
        this.clearRoomCode();
        this.clearMode();
    },

    // Check if authenticated (with token expiry validation)
    isAuthenticated() {
        const token = this.getToken();
        if (!token || !this.getUserId() || !this.getUsername()) {
            return false;
        }

        try {
            // Decode JWT to check expiry (without signature verification)
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            const payload = JSON.parse(atob(parts[1]));
            const expiry = payload.exp * 1000; // Convert to ms

            // Check if expired
            if (Date.now() > expiry) {
                console.warn('[Auth] Token expired');
                this.clearAll();
                return false;
            }

            return true;
        } catch (e) {
            console.error('[Auth] Token parse error:', e);
            this.clearAll();
            return false;
        }
    },

    // Clear all state (logout)
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });
        // Also clear localStorage for backward compatibility
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestDisplayName');
        localStorage.removeItem(this.KEYS.ROOM_CODE);
    },

    // Redirect to login with message
    redirectToLogin(reason = 'Session expired') {
        console.warn('[Auth] Redirecting to login:', reason);
        this.clearAll();
        const msg = encodeURIComponent(reason);
        window.location.href = `/?msg=${msg}`;
    },

    // Sync from localStorage to sessionStorage (for initial page load)
    syncFromLocalStorage() {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        const isGuest = localStorage.getItem('isGuest');
        const guestDisplayName = localStorage.getItem('guestDisplayName');
        const roomCode = localStorage.getItem(this.KEYS.ROOM_CODE);

        if (token && !sessionStorage.getItem(this.KEYS.TOKEN)) {
            sessionStorage.setItem(this.KEYS.TOKEN, token);
        }
        if (userId && !sessionStorage.getItem(this.KEYS.USER_ID)) {
            sessionStorage.setItem(this.KEYS.USER_ID, userId);
        }
        if (username && !sessionStorage.getItem(this.KEYS.USERNAME)) {
            sessionStorage.setItem(this.KEYS.USERNAME, username);
        }
        if (isGuest && !sessionStorage.getItem(this.KEYS.IS_GUEST)) {
            sessionStorage.setItem(this.KEYS.IS_GUEST, isGuest);
        }
        if (guestDisplayName && !sessionStorage.getItem(this.KEYS.GUEST_DISPLAY_NAME)) {
            sessionStorage.setItem(this.KEYS.GUEST_DISPLAY_NAME, guestDisplayName);
        }
        if (roomCode && !sessionStorage.getItem(this.KEYS.ROOM_CODE)) {
            sessionStorage.setItem(this.KEYS.ROOM_CODE, roomCode);
        }
    }
};

// Sync on load
BattleshipState.syncFromLocalStorage();

console.log('[State] Initialized. Authenticated:', BattleshipState.isAuthenticated());
