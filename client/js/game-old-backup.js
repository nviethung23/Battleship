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
        placedShips: []
    },
    gameStarted: false,
    timerInterval: null
};

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Game.js] DOMContentLoaded - Checking authentication...');
    
    // Check authentication
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    console.log('[Game.js] Token:', token ? 'exists' : 'missing');
    console.log('[Game.js] UserId:', userId);
    console.log('[Game.js] Username:', username);
    
    if (!token) {
        console.error('[Game.js] No token found, redirecting to login');
        window.location.href = '/';
        return;
    }

    console.log('[Game.js] Authentication OK, initializing socket...');

    // Initialize socket
    initSocket();

    // Setup event listeners
    setupEventListeners();
    
    // Initialize hero character switcher (UI-only cosmetic)
    initHeroCharacterSwitcher();

    // Show placement screen directly (no lobby/character selection in game.html)
    showPlacementScreen();
});

function setupEventListeners() {
    // Logout (header button - legacy)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Logout (hub sidebar button - new)
    const hubLogoutBtn = document.getElementById('hubLogoutBtn');
    if (hubLogoutBtn) {
        hubLogoutBtn.addEventListener('click', logout);
    }

    // ============ NEW: PRIVATE ROOM & QUICK PLAY ============
    // Tạo phòng riêng (only in hub)
    const createPrivateRoomBtn = document.getElementById('createPrivateRoomBtn');
    if (createPrivateRoomBtn) {
        createPrivateRoomBtn.addEventListener('click', () => {
            console.log('[Lobby] Creating private room...');
            socket.emit('room:createPrivate');
        });
    }

    // Chơi ngay (Quick Play) - with loading state (only in hub)
    const quickPlayBtn = document.getElementById('quickPlayBtn');
    if (quickPlayBtn) {
        quickPlayBtn.addEventListener('click', function() {
            console.log('[Lobby] Joining quick play queue...');
            
            // Add loading state (bonus feature)
            const btn = this;
            const btnText = btn.querySelector('.hub__btn-text');
            const originalText = btnText ? btnText.textContent : 'Chơi Ngay';
            
            // Set loading state
            btn.classList.add('is-loading');
            btn.disabled = true;
            if (btnText) btnText.textContent = 'Đang tìm đối thủ';
            
            // Emit socket event
            socket.emit('queue:join');
            
            // Safety timeout - remove loading after 3s if no response
            setTimeout(() => {
                btn.classList.remove('is-loading');
                btn.disabled = false;
                if (btnText) btnText.textContent = originalText;
            }, 3000);
        });
    }

    // Huỷ tìm
    const cancelQueueBtn = document.getElementById('cancelQueueBtn');
    if (cancelQueueBtn) {
        cancelQueueBtn.addEventListener('click', () => {
            console.log('[Queue] Cancelling queue...');
            socket.emit('queue:cancel');
        });
    }

    // Tham gia phòng riêng (only in hub)
    const joinPrivateRoomBtn = document.getElementById('joinPrivateRoomBtn');
    if (joinPrivateRoomBtn) {
        joinPrivateRoomBtn.addEventListener('click', () => {
            const roomCodeInput = document.getElementById('roomCodeInput');
            const code = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';
            if (!code) {
                showNotification('Vui lòng nhập mã phòng!', 'error');
                return;
            }
            if (code.length !== 6) {
                showNotification('Mã phòng phải có 6 ký tự!', 'error');
                return;
            }
            console.log('[Lobby] Joining private room with code:', code);
            socket.emit('room:joinPrivate', { code });
        });
    }

    // Copy mã phòng (only in hub)
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const codeValue = document.getElementById('roomCodeValue').textContent;
            navigator.clipboard.writeText(codeValue).then(() => {
                showNotification('Đã copy mã phòng!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showNotification('Không thể copy mã phòng', 'error');
            });
        });
    }

    // Enter key cho room code input (only in hub)
    const roomCodeInput = document.getElementById('roomCodeInput');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const joinBtn = document.getElementById('joinPrivateRoomBtn');
                if (joinBtn) joinBtn.click();
            }
        });
    }

    // ============ LEGACY BUTTONS (keep for compatibility) ============
    // Lobby
    const createRoomBtn = document.getElementById('createRoomBtn');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            createRoom();
        });
    }

    const findRoomBtn = document.getElementById('findRoomBtn');
    if (findRoomBtn) {
        findRoomBtn.addEventListener('click', () => {
            showRoomList();
        });
    }

    const closeRoomListBtn = document.getElementById('closeRoomListBtn');
    if (closeRoomListBtn) {
        closeRoomListBtn.addEventListener('click', () => {
            hideRoomList();
        });
    }

    // Waiting room (only in old lobby)
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            backToLobby();
        });
    }

    // Placement - Random button
    const randomPlaceBtn = document.getElementById('randomPlaceBtn');
    if (randomPlaceBtn) {
        randomPlaceBtn.addEventListener('click', () => {
            placeShipsRandomly();
        });
    }

    // Placement - Ready button
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            if (gameState.placementMode.placedShips.length === SHIPS.length) {
                sendPlayerReady(gameState.myShips, gameState.myBoard);
                showNotification('Đã sẵn sàng! Đang chờ đối thủ...', 'success');
                readyBtn.disabled = true;
            }
        });
    }

    // Game over - Back to lobby button
    const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    if (backToLobbyBtn) {
        backToLobbyBtn.addEventListener('click', () => {
            backToLobby();
        });
    }
}

