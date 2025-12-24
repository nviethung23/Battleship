// Character Selection Screen Logic

let selectionTimer = null;
let selectionTimeLeft = 36;
let selectionStartTime = null; // Thời gian bắt đầu từ server để đồng bộ
let myCharacterId = 'character1'; // Mặc định character1
let myCharacterLocked = false;
let opponentCharacterId = null;
let opponentCharacterLocked = false;

// Get socket and currentRoomId from global scope
function getSocket() {
    return typeof socket !== 'undefined' ? socket : null;
}

function getCurrentRoomId() {
    return typeof currentRoomId !== 'undefined' ? currentRoomId : null;
}

// Initialize character selection screen
function initCharacterSelection(roomData, startTime) {
    console.log('=== Initializing character selection ===');
    console.log('Room data:', roomData);
    console.log('Start time from server:', startTime);
    
    // Lưu thời gian bắt đầu từ server
    selectionStartTime = startTime || Date.now();
    
    // Set default character
    myCharacterId = 'character1';
    myCharacterLocked = false;
    opponentCharacterId = null;
    opponentCharacterLocked = false;
    
    // Update player names
    const player1 = roomData.player1;
    const player2 = roomData.player2;
    const currentUserId = localStorage.getItem('userId');
    
    if (player1.userId === currentUserId) {
        // I'm player 1
        document.getElementById('player1BannerName').textContent = player1.username;
        document.getElementById('player2BannerName').textContent = player2 ? player2.username : 'Đang chờ...';
    } else {
        // I'm player 2
        document.getElementById('player1BannerName').textContent = player1.username;
        document.getElementById('player2BannerName').textContent = player2.username;
    }
    
    // Render character selection
    renderCharacterSelection();
    renderMyCharacter();
    renderOpponentCharacter();
    
    // Start timer
    startSelectionTimer();
}

// Render character selection bar
function renderCharacterSelection() {
    const bar = document.getElementById('characterSelectionBar');
    if (!bar) return;
    
    // Use CHARACTERS from charactersData.js if available, otherwise fallback
    const characters = typeof CHARACTERS !== 'undefined' ? CHARACTERS : getAllCharacters();
    
    bar.innerHTML = '';
    
    characters.forEach((char, index) => {
        const charItem = document.createElement('div');
        const isSelected = (char.id === myCharacterId) || (index === selectedCharacterIndex);
        charItem.className = `char-thumb ${isSelected ? 'active' : ''}`;
        charItem.dataset.characterId = char.id;
        charItem.innerHTML = `
            <img src="${char.thumb || char.avatar?.thumb}" alt="${char.displayName || char.name}">
            <span class="char-thumb-name">${char.displayName || char.name}</span>
        `;
        charItem.addEventListener('click', () => {
            if (!myCharacterLocked) {
                // Update UI-only index
                if (typeof switchCharacter === 'function') {
                    switchCharacter(index);
                }
                // Select character for game logic
                selectCharacter(char.id);
            }
        });
        bar.appendChild(charItem);
    });
}

// Select character
function selectCharacter(characterId) {
    if (myCharacterLocked) return;
    
    myCharacterId = characterId;
    renderMyCharacter();
    renderCharacterSelection();
    
    // Emit to server
    const socket = getSocket();
    const roomId = getCurrentRoomId();
    const userId = localStorage.getItem('userId');
    if (socket && roomId && userId) {
        socket.emit('character_selected', {
            roomId: roomId,
            userId: userId,
            characterId: characterId
        });
    }
}

// Render my character
function renderMyCharacter() {
    const char = getCharacterById(myCharacterId);
    if (!char) return;
    
    // Avatar
    const avatarImg = document.getElementById('myCharacterAvatar');
    if (avatarImg) {
        avatarImg.src = char.avatar.large;
        avatarImg.alt = char.displayName;
    }
    
    // Action type
    const actionType = document.getElementById('myActionType');
    if (actionType) {
        actionType.textContent = char.actionType || '';
    }
    
    // Ships preview
    const shipsPreview = document.getElementById('myShipsPreview');
    if (shipsPreview) {
        shipsPreview.innerHTML = '';
        const ships = getCharacterShips(myCharacterId);
        const shipOrder = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
        
        shipOrder.forEach(shipType => {
            if (ships[shipType]) {
                const shipDiv = document.createElement('div');
                shipDiv.className = 'ship-preview-item';
                shipDiv.innerHTML = `<img src="${ships[shipType]}" alt="${shipType}">`;
                shipsPreview.appendChild(shipDiv);
            }
        });
    }
    
    // Lock status
    const lockStatus = document.getElementById('myLockStatus');
    if (lockStatus) {
        lockStatus.style.display = myCharacterLocked ? 'block' : 'none';
    }
}

