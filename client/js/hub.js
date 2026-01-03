/**
 * Hub Page Logic
 * Handles main menu: quick play, create private room, join private room
 */

// Character data for UI preview (cosmetic only)
const HUB_CHARACTERS = [
    { id: 0, name: 'Captain Morgan', image: 'images/characters/character1/avatar-large.png' },
    { id: 1, name: 'Admiral Blake', image: 'images/characters/character2/avatar-large.png' },
    { id: 2, name: 'Commander Storm', image: 'images/characters/character3/avatar-large.png' }
];

let selectedCharacterIndex = 0;
const HUB_GUIDE_STORAGE_KEY = 'hubGuideHide';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Hub] Page loaded');

    // Check authentication
    if (!BattleshipState.isAuthenticated()) {
        console.error('[Hub] Not authenticated, redirecting to login');
        BattleshipState.redirectToLogin('Vui lòng đăng nhập lại');
        return;
    }

    // Clear any old room state
    BattleshipState.clearRoomState();

    // Initialize socket
    const socket = SocketShared.init((data) => {
        // Update UI with user info
        updateUserInfo(data);
    });

    if (!socket) return;

    // Setup event listeners
    setupEventListeners(socket);

    // Setup socket event handlers
    setupSocketHandlers(socket);

    // Initialize character switcher (UI-only cosmetic)
    initCharacterSwitcher();
    initHubGuide();

    console.log('[Hub] Initialized successfully');
});

function updateUserInfo(data) {
    const username = BattleshipState.isGuest() 
        ? BattleshipState.getGuestDisplayName() || data.username
        : data.username;

    const usernameEl = document.getElementById('hubUsername');
    if (usernameEl) {
        usernameEl.textContent = username;
    }

    const userIdEl = document.getElementById('hubUserId');
    if (userIdEl) {
        const userId = data.userId || BattleshipState.getUserId();
        const shortId = userId ? userId.substring(0, 8) : '----';
        userIdEl.textContent = `ID: ${shortId}`;
    }
}

function setupEventListeners(socket) {
    // Logout button
    const logoutBtn = document.getElementById('hubLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('[Hub] Logging out...');
            BattleshipState.clearAll();
            socket.disconnect();
            window.location.href = '/';
        });
    }

    // Quick Play button
    const quickPlayBtn = document.getElementById('btnQuickPlay');
    if (quickPlayBtn) {
        quickPlayBtn.addEventListener('click', () => {
            console.log('[Hub] Quick Play clicked');
            handleQuickPlay(socket, quickPlayBtn);
        });
    }

    // Create Private Room button
    const createPrivateBtn = document.getElementById('btnCreatePrivateRoom');
    if (createPrivateBtn) {
        createPrivateBtn.addEventListener('click', () => {
            console.log('[Hub] Create Private Room clicked');
            handleCreatePrivateRoom(socket, createPrivateBtn);
        });
    }

    // Join Private Room button
    const joinPrivateBtn = document.getElementById('btnJoinPrivateRoom');
    const roomCodeInput = document.getElementById('inputRoomCode');
    
    if (joinPrivateBtn && roomCodeInput) {
        joinPrivateBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            if (code.length !== 6) {
                SocketShared.showNotification('Mã phòng phải có 6 ký tự', 'warning');
                return;
            }
            console.log('[Hub] Join Private Room clicked with code:', code);
            handleJoinPrivateRoom(socket, code);
        });

        // Enter key on input
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinPrivateBtn.click();
            }
        });

        // Auto uppercase
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    // Cancel queue button
    const cancelQueueBtn = document.getElementById('btnCancelQueue');
    if (cancelQueueBtn) {
        cancelQueueBtn.addEventListener('click', () => {
            console.log('[Hub] Cancel queue clicked');
            socket.emit('queue:leave');
            hideSearchingOverlay();
        });
    }
}