// Helper functions
function createEmptyBoard() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function logout() {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    
    // Nếu là guest, disconnect socket để trigger server cleanup
    if (isGuest && typeof socket !== 'undefined' && socket.connected) {
        console.log('[Logout] Disconnecting guest socket...');
        socket.disconnect();
    }
    
    localStorage.clear();
    window.location.href = '/';
}

function backToLobby() {
    currentRoomId = null;
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
            placedShips: []
        },
        gameStarted: false,
        timerInterval: null
    };
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    showLobby();
    getRoomList();
}

// Screen management
function showLobby() {
    hideAllScreens();
    document.getElementById('lobbyScreen').style.display = 'block';
    hideRoomList();
    
    // Load character image (default character1)
    const characterImg = document.getElementById('lobbyCharacterImg');
    if (characterImg && typeof getCharacterAvatar === 'function') {
        characterImg.src = getCharacterAvatar('character1', 'large');
    }
}

// Show room list panel
function showRoomList() {
    const panel = document.getElementById('roomListPanel');
    if (panel) {
        panel.style.display = 'block';
        getRoomList();
    }
}

// Hide room list panel
function hideRoomList() {
    console.log('hideRoomList called');
    const panel = document.getElementById('roomListPanel');
    if (panel) {
        console.log('Hiding room list panel...');
        panel.style.display = 'none';
    } else {
        console.error('roomListPanel not found!');
    }
}

// Waiting screen đã được bỏ, flow chuyển thẳng sang character selection
// Function này giữ lại để tránh lỗi nếu có code khác gọi
function showWaitingScreen(room) {
    // Chờ đối thủ join, sẽ tự động chuyển sang character selection qua event player_joined
    showNotification('Đang chờ đối thủ tham gia phòng...', 'info');
}

function showPlacementScreen() {
    hideAllScreens();
    document.getElementById('placementScreen').style.display = 'block';
    initPlacementMode();
    
    // Load and display character info from lobby
    loadDeployCharacterInfo();
}

