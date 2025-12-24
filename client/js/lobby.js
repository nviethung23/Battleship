/**
 * Lobby Page Logic
 * Handles waiting room: show players, ready button, leave button, timer
 * CRITICAL: Must preserve ready button logic that triggers deployment phase
 */

// Character data for UI preview (cosmetic only)
const LOBBY_CHARACTERS = [
    { 
        id: 0, 
        name: 'Captain Morgan', 
        image: 'images/characters/character1/avatar-large.png',
        shipsFolder: 'images/characters/character1/ships'
    },
    { 
        id: 1, 
        name: 'Admiral Blake', 
        image: 'images/characters/character2/avatar-large.png',
        shipsFolder: 'images/characters/character2/ships'
    },
    { 
        id: 2, 
        name: 'Commander Storm', 
        image: 'images/characters/character3/avatar-large.png',
        shipsFolder: 'images/characters/character3/ships'
    }
];

let selectedCharacterIndex = 0;
let currentRoom = null;
let lobbyTimerInterval = null;
let isReady = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Lobby] Page loaded');

    // Check authentication
    if (!BattleshipState.isAuthenticated()) {
        console.error('[Lobby] Not authenticated, redirecting to login');
        window.location.href = '/';
        return;
    }

    // Check room code
    const roomCode = BattleshipState.getRoomCode();
    if (!roomCode) {
        console.error('[Lobby] No room code, redirecting to hub');
        window.location.href = '/hub';
        return;
    }

    console.log('[Lobby] Room code:', roomCode);

    // Initialize socket
    const socket = SocketShared.init((data) => {
        console.log('[Lobby] Socket connected:', data);
        // Join or rejoin room
        joinRoom(socket, roomCode);
    });

    if (!socket) return;

    // Setup event listeners
    setupEventListeners(socket);

    // Setup socket event handlers
    setupSocketHandlers(socket);

    // Initialize character selector (UI-only cosmetic)
    initCharacterSelector();

    // Display room code
    displayRoomCode(roomCode);

    console.log('[Lobby] Initialized successfully');
});

function joinRoom(socket, roomCode) {
    console.log('[Lobby] Requesting room info:', roomCode);
    
    // Request room info from server
    // Server will check if we're already in the room or need to join
    socket.emit('room:requestInfo', { roomCode });
}

function displayRoomCode(roomCode) {
    const roomCodeEl = document.getElementById('lobbyRoomCode');
    if (roomCodeEl) {
        roomCodeEl.textContent = roomCode;
    }
}

function setupEventListeners(socket) {
    // Leave button - CRITICAL: must emit leave event
    const leaveBtn = document.getElementById('btnLeaveRoom');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            console.log('[Lobby] Leave button clicked');
            handleLeave(socket);
        });
    }

    // Ready button - CRITICAL: must emit ready event to trigger deployment
    const readyBtn = document.getElementById('btnReady');
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            console.log('[Lobby] Ready button clicked');
            handleReady(socket, readyBtn);
        });
    }

    // Character selector thumbnails (UI-only preview)
    const selectorThumbs = document.querySelectorAll('.selector-thumb');
    selectorThumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            selectedCharacterIndex = index;
            updateCharacterPreview();
            
            // Emit to server for realtime update
            socket.emit('lobby:characterChanged', {
                roomCode: BattleshipState.getRoomCode(),
                characterIndex: index
            });
        });
    });
}

