/**
 * Game Logic - CLEAN VERSION
 * ONLY contains: Ship Placement, Gameplay, Game Over
 * NO Hub/Lobby logic (moved to hub.js and lobby.js)
 */

// Game constants
const GRID_SIZE = 10;
const SHIPS = [
    { name: 'Carrier', size: 5, label: 'Tàu sân bay (5 ô)' },
    { name: 'Battleship', size: 4, label: 'Tàu chiến (4 ô)' },
    { name: 'Cruiser', size: 3, label: 'Tàu tuần dương (3 ô)' },
    { name: 'Submarine', size: 3, label: 'Tàu ngầm (3 ô)' },
    { name: 'Destroyer', size: 2, label: 'Tàu khu trục (2 ô)' }
];

// Game state
let gameState = {
    roomId: null, // Room ID/code for communication with server
    myShips: [],
    myBoard: createEmptyBoard(),
    enemyBoard: createEmptyBoard(),
    myAttacks: [],
    enemyAttacks: [],
    currentTurn: null,
    isMyTurn: false,
    placementMode: {
        currentShip: null,
        isHorizontal: true,
        placedShips: [],
        draggedShip: null,
        selectedCharacter: 0 // From lobby
    },
    gameStarted: false,
    timerInterval: null,
    socket: null, // Store socket instance
    opponentShipAssets: null
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Game.js] DOMContentLoaded - Checking authentication...');
    
    // Check authentication
    if (!BattleshipState.isAuthenticated()) {
        console.error('[Game.js] No token found, redirecting to login');
        window.location.href = '/';
        return;
    }

    console.log('[Game.js] Authentication OK, initializing socket...');

    // Initialize socket
    const socket = SocketShared.init((data) => {
        console.log('[Game] Socket connected:', data);
    });

    if (!socket) {
        console.error('[Game] Failed to initialize socket');
        return;
    }
    
    // Store socket in game state AND export to window for other modules
    gameState.socket = socket;
    window.socket = socket; // Export for battle.js and other modules
    console.log('[Game.js] ✅ Socket exported to window.socket');

    // Join game room (important for receiving events!)
    // Try to get roomCode from multiple sources
    let roomCode = BattleshipState.getRoomCode(); // From sessionStorage
    console.log('[Game] 🔍 Looking for roomCode...');
    console.log('[Game] From sessionStorage:', roomCode);
    
    if (!roomCode) {
        // Try from localStorage (gameRoomData set by lobby)
        const gameRoomData = localStorage.getItem('gameRoomData');
        console.log('[Game] Raw gameRoomData:', gameRoomData);
        if (gameRoomData) {
            try {
                const roomData = JSON.parse(gameRoomData);
                console.log('[Game] Parsed gameRoomData:', roomData);
                // For private rooms, prefer roomCode (6-char code) over roomId
                // For quick match, roomId and roomCode should be the same
                roomCode = roomData.roomCode || roomData.roomId || roomData.id;
                console.log('[Game] Got roomCode from gameRoomData:', roomCode, '(isPrivate:', roomData.isPrivate, ')');
            } catch (e) {
                console.error('[Game] Error parsing gameRoomData:', e);
            }
        }
    }
    
    // Also try from URL params
    if (!roomCode) {
        const urlParams = new URLSearchParams(window.location.search);
        roomCode = urlParams.get('room') || urlParams.get('roomId');
        if (roomCode) {
            console.log('[Game] Got roomCode from URL:', roomCode);
        }
    }

    if (!roomCode) {
        console.warn('[Game] No room code found, returning to hub');
        backToHub();
        return;
    }
    
    // Setup event listeners FIRST
    setupEventListeners(socket);
    
    // Setup socket handlers BEFORE joining room (to receive room:actualRoomId)
    setupSocketHandlers(socket);

    // NOW join room after handlers are ready
    if (roomCode) {
        console.log('[Game] 🎮 Joining game room:', roomCode);
        
        // Save roomCode to gameState for later use (attacks, etc.)
        gameState.roomId = roomCode;
        
        // Function to emit join
        const emitJoinRoom = () => {
            console.log('[Game] 📡 Emitting join_game_room for:', roomCode);
            socket.emit('join_game_room', { roomCode });
        };
        
        // If socket is already connected, join immediately
        if (socket.connected) {
            emitJoinRoom();
        } else {
            // Wait for socket to connect
            socket.once('connect', () => {
                console.log('[Game] Socket connected, now joining room');
                emitJoinRoom();
            });
        }
    } else {
        console.error('[Game] ❌ No room code found! Cannot join room.');
        console.error('[Game] SessionStorage:', BattleshipState.getRoomCode());
        console.error('[Game] LocalStorage gameRoomData:', localStorage.getItem('gameRoomData'));
    }

    // **CHECK IF GAME WAS IN PROGRESS (RECONNECT LOGIC)**
    const savedBattleState = sessionStorage.getItem('battleState');
    if (savedBattleState) {
        console.log('[Game] 🔄 Found saved battle state, checking if rejoin needed...');
        try {
            const battleData = JSON.parse(savedBattleState);
            console.log('[Game] Saved battle data:', battleData);
            
            // Check if state is recent (within 5 minutes) and game was started
            const isRecent = (Date.now() - battleData.timestamp) < 5 * 60 * 1000; // 5 minutes
            const wasInBattle = battleData.gameStarted === true && isRecent;
            
            if (wasInBattle) {
                console.log('[Game] ✅ Game was in battle (recent), attempting rejoin...');
                
                // Restore game state
                if (battleData.myBoard) gameState.myBoard = battleData.myBoard;
                if (battleData.myShips) gameState.myShips = battleData.myShips;
                if (battleData.isMyTurn !== undefined) gameState.isMyTurn = battleData.isMyTurn;
                gameState.gameStarted = true;
                
                // Request rejoin from server
                setTimeout(() => {
                    console.log('[Game] 📡 Requesting rejoin_game from server...');
                    socket.emit('rejoin_game', { 
                        roomId: roomCode,
                        userId: BattleshipState.getUserId()
                    });
                }, 500); // Reduced delay for faster reconnect
            } else {
                // State too old or not in battle - clear and start fresh
                console.log('[Game] ℹ️ Battle state expired or not started, starting fresh...');
                sessionStorage.removeItem('battleState');
                showPlacementScreen();
            }
            
        } catch (e) {
            console.error('[Game] Error parsing saved battle state:', e);
            sessionStorage.removeItem('battleState');
            showPlacementScreen();
        }
    } else {
        // No saved state - show placement screen normally
        showPlacementScreen();
    }
});

// SETTINGS MENU HANDLER
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('btnSettings');
    const settingsMenu = document.getElementById('settingsMenu');
    const exitBtn = document.getElementById('exitToHubBtn');

    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('open');
        });

        document.addEventListener('click', () => settingsMenu.classList.remove('open'));
        settingsMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            backToHub();
        });
    }
});

// ============ EVENT LISTENERS ============
function setupEventListeners(socket) {
    // Placement - Random button - now fills remaining ships from dock
    const randomPlaceBtn = document.getElementById('randomPlaceBtn');
    if (randomPlaceBtn) {
        randomPlaceBtn.addEventListener('click', () => {
            placeRemainingShipsRandomly();
        });
    }

    // Placement - Ready button
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            if (gameState.placementMode.placedShips.length === SHIPS.length) {
                console.log('[Game] 🎯 ========== READY BUTTON CLICKED ==========');
                
                // Check socket
                console.log('[Game] Socket status:', {
                    socketDefined: !!socket,
                    socketConnected: socket?.connected,
                    socketId: socket?.id
                });
                
                // === SEND PLAYER READY DIRECTLY ===
                // Try to get roomCode from multiple sources
                let roomCode = BattleshipState.getRoomCode(); // From sessionStorage
                
                if (!roomCode) {
                    // Try from localStorage (gameRoomData set by lobby)
                    const gameRoomData = localStorage.getItem('gameRoomData');
                    if (gameRoomData) {
                        try {
                            const roomData = JSON.parse(gameRoomData);
                            roomCode = roomData.roomId || roomData.roomCode;
                            console.log('[Game] Got roomCode from gameRoomData for ready:', roomCode);
                        } catch (e) {
                            console.error('[Game] Error parsing gameRoomData:', e);
                        }
                    }
                }
                
                if (!roomCode) {
                    console.error('[Game] ❌ No room code found!');
                    console.error('[Game] SessionStorage:', BattleshipState.getRoomCode());
                    console.error('[Game] LocalStorage gameRoomData:', localStorage.getItem('gameRoomData'));
                    SocketShared.showNotification('Lỗi: Không tìm thấy phòng!', 'error');
                    return;
                }
                
                const emitData = {
                    roomId: roomCode,
                    ships: gameState.myShips,
                    board: gameState.myBoard
                };
                
                console.log('[Game] 📤 Emitting player_ready:');
                console.log('[Game] 📤 roomId:', roomCode);
                console.log('[Game] 📤 ships count:', gameState.myShips.length);
                console.log('[Game] 📤 board:', gameState.myBoard ? 'present' : 'missing');
                
                socket.emit('player_ready', emitData);
                console.log('[Game] ✅ player_ready emitted successfully');
                
                // Update YOUR status to Ready
                const yourStatus = document.getElementById('deployYourStatus');
                if (yourStatus) {
                    yourStatus.innerHTML = '<span class="status-icon">✓</span><span>Ready!</span>';
                    yourStatus.className = 'character-status status-active';
                }
                
                // Update button to "WAITING..."
                readyBtn.disabled = true;
                readyBtn.innerHTML = '<span>⏳</span><span>WAITING...</span>';
                
                // Disable further ship placement
                const randomBtn = document.getElementById('randomPlaceBtn');
                const resetBtn = document.getElementById('resetShipsBtn');
                if (randomBtn) randomBtn.disabled = true;
                if (resetBtn) resetBtn.disabled = true;
                
                // Lock board from drag/drop
                const board = document.getElementById('placementBoard');
                if (board) {
                    board.style.pointerEvents = 'none';
                    board.style.opacity = '0.8';
                }
                
                // Lock ship dock
                if (window.ShipDock && window.ShipDock.lockDock) {
                    window.ShipDock.lockDock();
                }
                
                // Ready state already visible in UI; skip toast

         
            } else {
                SocketShared.showNotification('⚠️ Vui lòng đặt tất cả 5 tàu trước khi sẵn sàng!', 'warning');
            }
        });
    }

    // Game over - Back to lobby button
    const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    if (backToLobbyBtn) {
        backToLobbyBtn.addEventListener('click', () => {
            backToHub();
        });
    }
}