function loadDeployCharacterInfo() {
    try {
        const gameRoomData = localStorage.getItem('gameRoomData');
        if (!gameRoomData) {
            console.warn('[Game] No room data found, using defaults');
            return;
        }
        
        const roomData = JSON.parse(gameRoomData);
        const currentUserId = localStorage.getItem('userId');
        
        console.log('[Game] Loading character info:', roomData);
        
        // Character images path
        const CHARACTERS = [
            { image: 'images/characters/character1/avatar-large.png' },
            { image: 'images/characters/character2/avatar-large.png' },
            { image: 'images/characters/character3/avatar-large.png' }
        ];
        
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
                yourCharImg.src = CHARACTERS[yourData.characterId]?.image || CHARACTERS[0].image;
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
                oppCharImg.src = CHARACTERS[opponentData.characterId]?.image || CHARACTERS[0].image;
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

function showGameScreen() {
    hideAllScreens();
    document.getElementById('gameScreen').style.display = 'block';
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

// Room list
function updateRoomList(rooms) {
    const container = document.getElementById('roomListContainer');
    
    if (!rooms || rooms.length === 0) {
        container.innerHTML = '<p class="no-rooms">Chưa có phòng nào. Hãy tạo phòng mới!</p>';
        return;
    }

    container.innerHTML = '';
    rooms.forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        
        // Server trả về: { id, player1: username (string), createdAt }
        const player1Name = room.player1 || 'Unknown';
        const roomId = room.id;
        const createdAt = room.createdAt ? new Date(room.createdAt).toLocaleTimeString('vi-VN') : 'Vừa tạo';
        
        roomDiv.innerHTML = `
            <h4>Phòng của ${player1Name}</h4>
            <p>Mã: ${roomId}</p>
            <p>Tạo: ${createdAt}</p>
        `;
        
        // Tất cả phòng trong list đều có thể join (server đã filter chỉ phòng waiting)
        roomDiv.addEventListener('click', () => {
            joinRoom(roomId);
        });
        roomDiv.style.cursor = 'pointer';
        
        container.appendChild(roomDiv);
    });
}

// Waiting room
function updateWaitingRoom(room) {
    document.getElementById('player1Name').textContent = room.player1.username;
    document.getElementById('player1Status').textContent = room.player1.ready ? 'Sẵn sàng!' : 'Đang đặt tàu...';
    document.getElementById('player1Status').className = room.player1.ready ? 'status-ready' : 'status-waiting';

    if (room.player2) {
        document.getElementById('player2Name').textContent = room.player2.username;
        document.getElementById('player2Status').textContent = room.player2.ready ? 'Sẵn sàng!' : 'Đang đặt tàu...';
        document.getElementById('player2Status').className = room.player2.ready ? 'status-ready' : 'status-waiting';
    } else {
        document.getElementById('player2Name').textContent = 'Đang chờ...';
        document.getElementById('player2Status').textContent = '-';
    }
}

function updatePlayerReadyStatus(data) {
    // Update legacy status elements (if they exist)
    const player1Status = document.getElementById('player1Status');
    const player2Status = document.getElementById('player2Status');
    
    if (player1Status) {
        player1Status.textContent = data.player1Ready ? 'Sẵn sàng!' : 'Đang đặt tàu...';
        player1Status.className = data.player1Ready ? 'status-ready' : 'status-waiting';
    }
    
    if (player2Status) {
        player2Status.textContent = data.player2Ready ? 'Sẵn sàng!' : 'Đang đặt tàu...';
        player2Status.className = data.player2Ready ? 'status-ready' : 'status-waiting';
    }
    
    // Update deploy screen opponent status
    const currentUserId = localStorage.getItem('userId');
    const gameRoomData = localStorage.getItem('gameRoomData');
    
    if (gameRoomData) {
        try {
            const roomData = JSON.parse(gameRoomData);
            const isPlayer1 = roomData.player1?.userId === currentUserId;
            const opponentReady = isPlayer1 ? data.player2Ready : data.player1Ready;
            
            const oppStatus = document.getElementById('deployOpponentStatus');
            const oppCircle = document.getElementById('deployOpponentCircle');
            const oppCard = oppCircle?.closest('.deploy-opponent');
            
            if (oppStatus && oppCard) {
                if (opponentReady) {
                    // Opponent is ready
                    oppCard.classList.remove('waiting');
                    oppCard.classList.add('ready');
                    oppStatus.innerHTML = '<span class="status-icon">✓</span><span>Ready!</span>';
                    oppStatus.className = 'character-status status-active';
                } else {
                    // Opponent is still deploying
                    oppCard.classList.add('waiting');
                    oppCard.classList.remove('ready');
                    oppStatus.innerHTML = '<span class="status-icon">⏳</span><span>Deploying...</span>';
                    oppStatus.className = 'character-status status-waiting';
                }
            }
        } catch (error) {
            console.error('[Game] Error updating opponent status:', error);
        }
    }
}

// Ship placement
function initPlacementMode() {
    console.log('[Placement] 🎯 Initializing placement mode...');
    
    gameState.myBoard = createEmptyBoard();
    gameState.myShips = [];
    gameState.placementMode = {
        currentShip: null,
        isHorizontal: true,
        placedShips: [],
        draggedShip: null,
        selectedCharacter: 0 // Default character
    };

    // Set username
    const usernameEl = document.getElementById('placementUsername');
    if (usernameEl) {
        usernameEl.textContent = currentUsername;
    }

    console.log('[Placement] Username:', currentUsername);

    // Auto place tất cả tàu ngẫu nhiên ngay từ đầu
    placeShipsRandomly();
    
    renderPlacementBoard();
    
    // Ready button enabled vì tàu đã đặt sẵn
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = false;
    }
    
    // Start deployment timer
    startDeploymentTimer();
    
    // Add keyboard listener for R key to rotate ships
    setupKeyboardControls();
    
    console.log('[Placement] ✅ Placement mode initialized');
}