function setupSocketHandlers(socket) {
    // Room joined successfully
    socket.on('room:joined', (data) => {
        console.log('[Lobby] Room joined:', data);
        currentRoom = data.room;
        updateLobbyUI(data.room);
    });

    // Room state updated
    socket.on('room:updated', (data) => {
        console.log('[Lobby] Room updated:', data);
        currentRoom = data.room;
        updateLobbyUI(data.room);
    });

    // Player joined
    socket.on('room:playerJoined', (data) => {
        console.log('[Lobby] Player joined:', data);
        currentRoom = data.room;
        updateLobbyUI(data.room);
        SocketShared.showNotification('Đối thủ đã tham gia!', 'success');
    });

    // Player ready
    socket.on('lobby:playerReady', (data) => {
        console.log('[Lobby] Player ready:', data);
        updatePlayerReadyStatus(data);
    });

    // Both players ready - game starts
    socket.on('lobby:bothReady', (data) => {
        console.log('[Lobby] Both players ready, starting game:', data);
        SocketShared.showNotification('Cả 2 người chơi đã sẵn sàng! Bắt đầu...', 'success');
        
        // Stop timer
        stopLobbyTimer();
        
        // Store room data for game page (character info, players)
        if (currentRoom) {
            localStorage.setItem('gameRoomData', JSON.stringify({
                player1: currentRoom.player1,
                player2: currentRoom.player2,
                roomId: currentRoom.id,
                roomCode: currentRoom.code || currentRoom.id, // For private rooms, use code
                isPrivate: currentRoom.isPrivate
            }));
            console.log('[Lobby] Saved gameRoomData with roomCode:', currentRoom.code || currentRoom.id);
        }
        
        // Redirect to game page
        setTimeout(() => {
            window.location.href = '/game';
        }, 1500);
    });
    
    // Character changed (opponent changed character)
    socket.on('lobby:opponentCharacterChanged', (data) => {
        console.log('[Lobby] Opponent changed character:', data);
        const { characterIndex } = data;
        
        // UI layout: lobbyCharacter1 = YOU (left), lobbyCharacter2 = OPPONENT (right)
        // Always update opponent's image which is on the RIGHT
        const opponentImg = document.getElementById('lobbyCharacter2');
        
        if (opponentImg && LOBBY_CHARACTERS[characterIndex]) {
            opponentImg.src = LOBBY_CHARACTERS[characterIndex].image;
            console.log('[Lobby] Updated opponent character image to:', LOBBY_CHARACTERS[characterIndex].name);
        }
        
        // Update opponent ships (player 2 = RIGHT)
        updatePlayerShips(2, characterIndex);
        
        // Also update in currentRoom for sync
        if (currentRoom) {
            const currentUserId = BattleshipState.getUserId();
            const isPlayer1 = currentRoom.player1?.userId === currentUserId;
            if (isPlayer1) {
                if (currentRoom.player2) currentRoom.player2.characterId = characterIndex;
            } else {
                if (currentRoom.player1) currentRoom.player1.characterId = characterIndex;
            }
        }
    });

    // Player left
    socket.on('room:playerLeft', (data) => {
        console.log('[Lobby] Player left:', data);
        if (data.leftUserId !== BattleshipState.getUserId()) {
            SocketShared.showNotification('Đối thủ đã rời phòng', 'warning');
            currentRoom = data.room;
            updateLobbyUI(data.room);
        }
    });

    // Room disbanded
    socket.on('room:disbanded', (data) => {
        console.log('[Lobby] Room disbanded:', data);
        SocketShared.showNotification('Phòng đã bị đóng', 'warning');
        BattleshipState.clearRoomState();
        setTimeout(() => {
            window.location.href = '/hub';
        }, 1500);
    });

    // Error handling
    socket.on('room:error', (data) => {
        console.error('[Lobby] Room error:', data);
        SocketShared.showNotification(data.message || 'Có lỗi xảy ra', 'error');
        
        // If room not found, redirect to hub
        if (data.code === 'ROOM_NOT_FOUND') {
            BattleshipState.clearRoomState();
            setTimeout(() => {
                window.location.href = '/hub';
            }, 2000);
        }
    });
}