// ============ SOCKET HANDLERS ============
function setupSocketHandlers(socket) {
    socket.on('room:error', (data) => {
        console.warn('[Game] room:error:', data);
        backToHub();
    });

    // Receive actual roomId for chat/webrtc
    socket.on('room:actualRoomId', (data) => {
        console.log('[Game] 📍 Received actual roomId:', data);
        gameState.actualRoomId = data.actualRoomId;
        // Also save to window for chat.js and webrtc.js
        window.actualRoomId = data.actualRoomId;
    });
    
    // Deployment timer update from server (SHARED TIMER)
    socket.on('deployment_timer_update', (data) => {
        console.log('[Game] 🕐 Deployment timer update from server:', data.timeRemaining);
        updateDeploymentTimerFromServer(data.timeRemaining);
    });
    
    // Deployment timer warning
    socket.on('deployment_timer_warning', (data) => {
        console.log('[Game] ⚠️ Deployment timer warning:', data.message);
        SocketShared.showNotification(data.message, 'warning');
    });
    
    // Auto-ready notification from server
    socket.on('deployment_auto_ready', (data) => {
        console.log('[Game] 🤖 Server auto-readied me:', data);
        handleServerAutoReady(data);
    });
    
    // Player ready update (during deployment)
    socket.on('player_ready_update', (data) => {
        console.log('[Game] 📨 ============ RECEIVED player_ready_update ============');
        console.log('[Game] 📨 Raw data:', JSON.stringify(data, null, 2));
        console.log('[Game] 📨 player1Ready:', data.player1Ready);
        console.log('[Game] 📨 player2Ready:', data.player2Ready);
        console.log('[Game] 📨 Current gameState:', {
            roomId: gameState.roomId,
            userId: gameState.userId,
            isPlayer1: gameState.isPlayer1
        });
        updatePlayerReadyStatus(data);
        console.log('[Game] 📨 ============ END player_ready_update ============');
    });

    // Game started
    socket.on('game_started', (data) => {
        console.log('[Game] Game started:', data);
        stopDeploymentTimer();
        startGame(data);
    });

    // Attack result
    socket.on('attack_result', (data) => {
        console.log('[Game] Attack result:', data);
        handleBattleAttackResult(data);
    });

    // Under attack (opponent attacked you)
    socket.on('under_attack', (data) => {
        console.log('[Game] Under attack:', data);
        handleBattleUnderAttack(data);
    });

    // Turn changed
    socket.on('turn_changed', (data) => {
        console.log('[Game] Turn changed:', data);
        handleBattleTurnChanged(data);
    });

    // Turn continue (hit = another turn)
    socket.on('turn_continue', (data) => {
        console.log('[Game] Turn continue:', data);
        handleTurnContinue(data);
    });

    // Game over
    socket.on('game_over', (data) => {
        console.log('[Game] Game over:', data);
        handleGameOver(data);
    });

    // Player disconnected
    socket.on('player_disconnected', (data) => {
        console.log('[Game] Player disconnected:', data);
        handlePlayerDisconnected(data);
    });

    // Player reconnecting (grace period started)
    socket.on('player_reconnecting', (data) => {
        console.log('[Game] Player reconnecting:', data);
        showReconnectingOverlay(data.username, data.gracePeriod);
    });

    // Player reconnected (clear reconnecting state)
    socket.on('player_reconnected', (data) => {
        console.log('[Game] Player reconnected:', data);
        hideReconnectingOverlay();
        SocketShared.showNotification(`${data.username} đã kết nối lại!`, 'success');
    });

    // Player disconnect timeout (opponent wins)
    socket.on('player_disconnect_timeout', (data) => {
        console.log('[Game] Player disconnect timeout:', data);
        hideReconnectingOverlay();
        SocketShared.showNotification(data.message, 'warning');
    });

    // Turn timeout
    socket.on('turn_timeout', (data) => {
        console.log('[Game] Turn timeout:', data);
        SocketShared.showNotification(`${data.timeoutPlayer} đã hết thời gian!`, 'warning');
    });

    // Timer update from server (every second)
    socket.on('battle_timer_update', (data) => {
        handleBattleTimerUpdate(data);
    });

    // Timer warning (10 seconds left)
    socket.on('battle_timer_warning', (data) => {
        console.log('[Game] Timer warning:', data.message);
        // Show visual warning
        const timerElement = document.getElementById('battleTimer');
        if (timerElement) {
            timerElement.classList.add('warning');
        }
    });

    // Chat events are handled by chat.js - no need to listen here
    // This prevents duplicate message handling

    // WebRTC events (for battle screen video call)
    socket.on('webrtc_offer', (data) => {
        console.log('[Game] WebRTC offer received');
        if (window.handleWebRTCOffer) {
            window.handleWebRTCOffer(data);
        }
    });

    socket.on('webrtc_answer', (data) => {
        console.log('[Game] WebRTC answer received');
        if (window.handleWebRTCAnswer) {
            window.handleWebRTCAnswer(data);
        }
    });

    socket.on('webrtc_ice_candidate', (data) => {
        console.log('[Game] WebRTC ICE candidate received');
        if (window.handleWebRTCIceCandidate) {
            window.handleWebRTCIceCandidate(data);
        }
    });

    socket.on('call_request', (data) => {
        console.log('[Game] Call request received');
        if (window.handleCallRequest) {
            window.handleCallRequest(data);
        }
    });

    socket.on('call_accepted', (data) => {
        console.log('[Game] Call accepted');
        if (window.handleCallAccepted) {
            window.handleCallAccepted(data);
        }
    });

    socket.on('call_rejected', (data) => {
        console.log('[Game] Call rejected');
        if (window.handleCallRejected) {
            window.handleCallRejected(data);
        }
    });

    socket.on('call_ended', (data) => {
        console.log('[Game] Call ended');
        if (window.handleCallEnded) {
            window.handleCallEnded(data);
        }
    });

    // ============ REJOIN GAME HANDLERS ============
    socket.on('rejoin_game_success', (data) => {
        console.log('[Game] ✅ Rejoin game success:', data);
        handleRejoinGame(data);
    });

    socket.on('rejoin_game_failed', (data) => {
        console.log('[Game] ❌ Rejoin game failed:', data);
        // Don't show error notification for normal "game ended" case - just silently recover
        // Only show notification for unexpected errors
        if (data.message && !data.message.includes('không tồn tại') && !data.message.includes('kết thúc')) {
            SocketShared.showNotification(data.message || 'Không thể kết nối lại game!', 'error');
        }
        // Clear saved state and show placement
        sessionStorage.removeItem('battleState');
        showPlacementScreen();
    });
}

// Handle successful rejoin
function handleRejoinGame(data) {
    console.log('[Game] 🔄 Handling rejoin game...');
    
    // Set actualRoomId for chat/webrtc
    if (data.roomId) {
        window.actualRoomId = data.roomId;
        gameState.actualRoomId = data.roomId;
        console.log('[Game] 📍 Set actualRoomId from rejoin:', data.roomId);
    }
    
    // Restore full game state from server
    if (data.myBoard) gameState.myBoard = data.myBoard;
    if (data.myShips) gameState.myShips = data.myShips;
    if (data.enemyAttacks) gameState.enemyAttacks = data.enemyAttacks;
    if (data.myAttacks) gameState.myAttacks = data.myAttacks;
    
    const myUserId = BattleshipState.getUserId();
    gameState.isMyTurn = data.currentTurn === myUserId;
    gameState.gameStarted = true;
    resetShipTracker();
    nextTurnNotificationDelay = 0;
    
    // Hide all screens
    hideAllScreens();
    
    // Show battle screen
    const battleScreen = document.getElementById('battleScreen');
    if (battleScreen) {
        battleScreen.style.display = 'block';
        
        // Get character data from localStorage
        const myCharData = JSON.parse(localStorage.getItem('myCharacterData') || '{}');
        const oppCharData = JSON.parse(localStorage.getItem('opponentCharacterData') || '{}');
        
        // Render battle UI
        renderBattleUI(myCharData, oppCharData, data);
        
        // Apply previous attacks to grids
        applyPreviousAttacks(data);
        
        // Show turn notification
        showTurnNotification(gameState.isMyTurn);
        
        SocketShared.showNotification('Đã kết nối lại game!', 'success');
        console.log('[Game] ✅ Rejoined battle screen successfully');
    }
}

// Apply previous attacks to restore grid state
function applyPreviousAttacks(data) {
    console.log('[Game] 🎨 Applying previous attacks...');
    
    // Apply my attacks to enemy board
    if (data.myAttacks && Array.isArray(data.myAttacks)) {
        data.myAttacks.forEach(attack => {
            const cell = document.querySelector(`#battleEnemyBoard .cell[data-row="${attack.row}"][data-col="${attack.col}"]`);
            if (cell) {
                cell.classList.add(attack.hit ? 'hit' : 'miss');
                cell.style.pointerEvents = 'none';
            }
        });
        console.log('[Game] Applied', data.myAttacks.length, 'attacks to enemy board');
    }
    
    // Apply enemy attacks to my board
    if (data.enemyAttacks && Array.isArray(data.enemyAttacks)) {
        data.enemyAttacks.forEach(attack => {
            const cell = document.querySelector(`#battleMyBoard .cell[data-row="${attack.row}"][data-col="${attack.col}"]`);
            if (cell) {
                cell.classList.add(attack.hit ? 'hit' : 'miss');
            }
        });
        console.log('[Game] Applied', data.enemyAttacks.length, 'attacks to my board');
        
        // Update fleet health
        const totalCells = 17;
        const hits = data.enemyAttacks.filter(a => a.hit).length;
        updateFleetHealth(totalCells - hits, totalCells);
    }
}

// ============ HELPER FUNCTIONS ============
function createEmptyBoard() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function backToHub() {
    // Clear battle state (for reconnection)
    clearBattleState();
    
    // Clear game state
    gameState = {
        myShips: [],
        myBoard: createEmptyBoard(),
        enemyBoard: createEmptyBoard(),
        myAttacks: [],
        enemyAttacks: [],
        currentTurn: null,
        isMyTurn: false,
        placementMode: {
            currentShip: null,
            isHorizontal: true,
            placedShips: [],
            draggedShip: null,
            selectedCharacter: 0
        },
        gameStarted: false,
        timerInterval: null,
        socket: null
    };
    
    // Clear timers
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    if (deploymentTimerInterval) {
        clearInterval(deploymentTimerInterval);
        deploymentTimerInterval = null;
    }
    
    // Clear room state
    BattleshipState.clearRoomState();
    
    // Redirect to hub
    console.log('[Game] 🏠 Returning to Hub...');
    window.location.href = '/hub';
}

// ============ SCREEN MANAGEMENT ============
function showPlacementScreen() {
    hideAllScreens();
    document.getElementById('placementScreen').style.display = 'block';
    initPlacementMode();
    
    // Load and display character info from lobby
    loadDeployCharacterInfo();
}

function showGameScreen() {
    hideAllScreens();
    document.getElementById('gameScreen').style.display = 'block';
    
    // Load character info for game screen
    loadGameCharacterInfo();
    
    // Generate your fleet mini board
    generateYourFleetBoard();
    
    // Generate enemy board for attacking
    generateEnemyBoard();
}

function loadGameCharacterInfo() {
    try {
        const gameRoomData = localStorage.getItem('gameRoomData');
        if (!gameRoomData) {
            console.warn('[Game] No room data found for game screen');
            return;
        }
        
        const roomData = JSON.parse(gameRoomData);
        const currentUserId = BattleshipState.getUserId();
        
        // Character images map - characterId is string like 'character1', 'character2', 'character3'
        const CHARACTER_IMAGES = {
            'character1': 'images/characters/character1/avatar-large.png',
            'character2': 'images/characters/character2/avatar-large.png',
            'character3': 'images/characters/character3/avatar-large.png'
        };
        
        // Helper function to get character image by characterId (string)
        function getCharacterImage(characterId) {
            if (typeof characterId === 'string') {
                return CHARACTER_IMAGES[characterId] || CHARACTER_IMAGES['character1'];
            }
            if (typeof characterId === 'number') {
                return CHARACTER_IMAGES[`character${characterId + 1}`] || CHARACTER_IMAGES['character1'];
            }
            return CHARACTER_IMAGES['character1'];
        }
        
        // Determine who is YOU and who is OPPONENT
        let yourData, opponentData;
        if (roomData.player1?.userId === currentUserId) {
            yourData = roomData.player1;
            opponentData = roomData.player2;
        } else {
            yourData = roomData.player2;
            opponentData = roomData.player1;
        }
        
        // Update YOUR character (game screen)
        if (yourData) {
            const yourCharImg = document.getElementById('gameYourCharacter');
            const yourName = document.getElementById('gameYourName');
            
            if (yourCharImg && yourData.characterId !== undefined) {
                yourCharImg.src = getCharacterImage(yourData.characterId);
                console.log('[Game] Battle Your character:', yourData.characterId, '->', yourCharImg.src);
            }
            if (yourName) {
                yourName.textContent = yourData.guestDisplayName || yourData.username || 'You';
            }
        }
        
        // Update OPPONENT character (game screen)
        if (opponentData) {
            const oppCharImg = document.getElementById('gameOpponentCharacter');
            const oppName = document.getElementById('gameOpponentName');
            
            if (oppCharImg && opponentData.characterId !== undefined) {
                oppCharImg.src = getCharacterImage(opponentData.characterId);
                console.log('[Game] Battle Opponent character:', opponentData.characterId, '->', oppCharImg.src);
            }
            if (oppName) {
                oppName.textContent = opponentData.guestDisplayName || opponentData.username || 'Opponent';
            }
        }
        
        console.log('[Game] Loaded game screen character info');
    } catch (error) {
        console.error('[Game] Error loading game character info:', error);
    }
}