// Deployment Timer (120 seconds)
let deploymentTimerInterval = null;
let deploymentTimeRemaining = 120;

function startDeploymentTimer() {
    deploymentTimeRemaining = 120;
    const timerEl = document.getElementById('deploymentTimer');
    const timerContainer = document.querySelector('.hud-timer-center');
    
    if (!timerEl) return;
    
    // Clear any existing timer
    if (deploymentTimerInterval) {
        clearInterval(deploymentTimerInterval);
    }
    
    // Update immediately
    updateDeploymentTimerDisplay();
    
    // Update every second
    deploymentTimerInterval = setInterval(() => {
        deploymentTimeRemaining--;
        
        updateDeploymentTimerDisplay();
        
        // Warning state at 10s
        if (deploymentTimeRemaining <= 10) {
            timerEl.classList.add('warning');
            if (timerContainer) timerContainer.classList.add('warning');
        }
        
        // Time's up
        if (deploymentTimeRemaining <= 0) {
            clearInterval(deploymentTimerInterval);
            handleDeploymentTimeout();
        }
    }, 1000);
}

function updateDeploymentTimerDisplay() {
    const timerEl = document.getElementById('deploymentTimer');
    if (!timerEl) return;
    
    const minutes = Math.floor(deploymentTimeRemaining / 60);
    const seconds = deploymentTimeRemaining % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handleDeploymentTimeout() {
    console.log('[Placement] ⏰ Deployment time expired!');
    
    // Disable controls
    const randomBtn = document.getElementById('randomPlaceBtn');
    const readyBtn = document.getElementById('readyBtn');
    
    if (randomBtn) randomBtn.disabled = true;
    if (readyBtn) readyBtn.disabled = true;
    
    // Show notification
    if (typeof SocketShared !== 'undefined' && SocketShared.showNotification) {
        SocketShared.showNotification('Hết thời gian! Không thể thay đổi vị trí tàu.', 'warning');
    }
}

function stopDeploymentTimer() {
    if (deploymentTimerInterval) {
        clearInterval(deploymentTimerInterval);
        deploymentTimerInterval = null;
    }
}

// Setup keyboard controls for ship rotation
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
                showNotification('🔄 Xoay tàu bằng phím R!', 'info');
            } else {
                // Rotate the first ship as fallback
                if (gameState.myShips.length > 0) {
                    rotateShipOnBoard(gameState.myShips[0].name);
                    showNotification('🔄 Xoay tàu bằng phím R! Di chuột lên tàu để chọn tàu cụ thể', 'info');
                }
            }
        }
    };
    
    document.addEventListener('keydown', window.keyboardRotateHandler);
}