// Render opponent character
function renderOpponentCharacter() {
    const avatarImg = document.getElementById('opponentCharacterAvatar');
    const actionType = document.getElementById('opponentActionType');
    const charName = document.getElementById('opponentCharacterName');
    
    if (!opponentCharacterId) {
        // Show placeholder with nice UI
        if (avatarImg) {
            avatarImg.src = 'images/logo.png';
            avatarImg.alt = 'Waiting for opponent';
            avatarImg.style.opacity = '0.3';
        }
        if (actionType) {
            actionType.textContent = '---';
            actionType.style.opacity = '0.5';
        }
        if (charName) {
            charName.textContent = 'Đang chờ đối thủ...';
            charName.style.fontStyle = 'italic';
            charName.style.opacity = '0.7';
        }
        
        const shipsPreview = document.getElementById('opponentShipsPreview');
        if (shipsPreview) {
            shipsPreview.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 12px;">⏳ Chờ chọn...</div>';
        }
        return;
    }
    
    const char = getCharacterById(opponentCharacterId);
    if (!char) return;
    
    // Avatar
    if (avatarImg) {
        avatarImg.src = char.avatar.large;
        avatarImg.alt = char.displayName;
        avatarImg.style.opacity = '1';
        avatarImg.style.display = 'block';
    }
    
    // Character name
    if (charName) {
        charName.textContent = char.displayName;
        charName.style.fontStyle = 'normal';
        charName.style.opacity = '1';
    }
    
    // Action type
    if (actionType) {
        actionType.textContent = char.actionType || '';
        actionType.style.opacity = '1';
    }
    
    // Ships preview
    const shipsPreview = document.getElementById('opponentShipsPreview');
    if (shipsPreview) {
        shipsPreview.innerHTML = '';
        const ships = getCharacterShips(opponentCharacterId);
        const shipOrder = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
        
        shipOrder.forEach(shipType => {
            if (ships[shipType]) {
                const shipDiv = document.createElement('div');
                shipDiv.className = 'ship-preview-item';
                shipDiv.innerHTML = `<img src="${ships[shipType]}" alt="${shipType}">`;
                shipsPreview.appendChild(shipDiv);
            }
        });
    }
    
    // Lock status
    const lockStatus = document.getElementById('opponentLockStatus');
    if (lockStatus) {
        lockStatus.style.display = opponentCharacterLocked ? 'block' : 'none';
    }
}

// Lock character
function lockCharacter() {
    if (myCharacterLocked) return;
    
    myCharacterLocked = true;
    renderMyCharacter();
    
    // Disable lock button
    const lockBtn = document.getElementById('lockCharacterBtn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.textContent = 'Đã khóa';
    }
    
    // Emit to server
    const socket = getSocket();
    const roomId = getCurrentRoomId();
    const userId = localStorage.getItem('userId');
    if (socket && roomId && userId) {
        socket.emit('character_locked', {
            roomId: roomId,
            userId: userId,
            characterId: myCharacterId
        });
    }
}