function generateYourFleetBoard() {
    const boardEl = document.getElementById('yourFleetBoard');
    if (!boardEl) return;
    
    boardEl.innerHTML = '';
    
    // Generate 10x10 mini grid with your ships
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Check if there's a ship at this position
            const shipName = gameState.myBoard[row][col];
            if (shipName) {
                cell.classList.add('ship', 'deployed');
            }
            
            boardEl.appendChild(cell);
        }
    }

    renderShipSegments(boardEl, gameState.myShips);
    
    console.log('[Game] Generated your fleet mini board');
}

function generateEnemyBoard() {
    const boardEl = document.getElementById('enemyBoard');
    if (!boardEl) return;
    
    boardEl.innerHTML = '';
    
    // Generate 10x10 grid for attacking enemy
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Add click handler for attacking
            cell.addEventListener('click', () => handleAttack(row, col));
            
            boardEl.appendChild(cell);
        }
    }
    
    console.log('[Game] Generated enemy attack board');
}

function handleAttack(row, col) {
    // TODO: Implement attack logic
    console.log(`[Game] Attack at ${row}, ${col}`);
    
    // Check if it's your turn
    if (!gameState.isMyTurn) {
        SocketShared.showNotification('Chưa đến lượt của bạn!', 'warning');
        return;
    }
    
    // Check if already attacked this cell
    const cell = document.querySelector(`#enemyBoard .cell[data-row="${row}"][data-col="${col}"]`);
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
        SocketShared.showNotification('Ô này đã được bắn rồi!', 'warning');
        return;
    }
    
    // Emit attack to server
    const socket = SocketShared.getSocket();
    if (socket) {
        socket.emit('attack', {
            roomId: gameState.roomId,
            row,
            col
        });
    }
}

function showGameOverScreen() {
    hideAllScreens();
    document.getElementById('gameOverScreen').style.display = 'block';
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
}

// ============ DEPLOYMENT PHASE ============
function loadDeployCharacterInfo() {
    try {
        const gameRoomData = localStorage.getItem('gameRoomData');
        if (!gameRoomData) {
            return;
        }
        
        const roomData = JSON.parse(gameRoomData);
        const currentUserId = BattleshipState.getUserId();
        
        console.log('[Game] Loading character info:', roomData);
        
        // Character images map - characterId is string like 'character1', 'character2', 'character3'
        const CHARACTER_IMAGES = {
            'character1': 'images/characters/character1/avatar-large.png',
            'character2': 'images/characters/character2/avatar-large.png',
            'character3': 'images/characters/character3/avatar-large.png'
        };
        
        // Helper function to get character image by characterId (string)
        function getCharacterImage(characterId) {
            // If characterId is string like 'character1', use map
            if (typeof characterId === 'string') {
                return CHARACTER_IMAGES[characterId] || CHARACTER_IMAGES['character1'];
            }
            // If characterId is number (legacy), convert to string
            if (typeof characterId === 'number') {
                return CHARACTER_IMAGES[`character${characterId + 1}`] || CHARACTER_IMAGES['character1'];
            }
            return CHARACTER_IMAGES['character1'];
        }
        
        // Determine who is YOU and who is OPPONENT
        let yourData, opponentData;
        if (roomData.player1?.userId === currentUserId) {
            yourData = roomData.player1;
            opponentData = roomData.player2;
        } else {
            yourData = roomData.player2;
            opponentData = roomData.player1;
        }
        
        // Update YOUR character
        if (yourData) {
            const yourCharImg = document.getElementById('deployYourCharacter');
            const yourName = document.getElementById('deployYourName');
            
            if (yourCharImg && yourData.characterId !== undefined) {
                yourCharImg.src = getCharacterImage(yourData.characterId);
                console.log('[Game] Your character:', yourData.characterId, '->', yourCharImg.src);
            }
            
            if (yourName) {
                yourName.textContent = yourData.guestDisplayName || yourData.username || 'You';
            }
        }
        
        // Update OPPONENT character
        if (opponentData) {
            const oppCharImg = document.getElementById('deployOpponentCharacter');
            const oppName = document.getElementById('deployOpponentName');
            const oppStatus = document.getElementById('deployOpponentStatus');
            const oppCircle = document.getElementById('deployOpponentCircle');
            const oppCard = oppCircle?.closest('.deploy-opponent');
            
            if (oppCharImg && opponentData.characterId !== undefined) {
                oppCharImg.src = getCharacterImage(opponentData.characterId);
                console.log('[Game] Opponent character:', opponentData.characterId, '->', oppCharImg.src);
            }
            
            if (oppName) {
                oppName.textContent = opponentData.guestDisplayName || opponentData.username || 'Opponent';
            }
            
            // Initially set opponent as waiting (they haven't deployed yet)
            if (oppCard) {
                oppCard.classList.add('waiting');
            }
        }
        
    } catch (error) {
        console.error('[Game] Error loading character info:', error);
    }
}

function updatePlayerReadyStatus(data) {
    console.log('[Game] 📢 updatePlayerReadyStatus called with data:', data);
    
    // Update deploy screen opponent status
    const currentUserId = BattleshipState.getUserId();
    const gameRoomData = localStorage.getItem('gameRoomData');
    
    console.log('[Game] Current userId:', currentUserId);
    console.log('[Game] gameRoomData:', gameRoomData);
    
    if (gameRoomData) {
        try {
            const roomData = JSON.parse(gameRoomData);
            const isPlayer1 = roomData.player1?.userId === currentUserId;
            const opponentReady = isPlayer1 ? data.player2Ready : data.player1Ready;
            const myReady = isPlayer1 ? data.player1Ready : data.player2Ready;
            
            console.log('[Game] isPlayer1:', isPlayer1);
            console.log('[Game] myReady:', myReady);
            console.log('[Game] opponentReady:', opponentReady);
            
            const oppStatus = document.getElementById('deployOpponentStatus');
            const oppCircle = document.getElementById('deployOpponentCircle');
            const oppCard = oppCircle?.closest('.deploy-opponent');
            
            console.log('[Game] DOM elements found:', {
                oppStatus: !!oppStatus,
                oppCircle: !!oppCircle,
                oppCard: !!oppCard
            });
            
            if (oppStatus && oppCard) {
                if (opponentReady) {
                    // Opponent is ready
                    oppCard.classList.remove('waiting');
                    oppCard.classList.add('ready');
                    oppStatus.innerHTML = '<span class="status-icon">✓</span><span>Ready!</span>';
                    oppStatus.className = 'character-status status-active';
                    
                    console.log('[Game] dY` Opponent is READY!');
                    
                    // Check if both players are ready
                    if (myReady && opponentReady) {
                        console.log('[Game] �s"�,? BOTH PLAYERS READY! Waiting for server to start game...');
                        // Both ready - already visible in UI
                    }
                } else {
                    // Opponent is still deploying
                    oppCard.classList.add('waiting');
                    oppCard.classList.remove('ready');
                    oppStatus.innerHTML = '<span class="status-icon">⏳</span><span>Deploying...</span>';
                    oppStatus.className = 'character-status status-waiting';
                    
                    console.log('[Game] 👤 Opponent is still deploying...');
                }
            } else {
                console.error('[Game] ❌ Missing DOM elements for opponent status update');
            }
        } catch (error) {
            console.error('[Game] Error updating opponent status:', error);
        }
    } else {
        console.error('[Game] ❌ No gameRoomData in localStorage!');
    }
}