// Không cần renderShipsList nữa vì tàu đặt sẵn trên board

// Không cần selectShip và pickupShip nữa vì drag-drop trực tiếp

// Xoay tàu đã đặt trên board
function rotateShipOnBoard(shipName) {
    // Tìm tàu
    const shipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (shipIndex === -1) return;

    const ship = gameState.myShips[shipIndex];
    const firstCell = ship.cells[0];
    
    // Xác định hướng hiện tại
    const isHorizontal = ship.cells.length > 1 && ship.cells[0].row === ship.cells[1].row;
    const newOrientation = !isHorizontal;
    
    // Tạm xóa tàu khỏi board
    ship.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = null;
    });
    
    // Thử đặt lại với hướng mới
    const shipConfig = SHIPS.find(s => s.name === shipName);
    
    // Kiểm tra có đặt được không
    let canRotate = true;
    for (let i = 0; i < shipConfig.size; i++) {
        const r = newOrientation ? firstCell.row : firstCell.row + i;
        const c = newOrientation ? firstCell.col + i : firstCell.col;
        
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || gameState.myBoard[r][c] !== null) {
            canRotate = false;
            break;
        }
    }
    
    if (canRotate) {
        // Xoay được - đặt lại với hướng mới
        const newCells = [];
        for (let i = 0; i < shipConfig.size; i++) {
            const r = newOrientation ? firstCell.row : firstCell.row + i;
            const c = newOrientation ? firstCell.col + i : firstCell.col;
            gameState.myBoard[r][c] = shipName;
            newCells.push({ row: r, col: c });
        }
        ship.cells = newCells;
        
        showNotification(`Đã xoay ${shipName}! 🔄`, 'success');
    } else {
        // Không xoay được - đặt lại vị trí cũ
        ship.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = shipName;
        });
        
        showNotification(`Không thể xoay ${shipName} ở vị trí này!`, 'warning');
    }
    
    renderPlacementBoard();
}