// Start selection timer
function startSelectionTimer() {
    const timerElement = document.getElementById('selectionTimer');
    const TOTAL_TIME = 36; // 36 giây
    
    if (selectionTimer) {
        clearInterval(selectionTimer);
    }
    
    // Tính thời gian đã trôi qua từ khi bắt đầu (dựa trên server time)
    const updateTimer = () => {
        const elapsedTime = Math.floor((Date.now() - selectionStartTime) / 1000);
        selectionTimeLeft = Math.max(0, TOTAL_TIME - elapsedTime);
        
        if (timerElement) {
            timerElement.textContent = selectionTimeLeft;
        }
        
        if (selectionTimeLeft <= 0) {
            clearInterval(selectionTimer);
            // Auto lock if not locked yet
            if (!myCharacterLocked) {
                console.log('Timer expired, auto-locking character...');
                lockCharacter();
            }
        }
    };
    
    // Update ngay lập tức
    updateTimer();
    
    // Sau đó update mỗi giây
    selectionTimer = setInterval(updateTimer, 1000);
    
    console.log('Timer started. Selection start time:', new Date(selectionStartTime).toISOString());
}

// Stop selection timer
function stopSelectionTimer() {
    if (selectionTimer) {
        clearInterval(selectionTimer);
        selectionTimer = null;
    }
}

// Show character selection screen
function showCharacterSelectionScreen(roomData) {
    console.log('=== showCharacterSelectionScreen called ===');
    console.log('Room data:', roomData);
    
    // QUAN TRỌNG: Đóng tất cả screens trước
    console.log('Hiding all screens...');
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    } else {
        // Fallback: Hide manually
        const lobbyScreen = document.getElementById('lobbyScreen');
        const placementScreen = document.getElementById('placementScreen');
        const gameScreen = document.getElementById('gameScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        
        if (lobbyScreen) {
            console.log('Hiding lobbyScreen...');
            lobbyScreen.style.display = 'none';
        }
        if (placementScreen) placementScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'none';
        if (gameOverScreen) gameOverScreen.style.display = 'none';
    }
    
    // Đóng room list panel nếu còn mở
    if (typeof hideRoomList === 'function') {
        console.log('Calling hideRoomList from showCharacterSelectionScreen...');
        hideRoomList();
    }
    
    // Show character selection
    const screen = document.getElementById('characterSelectionScreen');
    if (screen) {
        console.log('Setting characterSelectionScreen display to block...');
        screen.style.display = 'block';
        console.log('Screen display after setting:', screen.style.display);
        console.log('Calling initCharacterSelection...');
        
        // Truyền startTime từ roomData nếu có
        const startTime = roomData.characterSelectionStartTime || Date.now();
        initCharacterSelection(roomData, startTime);
        
        // Initialize character carousel UI (UI-only cosmetic)
        setTimeout(() => {
            if (typeof initCharacterSelectionUI === 'function') {
                console.log('Initializing character carousel UI...');
                initCharacterSelectionUI();
            }
        }, 150);
    } else {
        console.error('❌ characterSelectionScreen element not found!');
    }
    
    console.log('=== showCharacterSelectionScreen completed ===');
}

// Handle opponent character selected
function handleOpponentCharacterSelected(data) {
    console.log('=== Opponent character selected ===');
    console.log('Data:', data);
    console.log('My userId:', localStorage.getItem('userId'));
    console.log('Opponent userId:', data.userId);
    
    // Kiểm tra xem có phải là đối thủ không (không phải chính mình)
    if (data.userId && data.userId !== localStorage.getItem('userId')) {
        console.log('Updating opponent character to:', data.characterId);
        opponentCharacterId = data.characterId;
        renderOpponentCharacter();
    } else {
        console.log('Ignoring own character selection');
    }
}

// Handle opponent character locked
function handleOpponentCharacterLocked(data) {
    if (data.userId !== localStorage.getItem('userId')) {
        opponentCharacterLocked = true;
        renderOpponentCharacter();
        
        // Check if both locked
        if (myCharacterLocked && opponentCharacterLocked) {
            // Both locked → wait for server to emit character_selection_complete
        }
    }
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    const lockBtn = document.getElementById('lockCharacterBtn');
    if (lockBtn) {
        lockBtn.addEventListener('click', lockCharacter);
    }
    
    const leaveBtn = document.getElementById('leaveRoomBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            const socket = getSocket();
            const roomId = getCurrentRoomId();
            if (socket && roomId) {
                socket.emit('leave_room', { roomId: roomId });
            }
            stopSelectionTimer();
            if (typeof showLobby === 'function') {
                showLobby();
            } else if (typeof backToLobby === 'function') {
                backToLobby();
            }
        });
    }
});