function initPlacementMode() {
    // console.log('[Placement] 🎯 Initializing placement mode...');
    
    gameState.myBoard = createEmptyBoard();
    gameState.myShips = [];

    // Derive selected character from lobby room data so sprites match the chosen character
    let selectedCharacterIndex = 0;
    try {
        const gameRoomData = localStorage.getItem('gameRoomData');
        if (gameRoomData) {
            const roomData = JSON.parse(gameRoomData);
            const currentUserId = BattleshipState.getUserId();
            const myData = roomData?.player1?.userId === currentUserId ? roomData.player1 : roomData.player2;
            const charId = myData?.characterId;
            if (charId !== undefined && charId !== null) {
                if (typeof charId === 'number') {
                    selectedCharacterIndex = charId;
                } else if (typeof charId === 'string') {
                    const parsed = parseInt(charId.replace('character', ''), 10);
                    if (!Number.isNaN(parsed)) {
                        selectedCharacterIndex = Math.max(0, parsed - 1);
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[Placement] Could not read characterId from room data:', err);
    }

    gameState.placementMode = {
        currentShip: null,
        isHorizontal: true,
        placedShips: [],
        draggedShip: null,
        selectedCharacter: selectedCharacterIndex
    };

    // Initialize Ship Dock with character selection
    const characterIndex = gameState.placementMode.selectedCharacter || 0;
    if (window.ShipDock) {
        window.ShipDock.init(characterIndex);
    }
    
    // Don't auto place ships - user must drag from dock or click Random
    
    renderPlacementBoard();
    
    // Ready button disabled until all ships are placed (handled by ship dock)
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = true;
    }
    
    // Start deployment timer
    startDeploymentTimer();
    
    // console.log('[Placement] ✅ Placement mode initialized with Ship Dock');
}

// ============ DEPLOYMENT TIMER (SYNCHRONIZED FROM SERVER) ============
let deploymentTimerInterval = null;
let deploymentTimeRemaining = 120;
const DEPLOYMENT_DURATION = 120; // 2 minutes

// Nhận timer update từ server (SHARED timer cho cả 2 players)
function updateDeploymentTimerFromServer(timeRemaining) {
    deploymentTimeRemaining = timeRemaining;
    updateDeploymentTimerDisplay();
    
    // Warning state at 10s
    const timerEl = document.getElementById('deploymentTimer');
    const timerContainer = document.querySelector('.hud-timer-center');
    
    if (timeRemaining <= 10 && timeRemaining > 0) {
        if (timerEl) timerEl.classList.add('warning');
        if (timerContainer) timerContainer.classList.add('warning');
    }
}

function startDeploymentTimer() {
    // Client NO LONGER runs its own timer
    // Timer is managed by SERVER and synced via socket events
    console.log('[Timer] ⏰ Waiting for server timer sync...');
    
    const timerEl = document.getElementById('deploymentTimer');
    if (timerEl) {
        timerEl.textContent = '02:00';
    }
    
    // NOTE: Server will emit 'deployment_timer_update' every second
}

function updateDeploymentTimerDisplay() {
    const timerEl = document.getElementById('deploymentTimer');
    if (!timerEl) return;
    
    const minutes = Math.floor(deploymentTimeRemaining / 60);
    const seconds = deploymentTimeRemaining % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handleDeploymentTimeout() {
    // Server đã xử lý auto-ready, client chỉ cần disable controls
    console.log('[Placement] ⏰ Deployment time expired! Server will handle auto-ready.');
    
    const readyBtn = document.getElementById('readyBtn');
    const randomBtn = document.getElementById('randomPlaceBtn');
    
    // Disable controls
    if (randomBtn) randomBtn.disabled = true;
    if (readyBtn) readyBtn.disabled = true;
    
    // Note: Server will auto-place ships and emit 'deployment_auto_ready'
}

// Handle server auto-ready notification
function handleServerAutoReady(data) {
    console.log('[Placement] 🤖 Server auto-readied me:', data);
    
    const readyBtn = document.getElementById('readyBtn');
    const yourStatus = document.getElementById('deployYourStatus');
    
    // Update UI to show Ready state
    if (yourStatus) {
        yourStatus.innerHTML = '<span class="status-icon">✓</span><span>Ready!</span>';
        yourStatus.className = 'character-status status-active';
    }
    
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.innerHTML = '<span>⏳</span><span>WAITING...</span>';
    }
    
    // Lock board and controls
    const board = document.getElementById('placementBoard');
    if (board) {
        board.style.pointerEvents = 'none';
        board.style.opacity = '0.8';
    }
    
    if (window.ShipDock && window.ShipDock.lockDock) {
        window.ShipDock.lockDock();
    }
    
    // Update ships on board if provided
    if (Array.isArray(data.ships)) {
        const board = createEmptyBoard();
        const placedNames = [];

        data.ships.forEach((ship) => {
            if (!ship || !Array.isArray(ship.cells)) return;
            placedNames.push(ship.name);

            const rows = ship.cells.map(c => c.row);
            const cols = ship.cells.map(c => c.col);
            ship.startRow = ship.startRow ?? Math.min(...rows);
            ship.startCol = ship.startCol ?? Math.min(...cols);
            ship.isHorizontal = typeof ship.isHorizontal === 'boolean'
                ? ship.isHorizontal
                : (ship.cells.length > 1 ? ship.cells[0].row === ship.cells[1].row : true);

            ship.cells.forEach(({ row, col }) => {
                if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
                    board[row][col] = ship.name;
                }
            });
        });

        gameState.myShips = data.ships;
        gameState.myBoard = board;
        gameState.placementMode.placedShips = placedNames;

        if (window.ShipDock && typeof window.ShipDock.getShips === 'function') {
            const dockShips = window.ShipDock.getShips();
            dockShips.forEach(dockShip => {
                dockShip.placed = placedNames.includes(dockShip.name);
            });
            if (typeof window.ShipDock.render === 'function') {
                window.ShipDock.render();
            }
        }

        renderPlacementBoard();
        syncBattleMyBoardShips();
    }

    const randomBtn = document.getElementById('randomPlaceBtn');
    const resetBtn = document.getElementById('resetShipsBtn');
    if (randomBtn) randomBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    
    SocketShared.showNotification(data.message || 'Hết giờ! Tàu đã được xếp tự động.', 'info');
}

function stopDeploymentTimer() {
    if (deploymentTimerInterval) {
        clearInterval(deploymentTimerInterval);
        deploymentTimerInterval = null;
    }
    // Clear session storage (no longer used but keep for cleanup)
    sessionStorage.removeItem('deploymentEndTime');
}

// ============ KEYBOARD CONTROLS ============
function setupKeyboardControls() {
    // Remove old listener if exists
    if (window.keyboardRotateHandler) {
        document.removeEventListener('keydown', window.keyboardRotateHandler);
    }
    
    // Create new handler
    window.keyboardRotateHandler = (e) => {
        // Only work in placement screen
        const placementScreen = document.getElementById('placementScreen');
        if (!placementScreen || placementScreen.style.display === 'none') return;
        
        // Press R to rotate last hovered/selected ship
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            
            // Get the currently hovered ship or the first ship
            const hoveredCell = document.querySelector('#placementBoard .cell.ship:hover');
            if (hoveredCell && hoveredCell.dataset.shipName) {
                rotateShipOnBoard(hoveredCell.dataset.shipName);
                SocketShared.showNotification('🔄 Xoay tàu bằng phím R!', 'info');
            } else {
                // Rotate the first ship as fallback
                if (gameState.myShips.length > 0) {
                    rotateShipOnBoard(gameState.myShips[0].name);
                    SocketShared.showNotification('🔄 Xoay tàu bằng phím R! Di chuột lên tàu để chọn tàu cụ thể', 'info');
                }
            }
        }
    };
    
    document.addEventListener('keydown', window.keyboardRotateHandler);
}

// ============ SHIP PLACEMENT FUNCTIONS ============

// Build a lookup for ship placement metadata (start, size, orientation)
function buildShipMetaMap(ships = gameState.myShips) {
    const meta = {};
    (ships || []).forEach((ship) => {
        if (!ship || !Array.isArray(ship.cells)) return;

        const rows = ship.cells.map(c => c.row);
        const cols = ship.cells.map(c => c.col);
        const startRow = ship.startRow ?? Math.min(...rows);
        const startCol = ship.startCol ?? Math.min(...cols);
        const size = ship.size || ship.cells.length || SHIPS.find(s => s.name === ship.name)?.size || 1;
        const isHorizontal = typeof ship.isHorizontal === 'boolean'
            ? ship.isHorizontal
            : (ship.cells.length > 1 ? ship.cells[0].row === ship.cells[1].row : true);

        meta[ship.name] = {
            name: ship.name,
            startRow,
            startCol,
            size,
            isHorizontal,
            image: getPlacementShipImage(ship.name)
        };
    });
    return meta;
}

function normalizeShipKey(shipName) {
    if (!shipName) return '';
    const lower = String(shipName).toLowerCase();
    const match = SHIPS.find(s => s.name.toLowerCase() === lower);
    if (match) return match.name.toLowerCase();
    return lower.replace(/\s+/g, '');
}

function getOpponentShipImage(shipName) {
    const key = normalizeShipKey(shipName);
    if (gameState.opponentShipAssets && gameState.opponentShipAssets[key]) {
        const url = gameState.opponentShipAssets[key];
        return url.startsWith('/') ? url : `/${url}`;
    }

    try {
        const stored = JSON.parse(localStorage.getItem('opponentCharacterData') || '{}');
        const assets = getCharacterShipsAssets(stored.characterId || stored?.characterId);
        if (assets && assets[key]) {
            const url = assets[key];
            gameState.opponentShipAssets = assets;
            return url.startsWith('/') ? url : `/${url}`;
        }

        if (stored.characterId) {
            const charId = normalizeCharacterId(stored.characterId);
            return `/images/characters/${charId}/ships/${key}.png`;
        }
    } catch (err) {
        console.warn('[Game] Could not load opponent ship assets:', err);
    }

    const trackerImg = document.querySelector(`.tracker-ship[data-ship="${key}"] img`);
    if (trackerImg?.src) {
        return trackerImg.src;
    }

    return null;
}

function buildSunkShipMeta(shipCells, shipName) {
    if (!Array.isArray(shipCells) || shipCells.length === 0) return null;
    const rows = shipCells.map(cell => cell.row);
    const cols = shipCells.map(cell => cell.col);
    const isHorizontal = rows.every(r => r === rows[0]);
    return {
        name: shipName,
        startRow: Math.min(...rows),
        startCol: Math.min(...cols),
        size: shipCells.length,
        isHorizontal
    };
}

function getBoardCellVar(boardEl) {
    if (!boardEl) return '';
    let value = getComputedStyle(boardEl).getPropertyValue('--cell').trim();
    if (!value) {
        const cell = boardEl.querySelector('.cell');
        if (cell) {
            const rect = cell.getBoundingClientRect();
            if (rect.width) {
                value = `${rect.width}px`;
            }
        }
    }
    return value;
}

function getBoardMetrics(boardEl) {
    if (!boardEl) return { cell: null, gap: 0 };

    const firstCell = boardEl.querySelector('.cell[data-row="0"][data-col="0"]') || boardEl.querySelector('.cell');
    if (!firstCell) return { cell: null, gap: 0 };

    const firstRect = firstCell.getBoundingClientRect();
    const cellSize = firstRect.width || firstRect.height || 0;
    let gap = 0;

    const nextCell = boardEl.querySelector('.cell[data-row="0"][data-col="1"]');
    if (nextCell) {
        const nextRect = nextCell.getBoundingClientRect();
        gap = nextRect.left - firstRect.left - firstRect.width;
    } else {
        const downCell = boardEl.querySelector('.cell[data-row="1"][data-col="0"]');
        if (downCell) {
            const downRect = downCell.getBoundingClientRect();
            gap = downRect.top - firstRect.top - firstRect.height;
        }
    }

    if (!Number.isFinite(gap) || gap < 0) {
        gap = 0;
    }

    return {
        cell: Number.isFinite(cellSize) && cellSize > 0 ? cellSize : null,
        gap
    };
}

// Create wrapper with N ship segments (cell-by-cell)
function createShipSegments(imgUrl, meta, boardEl) {
    if (!imgUrl || !meta || !boardEl) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'ship-img-wrapper';
    if (meta.isHorizontal) {
        wrapper.classList.add('horizontal');
    }
    wrapper.style.setProperty('--ship-size', meta.size);
    wrapper.style.setProperty('--ship-gap-count', Math.max(0, meta.size - 1));
    wrapper.style.setProperty('--ship-image', `url("${imgUrl}")`);
    wrapper.dataset.shipSize = String(meta.size);
    const metrics = getBoardMetrics(boardEl);
    const cellVar = getBoardCellVar(boardEl);
    if (cellVar) {
        wrapper.style.setProperty('--cell', cellVar);
    }
    const gapVar = getComputedStyle(boardEl).getPropertyValue('--grid-gap').trim();
    if (gapVar) {
        wrapper.style.setProperty('--grid-gap', gapVar);
    } else if (Number.isFinite(metrics.gap)) {
        wrapper.style.setProperty('--grid-gap', `${metrics.gap}px`);
    }

    for (let i = 0; i < meta.size; i++) {
        const seg = document.createElement('div');
        seg.className = 'ship-seg';
        seg.style.setProperty('--seg-index', i);
        if (Number.isFinite(metrics.cell)) {
            const totalHeight = metrics.cell * meta.size;
            seg.style.backgroundSize = `${metrics.cell}px ${totalHeight}px`;
            seg.style.backgroundPosition = `50% ${-metrics.cell * i}px`;
        }
        wrapper.appendChild(seg);
    }

    return wrapper;
}

// Position wrapper using actual cell DOM rect
function placeWrapperOnCell(boardEl, wrapper, row, col) {
  if (!boardEl || !wrapper) return false;

  const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return false;

  const boardRect = boardEl.getBoundingClientRect();
  const cellRect  = cell.getBoundingClientRect();

  // Account for board border (clientLeft/clientTop).
  let left = (cellRect.left - boardRect.left) + boardEl.scrollLeft - boardEl.clientLeft;
  const top  = (cellRect.top  - boardRect.top ) + boardEl.scrollTop  - boardEl.clientTop;

  if (wrapper.classList.contains('horizontal')) {
      const metrics = getBoardMetrics(boardEl);
      const cellPx = metrics.cell || parseFloat(getBoardCellVar(boardEl)) || 0;
      const gapPx = Number.isFinite(metrics.gap) ? metrics.gap : 0;
      const shipSize = parseInt(wrapper.dataset.shipSize || '0', 10) || 0;
      if (cellPx && shipSize) {
          left += (cellPx * shipSize) + (gapPx * Math.max(0, shipSize - 1));
      }
  }

  wrapper.style.left = `${left}px`;
  wrapper.style.top  = `${top}px`;
  return true;
}
// Render ship segments on a board (placement or battle-my)
function renderShipSegments(boardEl, ships = gameState.myShips) {
    if (!boardEl || !boardEl.querySelector('.cell')) return;

    const existingLayer = boardEl.querySelector('.ship-segment-layer');
    if (existingLayer) {
        existingLayer.remove();
    }

    const metaMap = buildShipMetaMap(ships);
    const layer = document.createElement('div');
    layer.className = 'ship-segment-layer';

    Object.values(metaMap).forEach((meta) => {
        const wrapper = createShipSegments(meta.image, meta, boardEl);
        if (!wrapper) return;
        if (placeWrapperOnCell(boardEl, wrapper, meta.startRow, meta.startCol)) {
            layer.appendChild(wrapper);
        }
    });

    boardEl.appendChild(layer);
}

function renderSunkShipOnBoard(boardEl, shipName, shipCells, imageUrl) {
    if (!boardEl || !Array.isArray(shipCells) || shipCells.length === 0 || !imageUrl) return;

    let layer = boardEl.querySelector('.ship-sunk-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'ship-sunk-layer';
        boardEl.appendChild(layer);
    }

    const key = normalizeShipKey(shipName);
    if (layer.querySelector(`.ship-img-wrapper[data-ship-key="${key}"]`)) {
        return;
    }

    const meta = buildSunkShipMeta(shipCells, shipName);
    if (!meta) return;

    const wrapper = createShipSegments(imageUrl, meta, boardEl);
    if (!wrapper) return;
    wrapper.dataset.shipKey = key;
    wrapper.classList.add('sunk-ship');

    if (placeWrapperOnCell(boardEl, wrapper, meta.startRow, meta.startCol)) {
        layer.appendChild(wrapper);
    }
}

let shipSegmentResizeRaf = null;

function scheduleShipSegmentRefresh() {
    if (shipSegmentResizeRaf) {
        cancelAnimationFrame(shipSegmentResizeRaf);
    }
    shipSegmentResizeRaf = requestAnimationFrame(() => {
        const placementBoard = document.getElementById('placementBoard');
        if (placementBoard && placementBoard.offsetParent) {
            renderShipSegments(placementBoard, gameState.myShips);
        }
        const battleMyBoard = document.getElementById('battleMyBoard');
        if (battleMyBoard && battleMyBoard.offsetParent) {
            renderShipSegments(battleMyBoard, gameState.myShips);
        }
    });
}

window.addEventListener('resize', scheduleShipSegmentRefresh);

function renderPlacementBoard() {
    const board = document.getElementById("placementBoard");
    if (!board) {
        console.error('[Placement] placementBoard element not found!');
        return;
    }
    board.innerHTML = '';

    // Render base cells, then overlay ship segments
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const shipAtCell = gameState.myBoard[row][col];
            if (shipAtCell) {
                cell.classList.add('ship');
                cell.dataset.shipName = shipAtCell;
            }

            cell.draggable = true;
            cell.style.cursor = 'move';
            cell.addEventListener('dragstart', handleShipCellDragStart);
            cell.addEventListener('dragend', handleShipCellDragEnd);

            board.appendChild(cell);
        }
    }

    renderShipSegments(board, gameState.myShips);
    setupBoardRotationListener();
}
   