function updateLobbyUI(room) {
    console.log('[Lobby] Updating UI with room:', room);

    if (!room) return;

    const currentUserId = BattleshipState.getUserId();
    
    // Determine which player is me
    const isPlayer1 = room.player1?.userId === currentUserId;
    const myPlayer = isPlayer1 ? room.player1 : room.player2;
    const opponentPlayer = isPlayer1 ? room.player2 : room.player1;

    // UI Layout: LEFT (lobbyCharacter1) = YOU, RIGHT (lobbyCharacter2) = OPPONENT
    
    // Update YOU (always on LEFT)
    const myName = document.getElementById('lobbyPlayer1Name');
    const myStatus = document.getElementById('lobbyPlayer1Status');
    const myImg = document.getElementById('lobbyCharacter1');

    if (myName && myPlayer) {
        const displayName = myPlayer.guestDisplayName || myPlayer.username || myPlayer.userId || 'You';
        myName.textContent = displayName;
    }

    if (myStatus && myPlayer) {
        if (myPlayer.ready || myPlayer.lobbyReady) {
            myStatus.textContent = '✓ Sẵn sàng';
            myStatus.className = 'player-status-text status-ready';
        } else {
            myStatus.textContent = 'Đang chờ...';
            myStatus.className = 'player-status-text status-waiting';
        }
    }
    
    // Update MY character image (LEFT)
    if (myImg && myPlayer) {
        const myCharIndex = myPlayer.characterId !== null && myPlayer.characterId !== undefined 
            ? myPlayer.characterId 
            : 0;
        if (LOBBY_CHARACTERS[myCharIndex]) {
            myImg.src = LOBBY_CHARACTERS[myCharIndex].image;
        }
    }

    // Update OPPONENT (always on RIGHT)
    const oppName = document.getElementById('lobbyPlayer2Name');
    const oppStatus = document.getElementById('lobbyPlayer2Status');
    const oppImg = document.getElementById('lobbyCharacter2');

    if (opponentPlayer) {
        if (oppName) {
            const displayName = opponentPlayer.guestDisplayName || opponentPlayer.username || opponentPlayer.userId || 'Opponent';
            oppName.textContent = displayName;
        }

        if (oppStatus) {
            if (opponentPlayer.ready || opponentPlayer.lobbyReady) {
                oppStatus.textContent = '✓ Sẵn sàng';
                oppStatus.className = 'player-status-text status-ready';
            } else {
                oppStatus.textContent = 'Đang chờ...';
                oppStatus.className = 'player-status-text status-waiting';
            }
        }

        // Update OPPONENT character image (RIGHT)
        if (oppImg) {
            const oppCharIndex = opponentPlayer.characterId !== null && opponentPlayer.characterId !== undefined 
                ? opponentPlayer.characterId 
                : 0;
            if (LOBBY_CHARACTERS[oppCharIndex]) {
                oppImg.src = LOBBY_CHARACTERS[oppCharIndex].image;
            }
            oppImg.classList.remove('portrait-waiting');
            
            // Update opponent ships
            updatePlayerShips(2, oppCharIndex);
        }
    } else {
        // No opponent yet
        if (oppName) {
            oppName.textContent = 'Đang chờ đối thủ...';
        }

        if (oppStatus) {
            oppStatus.textContent = '-';
            oppStatus.className = 'player-status-text status-empty';
        }

        if (oppImg) {
            oppImg.src = 'images/logo.png';
            oppImg.classList.add('portrait-waiting');
        }
    }
    
    // Update MY ships (LEFT) based on my character
    if (myPlayer) {
        const myCharIndex = myPlayer.characterId !== null && myPlayer.characterId !== undefined 
            ? myPlayer.characterId 
            : 0;
        updatePlayerShips(1, myCharIndex);
    }

    // Start timer if both players present
    if (room.player1 && room.player2 && !lobbyTimerInterval) {
        // Calculate remaining time from server deadline
        let remainingSeconds = 60; // Default
        
        if (room.lobbyDeadlineAt) {
            const now = Date.now();
            const deadline = room.lobbyDeadlineAt;
            remainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000));
            console.log(`[Lobby] Syncing timer: ${remainingSeconds}s remaining (deadline: ${new Date(deadline).toISOString()})`);
        } else {
            console.log('[Lobby] No deadline from server, using default 60s');
        }
        
        startLobbyTimer(remainingSeconds);
    }
}

function updatePlayerReadyStatus(data) {
    const currentUserId = BattleshipState.getUserId();
    
    // Update status based on who sent ready
    if (data.userId === currentUserId) {
        // I'm ready
        const player1Status = document.getElementById('lobbyPlayer1Status');
        if (player1Status) {
            player1Status.textContent = '✓ Sẵn sàng';
            player1Status.className = 'player-status-text status-ready';
        }
    } else {
        // Opponent is ready
        const player2Status = document.getElementById('lobbyPlayer2Status');
        if (player2Status) {
            player2Status.textContent = '✓ Sẵn sàng';
            player2Status.className = 'player-status-text status-ready';
        }
        SocketShared.showNotification('Đối thủ đã sẵn sàng!', 'info');
    }
}