function renderPlacementBoard() {
    const board = document.getElementById('placementBoard');
    if (!board) {
        console.error('[Placement] ❌ placementBoard element not found!');
        return;
    }
    
    board.innerHTML = '';
    
    console.log('[Placement] 🚢 Rendering board with', gameState.myShips.length, 'ships');
    
    // Get current selected character (default character1)
    const characterIndex = gameState.placementMode.selectedCharacter || 0;
    const characterFolder = `character${characterIndex + 1}`;
    
    console.log('[Placement] Using character folder:', characterFolder);

    // First, render all cells
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const shipAtCell = gameState.myBoard[row][col];
            
            if (shipAtCell) {
                cell.classList.add('ship');
                cell.draggable = true;
                cell.dataset.shipName = shipAtCell;
                cell.title = `${shipAtCell} - Kéo để di chuyển, Click hoặc R để xoay`;
            }

            // Drag over - allow drop
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            // Drop - place ship
            cell.addEventListener('drop', handleDrop);

            // Click to rotate
            cell.addEventListener('click', (e) => {
                if (shipAtCell) {
                    rotateShip(shipAtCell);
                }
            });

            board.appendChild(cell);
        }
    }

    // Then, render ship images as overlays
    gameState.myShips.forEach(ship => {
        const firstCell = ship.cells[0];
        const isHorizontal = ship.cells.length > 1 && ship.cells[0].row === ship.cells[1].row;
        
        // Map ship name to image file
        const shipImageMap = {
            'Carrier': 'carrier.png',
            'Battleship': 'battleship.png',
            'Cruiser': 'cruiser.png',
            'Submarine': 'submarine.png',
            'Destroyer': 'destroyer.png'
        };
        
        const shipImage = shipImageMap[ship.name];
        if (shipImage) {
            const imgPath = `images/characters/${characterFolder}/ships/${shipImage}`;
            
            // Create ship image overlay
            const shipImg = document.createElement('img');
            shipImg.src = imgPath;
            shipImg.className = 'ship-overlay';
            shipImg.dataset.shipName = ship.name;
            shipImg.draggable = true;
            
            // Calculate position and size based on grid cell size
            const cellSize = 100 / GRID_SIZE; // percentage
            shipImg.style.position = 'absolute';
            
            if (isHorizontal) {
                // Horizontal ship
                shipImg.style.left = `${firstCell.col * cellSize}%`;
                shipImg.style.top = `${firstCell.row * cellSize}%`;
                shipImg.style.width = `${ship.size * cellSize}%`;
                shipImg.style.height = `${cellSize}%`;
                shipImg.style.transform = 'none';
            } else {
                // Vertical ship - rotate 90 degrees around center
                const shipLength = ship.size * cellSize;
                const centerRow = firstCell.row + (ship.size / 2);
                const centerCol = firstCell.col + 0.5;
                
                shipImg.style.left = `${centerCol * cellSize}%`;
                shipImg.style.top = `${centerRow * cellSize}%`;
                shipImg.style.width = `${shipLength}%`;
                shipImg.style.height = `${cellSize}%`;
                shipImg.style.transform = 'translate(-50%, -50%) rotate(90deg)';
                shipImg.style.transformOrigin = 'center center';
            }
            
            shipImg.style.pointerEvents = 'none'; // Let clicks go through to cells
            shipImg.style.zIndex = '10';
            shipImg.style.objectFit = 'contain';
            
            board.appendChild(shipImg);
        }
    });

    // Add drag start handler for cells
    board.querySelectorAll('.cell.ship').forEach(cell => {
        cell.addEventListener('dragstart', (e) => {
            const shipName = cell.dataset.shipName;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('shipName', shipName);
            gameState.placementMode.draggedShip = shipName;
            
            // Pickup ship
            const ship = gameState.myShips.find(s => s.name === shipName);
            if (ship) {
                ship.cells.forEach(c => {
                    const dragCell = document.querySelector(`[data-row="${c.row}"][data-col="${c.col}"]`);
                    if (dragCell) dragCell.classList.add('dragging');
                });
                // Hide ship image overlay during drag
                const shipImgOverlay = board.querySelector(`.ship-overlay[data-ship-name="${shipName}"]`);
                if (shipImgOverlay) shipImgOverlay.style.opacity = '0.3';
            }
        });
        
        cell.addEventListener('dragend', (e) => {
            // Remove dragging class
            document.querySelectorAll('.cell.dragging').forEach(c => {
                c.classList.remove('dragging');
            });
            // Restore ship image overlay
            document.querySelectorAll('.ship-overlay').forEach(img => {
                img.style.opacity = '1';
            });
            clearPreview();
            gameState.placementMode.draggedShip = null;
        });
    });
}