// Track hovered ship for rotation
let hoveredShipName = null;

// Setup rotation listener for ships on board
function setupBoardRotationListener() {
    const board = document.getElementById('placementBoard');
    if (!board) return;
    
    // Remove old listeners first
    board.removeEventListener('mouseover', handleBoardMouseOver);
    board.removeEventListener('mouseout', handleBoardMouseOut);
    document.removeEventListener('keydown', handleBoardRotation);
    
    // Add new listeners
    board.addEventListener('mouseover', handleBoardMouseOver);
    board.addEventListener('mouseout', handleBoardMouseOut);
    document.addEventListener('keydown', handleBoardRotation);
}

function handleBoardMouseOver(e) {
    const cell = e.target.closest('.cell');
    if (cell && cell.classList.contains('ship')) {
        hoveredShipName = cell.dataset.shipName;
        // Highlight ship
        highlightShip(hoveredShipName, true);
    }
}

function handleBoardMouseOut(e) {
    const cell = e.target.closest('.cell');
    if (cell && cell.classList.contains('ship')) {
        hoveredShipName = null;
        // Remove highlight
        highlightShip(cell.dataset.shipName, false);
    }
}

function handleBoardRotation(e) {
    if ((e.key === 'r' || e.key === 'R') && hoveredShipName) {
        e.preventDefault();
        rotateShipOnBoard(hoveredShipName);
    }
}

function highlightShip(shipName, highlight) {
    if (!shipName) return;
    const cells = document.querySelectorAll(`[data-ship-name="${shipName}"]`);
    cells.forEach(cell => {
        if (highlight) {
            cell.style.boxShadow = '0 0 20px rgba(100, 200, 255, 0.8), inset 0 0 20px rgba(100, 200, 255, 0.4)';
        } else {
            cell.style.boxShadow = '';
        }
    });
}

function rotateShipOnBoard(shipName) {
    if (!shipName) return;
    
    // Find ship in gameState
    const ship = gameState.myShips.find(s => s.name === shipName);
    if (!ship || ship.cells.length === 0) return;
    
    // Determine current orientation
    const isHorizontal = ship.cells.length > 1 ? 
        (ship.cells[0].row === ship.cells[1].row) : true;
    
    // Get anchor position (first cell)
    const anchorRow = ship.cells[0].row;
    const anchorCol = ship.cells[0].col;
    
    // Calculate new orientation
    const newIsHorizontal = !isHorizontal;
    const shipConfig = SHIPS.find(s => s.name === shipName);
    
    // CRITICAL: Remove ship from board FIRST before checking
    ship.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = null;
    });
    
    // Now check if can rotate at current position (board is clear of this ship)
    if (canPlaceShip(shipConfig, anchorRow, anchorCol, newIsHorizontal)) {
        // Place in new orientation
        const newCells = [];
        for (let i = 0; i < shipConfig.size; i++) {
            const r = newIsHorizontal ? anchorRow : anchorRow + i;
            const c = newIsHorizontal ? anchorCol + i : anchorCol;
            gameState.myBoard[r][c] = shipName;
            newCells.push({ row: r, col: c });
        }
        
        // Update ship cells
        ship.cells = newCells;
        
        // Re-render
        renderPlacementBoard();
        
        SocketShared.showNotification(`Đã xoay ${shipName}!`, 'success');
    } else {
        // Cannot rotate - RESTORE old position
        ship.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = shipName;
        });
        
        renderPlacementBoard();
        
        SocketShared.showNotification('Không thể xoay tàu ở vị trí này!', 'warning');
    }
}

function handleShipCellDragStart(e) {
    const shipName = e.target.dataset.shipName;
    if (!shipName) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shipName);
    
    // Store dragged ship
    gameState.placementMode.draggedShip = shipName;
    
    // Highlight all cells of this ship
    highlightShip(shipName, true);
}

function handleShipCellDragEnd(e) {
    const shipName = e.target.dataset.shipName;
    if (shipName) {
        highlightShip(shipName, false);
    }
    gameState.placementMode.draggedShip = null;
}

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const shipName = e.dataTransfer.getData('shipName');
    
    if (shipName && !isNaN(row) && !isNaN(col)) {
        // Save old position before remove
        const oldShipData = saveShipPosition(shipName);
        
        // Remove ship from old position
        removeShipFromBoard(shipName);
        
        // Place ship at new position
        const shipConfig = SHIPS.find(s => s.name === shipName);
        
        // Find old orientation
        let orientation = true;
        if (oldShipData && oldShipData.cells.length > 1) {
            orientation = oldShipData.cells[0].row === oldShipData.cells[1].row;
        }
        
        // Try to place, if fails then restore
        const success = tryPlaceShipAt(shipConfig, row, col, orientation, oldShipData);
        
        if (!success) {
            // Restore old position
            restoreShipPosition(oldShipData);
        }
    }
    
    clearPreview();
    renderPlacementBoard();
}

function saveShipPosition(shipName) {
    const shipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (shipIndex > -1) {
        // Clone deep to save old position
        return JSON.parse(JSON.stringify(gameState.myShips[shipIndex]));
    }
    return null;
}

function restoreShipPosition(oldShipData) {
    if (!oldShipData) return;
    
    // Place ship back on board
    oldShipData.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = oldShipData.name;
    });
    
    // Add back to myShips
    gameState.myShips.push(oldShipData);
    
    // Add back to placedShips
    if (!gameState.placementMode.placedShips.includes(oldShipData.name)) {
        gameState.placementMode.placedShips.push(oldShipData.name);
    }
}

function removeShipFromBoard(shipName) {
    const shipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (shipIndex > -1) {
        const ship = gameState.myShips[shipIndex];
        ship.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = null;
        });
        gameState.myShips.splice(shipIndex, 1);
        
        const placedIndex = gameState.placementMode.placedShips.indexOf(shipName);
        if (placedIndex > -1) {
            gameState.placementMode.placedShips.splice(placedIndex, 1);
        }
    }
}

function tryPlaceShipAt(ship, row, col, isHorizontal, oldShipData = null) {
    if (!canPlaceShipIgnoringSelf(ship, row, col, isHorizontal)) {
        SocketShared.showNotification(`Không thể đặt ${ship.name} ở đây!`, 'warning');
        return false;
    }
    
    const shipCells = [];
    for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        gameState.myBoard[r][c] = ship.name;
        shipCells.push({ row: r, col: c });
    }
    
    gameState.myShips.push({
        name: ship.name,
        size: ship.size,
        cells: shipCells,
        startRow: row,
        startCol: col,
        isHorizontal
    });
    
    gameState.placementMode.placedShips.push(ship.name);
    return true;
}

function canPlaceShipIgnoringSelf(ship, row, col, isHorizontal) {
    for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }
        
        const cellValue = gameState.myBoard[r][c];
        if (cellValue !== null && cellValue !== ship.name) {
            return false;
        }
    }
    return true;
}

function clearPreview() {
    document.querySelectorAll('#placementBoard .cell').forEach(cell => {
        cell.classList.remove('placement-valid', 'placement-invalid');
    });
}

function canPlaceShip(ship, row, col, isHorizontal) {
    for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;

        // Check out of grid
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }

        // Check cell already has ship
        if (gameState.myBoard[r][c] !== null) {
            return false;
        }
    }
    return true;
}

// Place remaining ships randomly (for Random button with ship dock)
function placeRemainingShipsRandomly() {

    
    if (!window.ShipDock) {
        console.error('[Placement] ShipDock not available');
        return;
    }
    
    const dockShips = window.ShipDock.getShips();
    const unplacedShips = dockShips.filter(s => !s.placed);
    
    if (unplacedShips.length === 0) {
        return;
    }
    
    let placedCount = 0;
    
    unplacedShips.forEach(dockShip => {
        const shipConfig = SHIPS.find(s => s.name === dockShip.name);
        if (!shipConfig) return;
        
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const isHorizontal = Math.random() < 0.5;

            if (canPlaceShip(shipConfig, row, col, isHorizontal)) {
                // CRITICAL: Remove old placement if exists (prevent duplicates)
                const existingIndex = gameState.myShips.findIndex(s => s.name === shipConfig.name);
                if (existingIndex !== -1) {
                    const oldShip = gameState.myShips[existingIndex];
                    oldShip.cells.forEach(cell => {
                        gameState.myBoard[cell.row][cell.col] = null;
                    });
                    gameState.myShips.splice(existingIndex, 1);
                    // console.log('[Placement] ⚠️ Removed old placement of', shipConfig.name);
                }
                
                const shipCells = [];
                for (let i = 0; i < shipConfig.size; i++) {
                    const r = isHorizontal ? row : row + i;
                    const c = isHorizontal ? col + i : col;
                    gameState.myBoard[r][c] = shipConfig.name;
                    shipCells.push({ row: r, col: c });
                }
                gameState.myShips.push({
                    name: shipConfig.name,
                    size: shipConfig.size,
                    cells: shipCells
                });
                
                // Update tracking - prevent duplicates in placedShips array
                if (!gameState.placementMode.placedShips.includes(shipConfig.name)) {
                    gameState.placementMode.placedShips.push(shipConfig.name);
                }
                
                // Mark as placed in dock
                dockShip.placed = true;
                
                placed = true;
                placedCount++;
                // console.log('[Placement] ✓ Placed', shipConfig.name, 'at', row, col, isHorizontal ? 'horizontal' : 'vertical');
            }
            attempts++;
        }
        
        if (!placed) {
            console.error('[Placement] ❌ Failed to place', shipConfig.name, 'after 100 attempts');
        }
    });

    // console.log('[Placement] 🚢 Random placed:', placedCount, 'ships');
    
    // Update UI
    window.ShipDock.render();
    renderPlacementBoard();
    
    SocketShared.showNotification(`Đã đặt ${placedCount} tàu ngẫu nhiên!`, 'success');
}

function placeShipsRandomly() {
    // console.log('[Placement] 🎲 Placing all ships randomly...');
    
    // Reset first
    gameState.myBoard = createEmptyBoard();
    gameState.myShips = [];
    gameState.placementMode.placedShips = [];
    
    if (window.ShipDock) {
        window.ShipDock.getShips().forEach(s => s.placed = false);
    }

    SHIPS.forEach(ship => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const isHorizontal = Math.random() < 0.5;

            if (canPlaceShip(ship, row, col, isHorizontal)) {
                const shipCells = [];
                for (let i = 0; i < ship.size; i++) {
                    const r = isHorizontal ? row : row + i;
                    const c = isHorizontal ? col + i : col;
                    gameState.myBoard[r][c] = ship.name;
                    shipCells.push({ row: r, col: c });
                }
                gameState.myShips.push({
                    name: ship.name,
                    size: ship.size,
                    cells: shipCells
                });
                gameState.placementMode.placedShips.push(ship.name);
                
                // Mark as placed in dock
                if (window.ShipDock) {
                    const dockShip = window.ShipDock.getShips().find(s => s.name === ship.name);
                    if (dockShip) dockShip.placed = true;
                }
                
                placed = true;
                console.log('[Placement] ✓ Placed', ship.name, 'at', row, col, isHorizontal ? 'horizontal' : 'vertical');
            }
            attempts++;
        }
        
        if (!placed) {
            console.error('[Placement] ❌ Failed to place', ship.name, 'after 100 attempts');
        }
    });

    console.log('[Placement] 🚢 Total ships placed:', gameState.myShips.length);
    
    if (window.ShipDock) {
        window.ShipDock.render();
    }
    renderPlacementBoard();
    
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn && gameState.myShips.length === SHIPS.length) {
        readyBtn.disabled = false;
    }
}