function setupSocketHandlers(socket) {
    // Online count
    socket.on('online_count', (data) => {
        const el = document.getElementById('hubOnlineCount');
        if (el && data?.count !== undefined) {
            el.textContent = `${data.count} online`;
        }
        console.log('[Hub] online_count', data);
    });

    // Queue events
    socket.on('queue:waiting', (data) => {
        console.log('[Hub] Joined queue:', data);
        showSearchingOverlay();
    });

    socket.on('match:found', (data) => {
        console.log('[Hub] Match found:', data);
        hideSearchingOverlay();
        
        // Save room info and mode, then redirect to lobby
        BattleshipState.setRoomCode(data.room.code || data.room.id);
        BattleshipState.setMode('queue');
        
        SocketShared.showNotification('Đã tìm thấy đối thủ!', 'success');
        
        // Redirect to lobby
        setTimeout(() => {
            window.location.href = '/lobby';
        }, 500);
    });

    socket.on('queue:left', () => {
        console.log('[Hub] Left queue');
        hideSearchingOverlay();
    });

    // Private room created
    socket.on('room:created', (data) => {
        console.log('[Hub] Private room created:', data);
        
        // Save room code and mode, then redirect to lobby
        BattleshipState.setRoomCode(data.roomCode);
        BattleshipState.setMode('private');
        
        SocketShared.showNotification(`Đã tạo phòng: ${data.roomCode}`, 'success');
        
        // Redirect to lobby
        setTimeout(() => {
            window.location.href = '/lobby';
        }, 500);
    });

    // Private room joined (player_joined event means we successfully joined)
    socket.on('player_joined', (data) => {
        console.log('[Hub] Private room joined:', data);
        
        // Save room info and mode, then redirect to lobby
        BattleshipState.setRoomCode(data.room.code);
        BattleshipState.setMode('private');
        
        SocketShared.showNotification(`Đã tham gia phòng: ${data.room.code}`, 'success');
        
        // Redirect to lobby
        setTimeout(() => {
            window.location.href = '/lobby';
        }, 500);
    });

    // Error handling
    socket.on('room:error', (data) => {
        console.error('[Hub] Room error:', data);
        SocketShared.showNotification(data.message || 'Có lỗi xảy ra', 'error');
        hideSearchingOverlay();
    });
}

function handleQuickPlay(socket, btn) {
    // Add loading state
    btn.classList.add('is-loading');
    btn.disabled = true;
    const btnText = btn.querySelector('.hub-btn-text');
    const originalText = btnText ? btnText.textContent : '';
    if (btnText) btnText.textContent = 'Đang tìm...';

    // Emit queue join
    socket.emit('queue:join');

    // Reset button after 500ms (overlay will show)
    setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        if (btnText) btnText.textContent = originalText;
    }, 500);
}

function handleCreatePrivateRoom(socket, btn) {
    // Add loading state
    btn.classList.add('is-loading');
    btn.disabled = true;

    // Emit create private room
    socket.emit('room:createPrivate');

    // Reset button after 1s
    setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
    }, 1000);
}

function handleJoinPrivateRoom(socket, code) {
    // Emit join private room
    socket.emit('room:joinPrivate', { code });
}

function showSearchingOverlay() {
    const overlay = document.getElementById('searchingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideSearchingOverlay() {
    const overlay = document.getElementById('searchingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Character switcher (UI-only cosmetic, no backend persistence)
function initCharacterSwitcher() {
    const thumbs = document.querySelectorAll('.hub__thumb');
    const characterImg = document.getElementById('heroCharacterImg');
    const characterName = document.getElementById('heroCharacterName');

    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            selectedCharacterIndex = index;
            updateCharacterDisplay();
        });
    });

    // Random character on load
    selectedCharacterIndex = Math.floor(Math.random() * HUB_CHARACTERS.length);
    updateCharacterDisplay();
}

function updateCharacterDisplay() {
    const character = HUB_CHARACTERS[selectedCharacterIndex];
    const characterImg = document.getElementById('heroCharacterImg');
    const characterName = document.getElementById('heroCharacterName');
    const thumbs = document.querySelectorAll('.hub__thumb');

    if (characterImg) {
        characterImg.src = character.image;
        characterImg.style.opacity = '0';
        setTimeout(() => {
            characterImg.style.opacity = '1';
        }, 100);
    }

    if (characterName) {
        characterName.textContent = character.name;
    }

    thumbs.forEach((thumb, index) => {
        if (index === selectedCharacterIndex) {
            thumb.classList.add('hub__thumb--active');
        } else {
            thumb.classList.remove('hub__thumb--active');
        }
    });
}

function initHubGuide() {
    const overlay = document.getElementById('hubGuideOverlay');
    if (!overlay) return;

    const openBtn = document.getElementById('hubGuideOpenBtn');
    const closeBtn = document.getElementById('hubGuideCloseBtn');
    const startBtn = document.getElementById('hubGuideStartBtn');
    const neverAgain = document.getElementById('hubGuideNeverAgain');

    const showGuide = () => {
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
    };

    const hideGuide = () => {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
    };

    const applyPreference = () => {
        if (!neverAgain) return;
        if (neverAgain.checked) {
            localStorage.setItem(HUB_GUIDE_STORAGE_KEY, '1');
        } else {
            localStorage.removeItem(HUB_GUIDE_STORAGE_KEY);
        }
    };

    const handleClose = () => {
        applyPreference();
        hideGuide();
    };

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (neverAgain) {
                neverAgain.checked = localStorage.getItem(HUB_GUIDE_STORAGE_KEY) === '1';
            }
            showGuide();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', handleClose);
    }

    if (startBtn) {
        startBtn.addEventListener('click', handleClose);
    }

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            handleClose();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('is-visible')) {
            handleClose();
        }
    });

    if (localStorage.getItem(HUB_GUIDE_STORAGE_KEY) !== '1') {
        if (neverAgain) neverAgain.checked = false;
        showGuide();
    }
}

console.log('[Hub] Script loaded');