// Preview tàu khi drag
function previewShipDrag(row, col, ship) {
    clearPreview();
    
    // Tìm orientation hiện tại
    const existingShip = gameState.myShips.find(s => s.name === ship.name);
    let isHorizontal = true;
    if (existingShip && existingShip.cells.length > 1) {
        isHorizontal = existingShip.cells[0].row === existingShip.cells[1].row;
    }
    
    const isValid = canPlaceShipIgnoringSelf(ship, row, col, isHorizontal);
    
    for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const cell = document.querySelector(`#placementBoard .cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add(isValid ? 'placement-valid' : 'placement-invalid');
            }
        }
    }
}

// Check có thể đặt không (ignore tàu đang kéo)
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

// Handle drop event
function handleDrop(e) {
    e.preventDefault();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const shipName = e.dataTransfer.getData('shipName');
    
    if (shipName && !isNaN(row) && !isNaN(col)) {
        // Lưu vị trí cũ trước khi remove
        const oldShipData = saveShipPosition(shipName);
        
        // Remove tàu khỏi vị trí cũ
        removeShipFromBoard(shipName);
        
        // Place ship vào vị trí mới
        const shipConfig = SHIPS.find(s => s.name === shipName);
        
        // Tìm hướng cũ
        let orientation = true;
        if (oldShipData && oldShipData.cells.length > 1) {
            orientation = oldShipData.cells[0].row === oldShipData.cells[1].row;
        }
        
        // Thử đặt, nếu không được thì restore
        const success = tryPlaceShipAt(shipConfig, row, col, orientation, oldShipData);
        
        if (!success) {
            // Restore vị trí cũ
            restoreShipPosition(oldShipData);
        }
    }
    
    clearPreview();
    renderPlacementBoard();
}

// Save ship position trước khi remove
function saveShipPosition(shipName) {
    const shipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (shipIndex > -1) {
        // Clone deep để lưu vị trí cũ
        return JSON.parse(JSON.stringify(gameState.myShips[shipIndex]));
    }
    return null;
}

// Restore ship về vị trí cũ
function restoreShipPosition(oldShipData) {
    if (!oldShipData) return;
    
    // Đặt lại tàu vào board
    oldShipData.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = oldShipData.name;
    });
    
    // Add lại vào myShips
    gameState.myShips.push(oldShipData);
    
    // Add lại vào placedShips
    if (!gameState.placementMode.placedShips.includes(oldShipData.name)) {
        gameState.placementMode.placedShips.push(oldShipData.name);
    }
}

// Remove tàu khỏi board
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

// Try place tàu tại vị trí
function tryPlaceShipAt(ship, row, col, isHorizontal, oldShipData = null) {
    if (!canPlaceShipIgnoringSelf(ship, row, col, isHorizontal)) {
        showNotification(`Không thể đặt ${ship.name} ở đây!`, 'warning');
        // KHÔNG random nữa, return false để caller restore
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
        cells: shipCells
    });
    
    gameState.placementMode.placedShips.push(ship.name);
    return true;
}

// Clear all preview highlights
function clearPreview() {
    document.querySelectorAll('#placementBoard .cell').forEach(cell => {
        cell.classList.remove('placement-valid', 'placement-invalid');
    });
}

// previewShipPlacement thay bằng previewShipDrag

function canPlaceShip(ship, row, col, isHorizontal) {
    for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;

        // Check ra ngoài grid
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }

        // Check ô đã có tàu
        if (gameState.myBoard[r][c] !== null) {
            return false;
        }
    }
    return true;
}

function placeShip(row, col) {
    const ship = gameState.placementMode.currentShip;
    if (!ship) {
        showNotification('Hãy chọn một chiếc tàu trước!', 'warning');
        return;
    }

    const isHorizontal = gameState.placementMode.isHorizontal;

    if (!canPlaceShip(ship, row, col, isHorizontal)) {
        showNotification('Không thể đặt tàu ở đây!', 'error');
        return;
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
        cells: shipCells
    });

    gameState.placementMode.placedShips.push(ship.name);
    gameState.placementMode.currentShip = null;

    renderShipsList();
    renderPlacementBoard();

    if (gameState.placementMode.placedShips.length === SHIPS.length) {
        document.getElementById('readyBtn').disabled = false;
        showNotification('Đã đặt xong tất cả tàu! Nhấn Sẵn Sàng!', 'success');
    }
}

function placeShipsRandomly() {
    console.log('[Placement] 🎲 Placing ships randomly...');
    
    // Reset
    gameState.myBoard = createEmptyBoard();
    gameState.myShips = [];
    gameState.placementMode.placedShips = [];

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
    renderPlacementBoard();
    
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = false;
    }
}

function updatePlacementPreview() {
    // Just re-render to clear old previews
    renderPlacementBoard();
}

// Initialize character carousel when character selection screen is shown
function initCharacterSelectionUI() {
    // Wait for DOM to be ready
    setTimeout(() => {
        if (typeof CHARACTERS !== 'undefined' && document.getElementById('characterSelectionBar')) {
            console.log('[Game.js] Initializing character carousel UI...');
            
            const bar = document.getElementById('characterSelectionBar');
            if (bar && bar.children.length === 0) {
                // Initialize carousel with thumbnails
                CHARACTERS.forEach((char, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = 'char-thumb' + (index === 0 ? ' active' : '');
                    thumb.innerHTML = `
                        <img src="${char.thumb}" alt="${char.displayName}">
                        <span class="char-thumb-name">${char.displayName}</span>
                    `;
                    
                    // Click handler for UI-only character switch
                    thumb.addEventListener('click', () => {
                        if (typeof switchCharacter === 'function') {
                            switchCharacter(index);
                        }
                    });
                    
                    bar.appendChild(thumb);
                });
                
                // Initialize first character preview
                if (typeof updateCharacterPreview === 'function') {
                    updateCharacterPreview();
                }
            }
        }
    }, 100);
}

// ============ HERO CHARACTER SWITCHER (UI-only cosmetic) ============
const HERO_CHARACTERS = [
    { 
        id: 0, 
        name: 'Captain Morgan', 
        image: 'images/characters/character1/avatar-large.png',
        thumb: 'images/characters/character1/avatar-thumb.png'
    },
    { 
        id: 1, 
        name: 'Admiral Blake', 
        image: 'images/characters/character2/avatar-large.png',
        thumb: 'images/characters/character2/avatar-thumb.png'
    },
    { 
        id: 2, 
        name: 'Commander Storm', 
        image: 'images/characters/character3/avatar-large.png',
        thumb: 'images/characters/character3/avatar-thumb.png'
    }
];

let selectedCharacterIdx = 0;

function initHeroCharacterSwitcher() {
    const heroCharacterImg = document.getElementById('heroCharacterImg');
    const heroCharacterName = document.getElementById('heroCharacterName');
    const thumbnails = document.querySelectorAll('.hub__thumb');

    if (!heroCharacterImg || !heroCharacterName || thumbnails.length === 0) {
        return; // Elements not found, skip
    }

    // Add click handlers to thumbnails
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            selectedCharacterIdx = index;
            updateHeroCharacter();
        });
    });

    // Initial update
    updateHeroCharacter();
}

function updateHeroCharacter() {
    const heroCharacterImg = document.getElementById('heroCharacterImg');
    const heroCharacterName = document.getElementById('heroCharacterName');
    const thumbnails = document.querySelectorAll('.hub__thumb');

    if (!heroCharacterImg || !heroCharacterName) {
        return;
    }

    const selected = HERO_CHARACTERS[selectedCharacterIdx];

    // Update main image with fade effect
    heroCharacterImg.style.opacity = '0';
    setTimeout(() => {
        heroCharacterImg.src = selected.image;
        heroCharacterImg.style.opacity = '1';
    }, 200);

    // Update name
    heroCharacterName.textContent = selected.name;

    // Update active thumbnail
    thumbnails.forEach((thumb, index) => {
        if (index === selectedCharacterIdx) {
            thumb.classList.add('hub__thumb--active');
        } else {
            thumb.classList.remove('hub__thumb--active');
        }
    });
}

// Continue in next file due to length...