function sendPlayerReady(socket, ships, board) {
    console.log('[Game] Sending player ready...');
    
    if (!socket) {
        console.error('[Game] Socket not initialized!');
        SocketShared.showNotification('Lỗi kết nối! Vui lòng tải lại trang.', 'error');
        return;
    }
    
    const roomCode = BattleshipState.getRoomCode();
    
    if (!roomCode) {
        console.error('[Game] No room code found!');
        SocketShared.showNotification('Lỗi: Không tìm thấy phòng!', 'error');
        return;
    }
    
    console.log('[Game] Emitting player_ready:', { roomId: roomCode, ships, board });
    
    socket.emit('player_ready', {
        roomId: roomCode,
        ships: ships,
        board: board
    });
}

// ============ GAME PLAY FUNCTIONS ============
function startGame(data) {
    console.log('[Game] 🎮 Game started! Transitioning to battle screen...');
    console.log('[Game] Game data:', data);
    
    // Mark game as started
    gameState.gameStarted = true;
    // Reset per-match state to avoid stale sunk markers
    gameState.myAttacks = [];
    gameState.enemyAttacks = [];
    resetShipTracker();
    nextTurnNotificationDelay = 0;
    
    // **SAVE BATTLE STATE for reconnection**
    saveBattleState(data);
    
    // Hide all other screens
    hideAllScreens();
    
    // Show battle screen
    const battleScreen = document.getElementById('battleScreen');
    if (battleScreen) {
        battleScreen.style.display = 'block';
        console.log('[Game] ✅ Battle screen displayed');
        
        // Initialize battle UI directly
        initBattle(data);
    } else {
        console.error('[Game] ❌ battleScreen element not found!');
    }
}

// Save battle state for reconnection after refresh
function saveBattleState(data) {
    const battleState = {
        roomId: BattleshipState.getRoomCode(),
        myBoard: gameState.myBoard,
        myShips: gameState.myShips,
        currentTurn: data?.currentTurn,
        isMyTurn: gameState.isMyTurn,
        gameStarted: true, // Mark that game has started
        myAttacks: gameState.myAttacks || [],
        enemyAttacks: gameState.enemyAttacks || [],
        timestamp: Date.now()
    };
    
    sessionStorage.setItem('battleState', JSON.stringify(battleState));
    console.log('[Game] 💾 Saved battle state to sessionStorage');
}

// Clear battle state (on game over or back to hub)
function clearBattleState() {
    sessionStorage.removeItem('battleState');
    console.log('[Game] 🗑️ Cleared battle state');
}

// NOTE: Attack/Turn handlers are now in battle.js
// game.js just forwards socket events to window.handleBattle* functions

function handleTurnContinue(data) {
    // Check if it's MY turn to continue (hit = continue same player)
    const myUserId = BattleshipState.getUserId();
    const isMyTurn = data.currentTurn === myUserId;
    
    //console.log('[Game] 🔄 Turn continue:', data);
    //console.log('[Game] My userId:', myUserId);
    //console.log('[Game] Current turn:', data.currentTurn);
    //console.log('[Game] Is my turn:', isMyTurn);
    
    gameState.isMyTurn = isMyTurn;
    showTurnNotification(isMyTurn, consumeTurnNotificationDelay());
    
    // Update turn tab
    updateTurnTab(isMyTurn);
    
    // Add glow effect to main grid when it's my turn
    const mainGrid = document.querySelector('.main-grid');
    if (mainGrid) {
        if (isMyTurn) {
            mainGrid.classList.add('your-turn-glow');
        } else {
            mainGrid.classList.remove('your-turn-glow');
        }
    }
}

function handleGameOver(data) {
    console.log('[Game] 🏆 Game over:', data);
    
    // Clear battle state on game over
    clearBattleState();
    
    handleBattleGameOver(data);
    showGameOverScreen();
}

function handlePlayerDisconnected(data) {
    console.log('[Game] ⚠️ Player disconnected:', data);
    SocketShared.showNotification('Đối thủ đã ngắt kết nối!', 'warning');
}

// ============ RECONNECTING OVERLAY ============
let reconnectCountdownInterval = null;

function showReconnectingOverlay(username, gracePeriod) {
    // Remove existing overlay
    hideReconnectingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'reconnectingOverlay';
    overlay.className = 'reconnecting-overlay';
    overlay.innerHTML = `
        <div class="reconnecting-content">
            <div class="reconnecting-spinner"></div>
            <div class="reconnecting-title">⚡ ĐANG KẾT NỐI LẠI</div>
            <div class="reconnecting-player">${username}</div>
            <div class="reconnecting-countdown">
                <span id="reconnectTimer">${gracePeriod}</span>s
            </div>
            <div class="reconnecting-message">Đợi đối thủ kết nối lại...</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Start countdown
    let timeLeft = gracePeriod;
    reconnectCountdownInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('reconnectTimer');
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(reconnectCountdownInterval);
            reconnectCountdownInterval = null;
        }
    }, 1000);
}

function hideReconnectingOverlay() {
    const overlay = document.getElementById('reconnectingOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    if (reconnectCountdownInterval) {
        clearInterval(reconnectCountdownInterval);
        reconnectCountdownInterval = null;
    }
}

// ============ BATTLE SCREEN FUNCTIONS ============
// (Previously in battle.js - now consolidated here)

function normalizeCharacterId(charId) {
    if (typeof charId === 'string') {
        if (charId.startsWith('character')) return charId;
        const num = parseInt(charId, 10);
        if (!Number.isNaN(num)) return `character${num + 1}`;
    }
    if (typeof charId === 'number') {
        return `character${charId + 1}`;
    }
    return 'character1';
}

function getCharacterAvatarPath(charId) {
    const normalized = normalizeCharacterId(charId);
    return `images/characters/${normalized}/avatar-large.png`;
}

function getCharacterShipsAssets(charId) {
    if (typeof getCharacterShipsById === 'function') {
        return getCharacterShipsById(normalizeCharacterId(charId));
    }
    return {};
}

function getPlacementShipImage(shipName) {
    const folder = (window.ShipDock && window.ShipDock.getCharacterFolder)
        ? window.ShipDock.getCharacterFolder()
        : 'character1';
    const map = {
        Carrier: 'carrier.png',
        Battleship: 'battleship.png',
        Cruiser: 'cruiser.png',
        Submarine: 'submarine.png',
        Destroyer: 'destroyer.png'
    };
    const file = map[shipName] || `${String(shipName || '').toLowerCase()}.png`;
    return `/images/characters/${folder}/ships/${file}`;
}

function getCharacterShipsAssets(charId) {
    if (typeof getCharacterShipsById === 'function') {
        return getCharacterShipsById(normalizeCharacterId(charId));
    }
    return {};
}

function initBattle(gameData) {
    //console.log('[Game] 🎮 initBattle() called with data:', gameData);
    
    // Store initial turn state
    const myUserId = BattleshipState.getUserId();
    gameState.isMyTurn = gameData.currentTurn === myUserId;
    
    // Initialize timer display to 60 seconds
    const timerElement = document.getElementById('battleTimer');
    if (timerElement) {
        timerElement.textContent = '00:60';
        timerElement.classList.remove('warning', 'danger');
    }
    
    // Build character info from server payload
    const myPlayer = gameData.player1?.userId === myUserId ? gameData.player1 : gameData.player2;
    const oppPlayer = gameData.player1?.userId === myUserId ? gameData.player2 : gameData.player1;
    const myCharId = normalizeCharacterId(myPlayer?.characterId);
    const oppCharId = normalizeCharacterId(oppPlayer?.characterId);

    const myCharData = {
        name: myPlayer?.username || 'You',
        avatar: getCharacterAvatarPath(myCharId),
        characterId: myCharId
    };
    const oppCharData = {
        name: oppPlayer?.username || 'Opponent',
        avatar: getCharacterAvatarPath(oppCharId),
        characterId: oppCharId
    };

    // Persist for reuse (rejoin, other screens)
    localStorage.setItem('myCharacterData', JSON.stringify(myCharData));
    localStorage.setItem('opponentCharacterData', JSON.stringify(oppCharData));
    
    // Render battle UI
    renderBattleUI(myCharData, oppCharData, gameData);
    
    // Setup battle chat
    setupBattleChat();
    
    // Show initial turn notification
    showTurnNotification(gameState.isMyTurn);
    
    console.log('[Game] ✅ Battle initialized');
}

function renderBattleUI(myChar, oppChar, gameData) {
    console.log('[Game] 🎨 Rendering battle UI...');
    
    // Update left banner (my info)
    const leftPlayerName = document.getElementById('leftPlayerName');
    const leftPlayerAvatar = document.getElementById('leftPlayerAvatar');
    
    const displayMyName = myChar.name || 'You';
    const shortMyName = displayMyName.length > 14 ? `${displayMyName.slice(0, 12)}…` : displayMyName;

    if (leftPlayerName) leftPlayerName.textContent = shortMyName;
    if (leftPlayerAvatar && myChar.avatar) {
        leftPlayerAvatar.src = myChar.avatar;
    }
    
    // Update opponent card (right side)
    const opponentName = document.getElementById('opponentName');
    const opponentAvatar = document.getElementById('opponentAvatar');
    
    // Shorten long guest IDs for better fit
    const displayOppName = oppChar.name || 'Opponent';
    const shortOppName = displayOppName.length > 14 ? `${displayOppName.slice(0, 12)}…` : displayOppName;

    if (opponentName) opponentName.textContent = shortOppName;
    if (opponentAvatar && oppChar.avatar) {
        opponentAvatar.src = oppChar.avatar;
    }
    
    // Update ship tracker icons to match opponent character ships
    const oppShips = getCharacterShipsAssets(oppChar.characterId);
    gameState.opponentShipAssets = oppShips;
    document.querySelectorAll('.tracker-ship').forEach(item => {
        const type = item.dataset.ship;
        const imgSrc = oppShips[type];
        const iconEl = item.querySelector('.ship-icon');
        if (iconEl && imgSrc) {
            iconEl.innerHTML = `<img src="${imgSrc}" alt="${type}" class="ship-icon-img">`;
        }
    });

    // Update turn tab
    updateTurnTab(gameState.isMyTurn);
    
    // Render boards
    renderBattleMyBoard();
    renderBattleEnemyBoard();
    
   // console.log('[Game] ✅ Battle UI rendered');
    
    // Setup chat bubble toggle
    setupChatBubble();
}

// Update turn tab indicator
function updateTurnTab(isMyTurn) {
    const tabFleet = document.getElementById('tabFleet');
    const tabTurn = document.getElementById('tabTurn');
    
    if (tabTurn) {
        tabTurn.textContent = isMyTurn ? 'YOUR TURN' : 'ENEMY TURN';
        tabTurn.classList.toggle('active', isMyTurn);
    }
    if (tabFleet) {
        tabFleet.classList.toggle('active', !isMyTurn);
    }
}

function renderBattleMyBoard() {
    const el = document.getElementById('battleMyBoard');
    if (!el) {
        console.error('[Game] battleMyBoard element not found!');
        return;
    }

    el.innerHTML = '';

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            const shipName = gameState.myBoard[r][c];
            if (shipName) {
                cell.classList.add('ship');
            }

            el.appendChild(cell);
        }
    }

    renderShipSegments(el, gameState.myShips);
}

function syncBattleMyBoardShips() {
    const board = document.getElementById('battleMyBoard');
    if (!board) return;

    const cells = board.querySelectorAll('.cell');
    if (!cells.length) return;

    cells.forEach(cell => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const shipName = gameState.myBoard?.[row]?.[col];

        if (shipName) {
            cell.classList.add('ship');
        } else {
            cell.classList.remove('ship');
        }
    });

    renderShipSegments(board, gameState.myShips);
}

function renderBattleEnemyBoard() {
    const el = document.getElementById('battleEnemyBoard');
    if (!el) {
        console.error('[Game] battleEnemyBoard element not found!');
        return;
    }

    el.innerHTML = '';

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell attack-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            cell.addEventListener('click', () => handleBattleAttack(r, c));

            el.appendChild(cell);
        }
    }
}

// Track if attack animation is playing
let isAttackAnimating = false;

function handleBattleAttack(row, col) {
   // console.log(`[Game] 🎯 Battle attack at (${row}, ${col})`);
    
    // Check if animation is playing
    if (isAttackAnimating) {
        console.warn('[Game] ⚠️ Attack animation in progress!');
        return;
    }
    
    // Check if it's my turn
    if (!gameState.isMyTurn) {
        console.warn('[Game] ⚠️ Not your turn!');
        SocketShared.showNotification('Chưa đến lượt của bạn!', 'warning');
        return;
    }
    
    // Check if already attacked this cell
    const cell = document.querySelector(`#battleEnemyBoard .cell[data-row="${row}"][data-col="${col}"]`);
    if (cell && (cell.classList.contains('hit') || cell.classList.contains('miss'))) {
        SocketShared.showNotification('Ô này đã được bắn rồi!', 'warning');
        return;
    }
    
    // Get room code
    const roomCode = BattleshipState.getRoomCode();
    
    // Start attack animation (slow motion effect)
    startAttackAnimation(cell, row, col, roomCode);
}