// CRITICAL: Ready button handler - triggers transition to game
function handleReady(socket, btn) {
    if (isReady) {
        SocketShared.showNotification('Bạn đã sẵn sàng rồi!', 'warning');
        return;
    }

    // Check if opponent present
    if (!currentRoom || !currentRoom.player2) {
        SocketShared.showNotification('Đang chờ đối thủ tham gia...', 'warning');
        return;
    }

    console.log('[Lobby] Ready button clicked - transitioning to game');
    
    // Mark as ready
    isReady = true;

    // Update button
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
    const btnText = btn.querySelector('.ready-text');
    if (btnText) btnText.textContent = 'ĐÃ SẴN SÀNG';

    // Update my status to ready
    const player1Status = document.getElementById('lobbyPlayer1Status');
    if (player1Status) {
        player1Status.textContent = '✓ Sẵn sàng';
        player1Status.className = 'player-status-text status-ready';
    }

    SocketShared.showNotification('Đang chờ đối thủ sẵn sàng...', 'info');
    
    // Emit a custom event to server to mark player as ready in lobby
    socket.emit('lobby:playerReady', {
        roomCode: BattleshipState.getRoomCode()
    });
}

function handleLeave(socket) {
    console.log('[Lobby] Emitting leave event');
    
    // Stop timer
    stopLobbyTimer();

    // Emit leave event
    socket.emit('room:leave', {
        roomCode: BattleshipState.getRoomCode()
    });

    // Clear room state
    BattleshipState.clearRoomState();

    // Redirect to hub
    SocketShared.showNotification('Đã rời phòng', 'info');
    setTimeout(() => {
        window.location.href = '/hub';
    }, 500);
}

function startLobbyTimer(seconds) {
    let timeLeft = seconds;
    const timerEl = document.getElementById('lobbyTimer');

    if (timerEl) {
        timerEl.textContent = timeLeft;
    }

    lobbyTimerInterval = setInterval(() => {
        timeLeft--;
        
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            stopLobbyTimer();
            SocketShared.showNotification('Hết thời gian chờ!', 'warning');
        }
    }, 1000);
}

function stopLobbyTimer() {
    if (lobbyTimerInterval) {
        clearInterval(lobbyTimerInterval);
        lobbyTimerInterval = null;
    }
}

// Character selector (UI-only cosmetic, no backend persistence)
function initCharacterSelector() {
    // Random character on load
    selectedCharacterIndex = Math.floor(Math.random() * LOBBY_CHARACTERS.length);
    updateCharacterPreview();
}

function updateCharacterPreview() {
    const character = LOBBY_CHARACTERS[selectedCharacterIndex];
    
    // UI layout: lobbyCharacter1 = YOU (left), lobbyCharacter2 = OPPONENT (right)
    // Always update MY image which is on the LEFT
    const characterImg = document.getElementById('lobbyCharacter1');
    
    const thumbs = document.querySelectorAll('.selector-thumb');

    if (characterImg) {
        characterImg.src = character.image;
        characterImg.style.opacity = '0';
        setTimeout(() => {
            characterImg.style.opacity = '1';
        }, 100);
    }

    thumbs.forEach((thumb, index) => {
        if (index === selectedCharacterIndex) {
            thumb.classList.add('selector-thumb-active');
        } else {
            thumb.classList.remove('selector-thumb-active');
        }
    });
    
    // Update ships for player 1 (YOU)
    updatePlayerShips(1, selectedCharacterIndex);
}

// Update ships display for a player
function updatePlayerShips(playerNum, characterIndex) {
    const character = LOBBY_CHARACTERS[characterIndex];
    if (!character || !character.shipsFolder) return;
    
    const shipNames = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
    
    shipNames.forEach(shipName => {
        const shipImg = document.getElementById(`lobbyShip${playerNum}_${shipName}`);
        if (shipImg) {
            shipImg.src = `${character.shipsFolder}/${shipName}.png`;
        }
    });
}

console.log('[Lobby] Script loaded');
