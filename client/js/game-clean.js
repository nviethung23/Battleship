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
    timerInterval: null
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

    // Setup event listeners
    setupEventListeners(socket);
    
    // Setup socket handlers
    setupSocketHandlers(socket);

    // Show placement screen (game starts from deployment phase)
    showPlacementScreen();
});

// ============ EVENT LISTENERS ============
function setupEventListeners(socket) {
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
                sendPlayerReady(socket, gameState.myShips, gameState.myBoard);
                SocketShared.showNotification('Đã sẵn sàng! Đang chờ đối thủ...', 'success');
                readyBtn.disabled = true;
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
    // Player ready update (during deployment)
    socket.on('player_ready_update', (data) => {
        console.log('[Game] Player ready update:', data);
        updatePlayerReadyStatus(data);
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
        handleAttackResult(data);
    });

    // Turn changed
    socket.on('turn_changed', (data) => {
        console.log('[Game] Turn changed:', data);
        handleTurnChanged(data);
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
}

// ============ HELPER FUNCTIONS ============
function createEmptyBoard() {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function backToHub() {
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
        timerInterval: null
    };
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // Clear room state
    BattleshipState.clearRoomState();
    
    // Redirect to hub
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
            console.warn('[Game] No room data found, using defaults');
            return;
        }
        
        const roomData = JSON.parse(gameRoomData);
        const currentUserId = BattleshipState.getUserId();
        
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

function updatePlayerReadyStatus(data) {
    // Update deploy screen opponent status
    const currentUserId = BattleshipState.getUserId();
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

    // Auto place all ships randomly
    placeShipsRandomly();
    
    renderPlacementBoard();
    
    // Ready button enabled because ships are pre-placed
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

// ============ DEPLOYMENT TIMER ============
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
    SocketShared.showNotification('Hết thời gian! Không thể thay đổi vị trí tàu.', 'warning');
}

function stopDeploymentTimer() {
    if (deploymentTimerInterval) {
        clearInterval(deploymentTimerInterval);
        deploymentTimerInterval = null;
    }
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
function rotateShipOnBoard(shipName) {
    // Find ship
    const shipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (shipIndex === -1) return;

    const ship = gameState.myShips[shipIndex];
    const firstCell = ship.cells[0];
    
    // Determine current orientation
    const isHorizontal = ship.cells.length > 1 && ship.cells[0].row === ship.cells[1].row;
    const newOrientation = !isHorizontal;
    
    // Temporarily remove ship from board
    ship.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = null;
    });
    
    // Try to place with new orientation
    const shipConfig = SHIPS.find(s => s.name === shipName);
    
    // Check if can place
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
        // Can rotate - place with new orientation
        const newCells = [];
        for (let i = 0; i < shipConfig.size; i++) {
            const r = newOrientation ? firstCell.row : firstCell.row + i;
            const c = newOrientation ? firstCell.col + i : firstCell.col;
            gameState.myBoard[r][c] = shipName;
            newCells.push({ row: r, col: c });
        }
        ship.cells = newCells;
        
        SocketShared.showNotification(`Đã xoay ${shipName}! 🔄`, 'success');
    } else {
        // Cannot rotate - restore old position
        ship.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = shipName;
        });
        
        SocketShared.showNotification(`Không thể xoay ${shipName} ở vị trí này!`, 'warning');
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
                    rotateShipOnBoard(shipAtCell);
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
        cells: shipCells
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

function sendPlayerReady(socket, ships, board) {
    console.log('[Game] Sending player ready...');
    const roomCode = BattleshipState.getRoomCode();
    
    if (!roomCode) {
        console.error('[Game] No room code found!');
        SocketShared.showNotification('Lỗi: Không tìm thấy phòng!', 'error');
        return;
    }
    
    socket.emit('player_ready', {
        roomId: roomCode,
        ships: ships,
        board: board
    });
}

// ============ GAME PLAY FUNCTIONS ============
// TODO: Implement startGame, handleAttackResult, handleTurnChanged, etc.
function startGame(data) {
    console.log('[Game] Starting game with data:', data);
    stopDeploymentTimer();
    showGameScreen();
    
    // TODO: Initialize game board, set turns, etc.
    SocketShared.showNotification('Game Started!', 'success');
}

function handleAttackResult(data) {
    // TODO: Implement attack result handling
}

function handleTurnChanged(data) {
    // TODO: Implement turn change handling
}

function handleTurnContinue(data) {
    // TODO: Implement turn continue handling
}

function handleGameOver(data) {
    // TODO: Implement game over handling
    showGameOverScreen();
}

function handlePlayerDisconnected(data) {
    // TODO: Implement player disconnect handling
    SocketShared.showNotification('Đối thủ đã ngắt kết nối!', 'warning');
}