// Slow motion attack animation
function startAttackAnimation(cell, row, col, roomCode) {
    isAttackAnimating = true;
    
    // Add targeting class to cell
    if (cell) {
        cell.classList.add('targeting');
    }
    
    // Show targeting overlay
    showTargetingOverlay(row, col);
    
    // Disable grid clicks during animation
    const enemyBoard = document.getElementById('battleEnemyBoard');
    if (enemyBoard) {
        enemyBoard.style.pointerEvents = 'none';
    }
    
    // After 2 seconds, send the actual attack
    setTimeout(() => {
        // Remove targeting visual
        if (cell) {
            cell.classList.remove('targeting');
        }
        hideTargetingOverlay();
        
        // Send attack via socket
        if (gameState.socket) {
           // console.log('[Game] 📡 Sending attack to server...');
            gameState.socket.emit('attack', { 
                roomId: roomCode,
                row, 
                col 
            });
        } else {
            console.error('[Game] ❌ Socket not available!');
        }
        
        // Re-enable grid after a short delay (wait for result)
        setTimeout(() => {
            isAttackAnimating = false;
            if (enemyBoard) {
                enemyBoard.style.pointerEvents = 'auto';
            }
        }, 500);
    }, 2000); // 2 second delay for suspense
}

// Show targeting overlay with crosshair effect
function showTargetingOverlay(row, col) {
    // Disabled to keep background static during firing
    return;
}

function hideTargetingOverlay() {
    const overlay = document.getElementById('targetingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function appendShotHistory(isMyAttack, row, col, hit) {
    const list = document.getElementById('shotHistoryList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = `shot-history-item ${isMyAttack ? 'you' : 'opp'}`;

    const who = isMyAttack ? 'You' : 'Opponent';
    const cellLabel = `${String.fromCharCode(65 + row)}${col + 1}`;

    item.innerHTML = `
        <span class="shot-cell">${who}: ${cellLabel}</span>
        <span class="shot-result ${hit ? 'hit' : 'miss'}">${hit ? 'HIT' : 'MISS'}</span>
    `;

    list.appendChild(item);
    list.scrollTop = list.scrollHeight;

    if (list.children.length > 30) {
        list.removeChild(list.firstChild);
    }
}

// Battle event handlers (called from socket handlers)
function handleBattleAttackResult(data) {
    //console.log('[Game] 💥 Attack result:', data);
    
    const myUserId = BattleshipState.getUserId();
    const isMyAttack = data.attackerId === myUserId;
    const sunkShipName = data.shipName || data.shipSunk;
    
    //console.log('[Game] My userId:', myUserId);
    //console.log('[Game] Attacker ID:', data.attackerId);
    //console.log('[Game] Is my attack:', isMyAttack);
    
    if (isMyAttack) {
        // I attacked - update enemy board (main grid)
        const cell = document.querySelector(`#battleEnemyBoard .cell[data-row="${data.row}"][data-col="${data.col}"]`);
        if (cell) {
            cell.classList.add(data.hit ? 'hit' : 'miss');
            cell.style.pointerEvents = 'none';
            
            // Add explosion or splash effect
            if (data.hit) {
                showExplosionEffect(cell);
            } else {
                showSplashEffect(cell);
            }
        }
        
        if (data.hit) {
            showHitStamp(); // Show HIT! animation
            
            // Check if ship sunk
            if (data.sunk) {
                setTimeout(() => {
                    if (sunkShipName) {
                        showSunkStamp(sunkShipName);
                        updateShipTracker(sunkShipName, true);
                    }
                    animateSunkShipCells(data.shipCells, '#battleEnemyBoard');
                    const enemyBoard = document.getElementById('battleEnemyBoard');
                    const shipImage = getOpponentShipImage(sunkShipName);
                    renderSunkShipOnBoard(enemyBoard, sunkShipName, data.shipCells, shipImage);
                }, 800); // Show after HIT stamp
                nextTurnNotificationDelay = SUNK_ANIM_BUFFER;
            } else {
                nextTurnNotificationDelay = HIT_ANIM_BUFFER;
            }
        } else {
            showMissStamp(); // Show MISS stamp
            nextTurnNotificationDelay = HIT_ANIM_BUFFER;
        }
        appendShotHistory(true, data.row, data.col, data.hit);
    } else {
        const cell = document.querySelector(`#battleMyBoard .cell[data-row="${data.row}"][data-col="${data.col}"]`);
        if (cell) {
            // Add hit/miss class
            cell.classList.add(data.hit ? 'hit' : 'miss');
            // Add animation class for mini grid effect
            cell.classList.add(data.hit ? 'hit-new' : 'miss-new');
            
            // Remove animation class after it completes
            setTimeout(() => {
                cell.classList.remove('hit-new', 'miss-new');
            }, 800);
            
            console.log('[Game] ✅ Mini grid updated:', data.hit ? 'HIT' : 'MISS');
        } else {
            console.log('[Game] ❌ Could not find cell in mini grid');
        }
        
        // Update my fleet health when hit
        if (data.hit) {
            // Calculate remaining health (total ship cells = 17: 5+4+3+3+2)
            const totalCells = 17;
            const hits = document.querySelectorAll('#battleMyBoard .cell.hit').length;
            updateFleetHealth(totalCells - hits, totalCells);
            
            if (data.sunk) {
                if (sunkShipName) {
                    animateSunkShipCells(data.shipCells, '#battleMyBoard');
                }
                nextTurnNotificationDelay = SUNK_ANIM_BUFFER;
            } else {
                nextTurnNotificationDelay = HIT_ANIM_BUFFER;
            }
        } else {
            nextTurnNotificationDelay = HIT_ANIM_BUFFER;
        }

        appendShotHistory(false, data.row, data.col, data.hit);
    }
}

// Show explosion effect on hit
function showExplosionEffect(cell) {
    const effect = document.createElement('div');
    effect.className = 'explosion-effect';
    cell.appendChild(effect);
    
    setTimeout(() => effect.remove(), 600);
}

// Show splash effect on miss
function showSplashEffect(cell) {
    const effect = document.createElement('div');
    effect.className = 'splash-effect';
    cell.appendChild(effect);
    
    setTimeout(() => effect.remove(), 500);
}

// Animate all cells belonging to a sunk ship
function animateSunkShipCells(shipCells, boardSelector) {
    if (!Array.isArray(shipCells) || !boardSelector) return;
    
    shipCells.forEach(({ row, col }, index) => {
        const delay = index * 120;
        setTimeout(() => {
            const targetCell = document.querySelector(`${boardSelector} .cell[data-row="${row}"][data-col="${col}"]`);
            if (!targetCell) return;
            
            targetCell.classList.add('ship-sunk', 'ship-sunk-anim');
            showExplosionEffect(targetCell);
            
            setTimeout(() => {
                targetCell.classList.remove('ship-sunk-anim');
            }, 1400);
        }, delay);
    });
}

// Show MISS stamp
function showMissStamp() {
    const stamp = document.createElement('div');
    stamp.className = 'miss-stamp';
    stamp.textContent = 'MISS!';
    document.body.appendChild(stamp);
    
    setTimeout(() => stamp.remove(), 700);
}

// Show SUNK stamp with ship name
function showSunkStamp(shipName) {
    const stamp = document.createElement('div');
    stamp.className = 'sunk-stamp';
    stamp.innerHTML = `SUNK!<br><span style="font-size: 0.5em">${shipName || 'SHIP'}</span>`;
    document.body.appendChild(stamp);
    
    setTimeout(() => stamp.remove(), 1200);
}

// handleBattleUnderAttack - Logic now merged into handleBattleAttackResult
// Kept for backward compatibility if server sends 'under_attack' event separately
function handleBattleUnderAttack(data) {
    //console.log('[Game] 🎯 Under attack (legacy handler):', data);
    // legacy handler (kept for older events)
    // But keeping this in case server sends separate event
    const cell = document.querySelector(`#battleMyBoard .cell[data-row="${data.row}"][data-col="${data.col}"]`);
    if (cell) {
        cell.classList.add(data.hit ? 'hit' : 'miss');
        cell.classList.add(data.hit ? 'hit-new' : 'miss-new');
        setTimeout(() => cell.classList.remove('hit-new', 'miss-new'), 800);
    }
    
    if (data.hit) {
        const totalCells = 17;
        const hits = document.querySelectorAll('#battleMyBoard .cell.hit').length;
        updateFleetHealth(totalCells - hits, totalCells);
    }

    appendShotHistory(false, data.row, data.col, data.hit);
}
function handleBattleTurnChanged(data) {
    //console.log('[Game] 🔄 Turn changed:', data);
    
    // Server sends currentTurn (userId), not isMyTurn (boolean)
    // Check if currentTurn matches my userId
    const myUserId = BattleshipState.getUserId();
    const isMyTurn = data.currentTurn === myUserId || data.isMyTurn === true;
    
    //console.log('[Game] My userId:', myUserId);
    //console.log('[Game] Current turn userId:', data.currentTurn);
    //console.log('[Game] Is my turn:', isMyTurn);
    
    gameState.isMyTurn = isMyTurn;
    showTurnNotification(isMyTurn, consumeTurnNotificationDelay());
    
    // Update turn tab
    updateTurnTab(isMyTurn);
    
    // Add glow effect to main grid when it's my turn
    const mainGrid = document.querySelector('.main-grid');
    if (mainGrid) {
        if (isMyTurn) {
            mainGrid.classList.add('your-turn-glow');
        } else {
            mainGrid.classList.remove('your-turn-glow');
        }
    }
    
    // Reset timer warning style on turn change
    const timerElement = document.getElementById('battleTimer');
    if (timerElement) {
        timerElement.classList.remove('warning', 'danger');
    }
}

// Handle timer update from server (called every second)
function handleBattleTimerUpdate(data) {
    const timerElement = document.getElementById('battleTimer');
    if (!timerElement) return;
    
    const seconds = data.timeRemaining;
    
    // Just show the number (new design)
    timerElement.textContent = seconds;
    
    // Visual feedback based on time remaining
    timerElement.classList.remove('warning', 'danger');
    if (seconds <= 5) {
        timerElement.classList.add('danger');
    } else if (seconds <= 10) {
        timerElement.classList.add('warning');
    }
    
    // Log occasionally for debugging
    if (seconds % 10 === 0) {
        //console.log(`[Game] ⏱️ Timer: ${seconds}s`);
    }
}

const TURN_NOTIFICATION_DELAY = 1200;
const HIT_ANIM_BUFFER = 900;
const SUNK_ANIM_BUFFER = 2200;
let turnNotificationTimeout = null;
let nextTurnNotificationDelay = 0;

function consumeTurnNotificationDelay() {
    const delay = Math.max(TURN_NOTIFICATION_DELAY, nextTurnNotificationDelay);
    nextTurnNotificationDelay = 0;
    return delay;
}

function showTurnNotification(isMyTurn, delay = 0) {
    const transition = document.getElementById('turnTransitionBattle');
    const title = document.getElementById('transitionTitleBattle');
    
    if (turnNotificationTimeout) {
        clearTimeout(turnNotificationTimeout);
    }
    
    turnNotificationTimeout = setTimeout(() => {
        if (transition && title) {
            title.textContent = isMyTurn ? 'YOUR TURN' : 'ENEMY TURN';
            transition.style.display = 'flex';
            
            setTimeout(() => {
                transition.style.display = 'none';
            }, 2000);
        }
    }, Math.max(0, delay));
}

function handleBattleGameOver(data) {
    console.log('[Game] 🏆 Game over:', data);
    const myUserId = BattleshipState.getUserId();
    const isWinner = data.winnerId === myUserId;
    console.log('[Game] Am I winner?', isWinner, '(winnerId:', data.winnerId, ', myUserId:', myUserId, ')');
    
    // Show notification
    SocketShared.showNotification(
        isWinner ? '🎉 Chúc mừng! Bạn đã thắng!' : '😢 Bạn đã thua!', 
        isWinner ? 'success' : 'error'
    );
    
    // Update Game Over screen
    updateGameOverScreen(data, isWinner);
}

// Update Game Over screen with character results
function updateGameOverScreen(data, isWinner) {
    console.log('[Game] Updating game over screen with data:', data);
    
    // Get elements
    const gameOverTitle = document.getElementById('gameOverTitle');
    const myCharacterResult = document.getElementById('myCharacterResult');
    const opponentCharacterResult = document.getElementById('opponentCharacterResult');
    const myResultLabel = document.getElementById('myResultLabel');
    const opponentResultLabel = document.getElementById('opponentResultLabel');
    const myCharacterName = document.getElementById('myCharacterName');
    const opponentCharacterName = document.getElementById('opponentCharacterName');
    
    // Helper function to convert characterId (index or string) to proper format
    function normalizeCharacterId(charId) {
        // If it's a number (index), convert to 'character{n+1}'
        if (typeof charId === 'number') {
            return `character${charId + 1}`;
        }
        // If it's already a string like 'character1', return as is
        if (typeof charId === 'string' && charId.startsWith('character')) {
            return charId;
        }
        // If it's a string number like '2', convert
        if (typeof charId === 'string' && !isNaN(parseInt(charId))) {
            return `character${parseInt(charId) + 1}`;
        }
        // Default
        return 'character1';
    }
    
    // Get character info directly from game_over data
    // Server sends: winner, winnerId, winnerCharacterId, loser, loserId, loserCharacterId
    // Note: characterId can be a number (index 0,1,2) or string ('character1','character2','character3')
    let myCharacterId = 'character1';
    let opponentCharacterId = 'character1';
    let myUsername = 'Player';
    let opponentUsername = 'Opponent';
    
    if (isWinner) {
        // I won
        myCharacterId = normalizeCharacterId(data.winnerCharacterId);
        myUsername = data.winner || 'Player';
        opponentCharacterId = normalizeCharacterId(data.loserCharacterId);
        opponentUsername = data.loser || 'Opponent';
    } else {
        // I lost
        myCharacterId = normalizeCharacterId(data.loserCharacterId);
        myUsername = data.loser || 'Player';
        opponentCharacterId = normalizeCharacterId(data.winnerCharacterId);
        opponentUsername = data.winner || 'Opponent';
    }
    
    console.log('[Game] My character:', myCharacterId, 'Opponent:', opponentCharacterId);
    console.log('[Game] My username:', myUsername, 'Opponent:', opponentUsername);
    
    // Get character avatars using helper functions from charactersData.js
    // Determine which avatar to use (win or lose)
    const myAvatarPath = isWinner 
        ? (typeof getCharacterWinAvatar === 'function' ? getCharacterWinAvatar(myCharacterId) : `images/characters/${myCharacterId}/avatar-win.png`)
        : (typeof getCharacterLoseAvatar === 'function' ? getCharacterLoseAvatar(myCharacterId) : `images/characters/${myCharacterId}/avatar-lose.png`);
    const opponentAvatarPath = !isWinner 
        ? (typeof getCharacterWinAvatar === 'function' ? getCharacterWinAvatar(opponentCharacterId) : `images/characters/${opponentCharacterId}/avatar-win.png`)
        : (typeof getCharacterLoseAvatar === 'function' ? getCharacterLoseAvatar(opponentCharacterId) : `images/characters/${opponentCharacterId}/avatar-lose.png`);
    
    console.log('[Game] My avatar:', myAvatarPath, 'Opponent avatar:', opponentAvatarPath);
    
    // Get character names from charactersData.js
    const myCharName = typeof getCharacterName === 'function' ? getCharacterName(myCharacterId) : myCharacterId;
    const opponentCharName = typeof getCharacterName === 'function' ? getCharacterName(opponentCharacterId) : opponentCharacterId;
    
    console.log('[Game] My char name:', myCharName, 'Opponent char name:', opponentCharName);
    
    // Update title
    if (gameOverTitle) {
        gameOverTitle.textContent = isWinner ? '🎉 CHIẾN THẮNG!' : '💀 THẤT BẠI!';
        gameOverTitle.className = isWinner ? 'game-over-title victory' : 'game-over-title defeat';
    }
    
    // Update my character (left side)
    if (myCharacterResult) {
        myCharacterResult.src = myAvatarPath;
        myCharacterResult.alt = myCharName;
    }
    if (myResultLabel) {
        myResultLabel.textContent = isWinner ? '🏆 THẮNG' : '💀 THUA';
        myResultLabel.className = isWinner ? 'character-result-label winner' : 'character-result-label loser';
    }
    if (myCharacterName) {
        myCharacterName.textContent = myCharName;
    }
    // Update my username
    const myPlayerUsername = document.getElementById('myPlayerUsername');
    if (myPlayerUsername) {
        myPlayerUsername.textContent = myUsername;
    }
    
    // Update opponent character (right side)
    if (opponentCharacterResult) {
        opponentCharacterResult.src = opponentAvatarPath;
        opponentCharacterResult.alt = opponentCharName;
    }
    if (opponentResultLabel) {
        opponentResultLabel.textContent = !isWinner ? '🏆 THẮNG' : '💀 THUA';
        opponentResultLabel.className = !isWinner ? 'character-result-label winner' : 'character-result-label loser';
    }
    if (opponentCharacterName) {
        opponentCharacterName.textContent = opponentCharName;
    }
    // Update opponent username
    const opponentPlayerUsername = document.getElementById('opponentPlayerUsername');
    if (opponentPlayerUsername) {
        opponentPlayerUsername.textContent = opponentUsername;
    }
    
    // Add animation classes to character containers
    const leftChar = document.querySelector('.left-character-result');
    const rightChar = document.querySelector('.right-character-result');
    
    if (leftChar) {
        leftChar.classList.remove('winner-glow', 'loser-fade');
        leftChar.classList.add(isWinner ? 'winner-glow' : 'loser-fade');
    }
    if (rightChar) {
        rightChar.classList.remove('winner-glow', 'loser-fade');
        rightChar.classList.add(!isWinner ? 'winner-glow' : 'loser-fade');
    }
}

// ============ BATTLE CHAT FUNCTIONS ============
function setupBattleChat() {
    console.log('[Game] 💬 Setting up battle chat...');
    
    const chatInput = document.getElementById('battleChatInput');
    const chatSend = document.getElementById('battleChatSend');
    
    if (!chatInput || !chatSend) {
        console.warn('[Game] ⚠️ Battle chat elements not found');
        return;
    }
    
    // Remove old listeners to prevent duplicates
    const newChatSend = chatSend.cloneNode(true);
    chatSend.parentNode.replaceChild(newChatSend, chatSend);
    
    const newChatInput = chatInput.cloneNode(true);
    chatInput.parentNode.replaceChild(newChatInput, chatInput);
    
    // Get fresh references
    const sendBtn = document.getElementById('battleChatSend');
    const input = document.getElementById('battleChatInput');
    
    // Send message on button click
    sendBtn.addEventListener('click', () => {
        const message = input.value.trim();
        if (!message) return;
        
        console.log('[Game] 📤 Sending chat message:', message);
        
        if (gameState.socket) {
            const roomCode = BattleshipState.getRoomCode();
            gameState.socket.emit('chat_message', {
                roomId: roomCode,
                message: message,
                timestamp: Date.now()
            });
            
            input.value = '';
        }
    });
    
    // Send message on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
    
    // Send typing indicator
    let typingTimeout;
    input.addEventListener('input', () => {
        if (gameState.socket) {
            const roomCode = BattleshipState.getRoomCode();
            gameState.socket.emit('player_typing', { roomId: roomCode });
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {}, 3000);
        }
    });
    
    console.log('[Game] ✅ Battle chat setup complete');
}

// Track sent messages to avoid duplicate display
const sentMessageIds = new Set();

function addBattleChatMessage(data, isLocalSend = false) {
    console.log('[Game] 💬 Adding chat message:', data, 'isLocalSend:', isLocalSend);
    
    const currentUserId = BattleshipState.getUserId();
    const isMyMessage = data.userId === currentUserId;
    
    // If this is a socket event for my own message (not local send), skip it
    // Because we already displayed it when sending
    if (isMyMessage && !isLocalSend) {
        // Check if we already displayed this message locally
        if (data.messageId && sentMessageIds.has(data.messageId)) {
            console.log('[Game] 💬 Skipping duplicate message:', data.messageId);
            return;
        }
        // Also skip if timestamp matches a recently sent message (fallback)
        if (data.timestamp && sentMessageIds.has(data.timestamp)) {
            console.log('[Game] 💬 Skipping duplicate message by timestamp');
            return;
        }
    }
    
    const messagesContainer = document.getElementById('battleChatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    messageDiv.style.cssText = `
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        ${isMyMessage ? 'margin-left: auto; background: #4a9eff; color: white; text-align: right;' : 'margin-right: auto; background: #2a2a3e; color: white;'}
    `;
    
    const username = isMyMessage ? 'Bạn' : data.username;
    const time = new Date(data.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `
        <div style="font-size: 14px;">${data.message}</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showBattleTypingIndicator(username) {
    const messagesContainer = document.getElementById('battleChatMessages');
    if (!messagesContainer) return;
    
    // Remove old typing indicator
    const oldIndicator = messagesContainer.querySelector('.typing-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    // Add new typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.style.cssText = 'font-size: 12px; color: #888; font-style: italic; margin: 8px 0;';
    typingDiv.textContent = `${username} đang nhập...`;
    messagesContainer.appendChild(typingDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (typingDiv.parentNode) typingDiv.remove();
    }, 3000);
}

// ============ CHAT BUBBLE - Handled by chat.js ============
// Note: Chat bubble functionality is now in chat.js
// Keeping empty setupChatBubble for backward compatibility
function setupChatBubble() {
    console.log('[Game] 💬 Chat bubble handled by chat.js');
}

// ============ HIT STAMP ANIMATION ============
function showHitStamp() {
    const stamp = document.getElementById('hitStamp');
    if (!stamp) return;
    
    // Reset and show
    stamp.style.display = 'block';
    stamp.classList.remove('show');
    
    // Force reflow
    void stamp.offsetWidth;
    
    // Add show class to trigger animation
    stamp.classList.add('show');
    
    // Hide after animation
    setTimeout(() => {
        stamp.style.display = 'none';
        stamp.classList.remove('show');
    }, 800);
}

// ============ SHIP TRACKER UPDATE ============
function updateShipTracker(shipName, isSunk) {
    if (!shipName) return;
    
    const trackerShip = document.querySelector(`.tracker-ship[data-ship="${shipName.toLowerCase()}"]`);
    if (trackerShip && isSunk) {
        trackerShip.classList.add('sunk');
    }
}

function resetShipTracker() {
    document.querySelectorAll('.tracker-ship').forEach(ship => ship.classList.remove('sunk'));
}

// ============ FLEET HEALTH UPDATE ============
function updateFleetHealth(remainingHits, totalHits) {
    const healthFill = document.getElementById('myFleetHealth');
    if (!healthFill) return;
    
    const percentage = (remainingHits / totalHits) * 100;
    healthFill.style.width = `${percentage}%`;
    
    // Change color based on health
    if (percentage <= 25) {
        healthFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    } else if (percentage <= 50) {
        healthFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
        healthFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
    }
}


