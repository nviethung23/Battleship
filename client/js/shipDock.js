/**
 * Ship Dock Module - Handles draggable ship inventory and drag & drop placement
 * Implements grid-snapped drag & drop with ghost preview
 */

// Ship dock state
const shipDockState = {
    ships: [
        { id: 'carrier', name: 'Carrier', size: 5, label: 'Tàu sân bay', placed: false },
        { id: 'battleship', name: 'Battleship', size: 4, label: 'Tàu chiến', placed: false },
        { id: 'cruiser', name: 'Cruiser', size: 3, label: 'Tàu tuần dương', placed: false },
        { id: 'submarine', name: 'Submarine', size: 3, label: 'Tàu ngầm', placed: false },
        { id: 'destroyer', name: 'Destroyer', size: 2, label: 'Tàu khu trục', placed: false }
    ],
    currentDrag: null,
    ghostElement: null,
    ghostFrame: null,
    ghostPending: null,
    ghostRow: null,
    ghostCol: null,
    isHorizontal: true,
    characterFolder: 'character1'
};

// Ship image mapping
const SHIP_IMAGE_MAP = {
    'Carrier': 'carrier.png',
    'Battleship': 'battleship.png',
    'Cruiser': 'cruiser.png',
    'Submarine': 'submarine.png',
    'Destroyer': 'destroyer.png'
};

// Ship image dimensions (width x height in pixels)
const SHIP_IMAGE_DIMENSIONS = {
    'Carrier': { width: 50, height: 250 },      // 5 cells
    'Battleship': { width: 50, height: 200 },   // 4 cells
    'Cruiser': { width: 50, height: 150 },      // 3 cells
    'Submarine': { width: 50, height: 150 },    // 3 cells
    'Destroyer': { width: 50, height: 100 }     // 2 cells
};

function getShipSizeByName(shipName, fallbackShip = null) {
    if (typeof SHIPS !== 'undefined' && Array.isArray(SHIPS)) {
        const config = SHIPS.find(s => s.name === shipName);
        if (config && config.size) return config.size;
    }

    const dockShip = shipDockState.ships.find(s => s.name === shipName);
    if (dockShip && dockShip.size) return dockShip.size;

    if (fallbackShip?.size) return fallbackShip.size;
    if (Array.isArray(fallbackShip?.cells) && fallbackShip.cells.length) {
        return fallbackShip.cells.length;
    }

    return 1;
}

// Initialize ship dock
function initShipDock(characterIndex = 0) {
    // console.log('[ShipDock] Initializing ship dock...');
    
    shipDockState.characterFolder = `character${characterIndex + 1}`;
    
    renderShipDock();
    setupDockEventListeners();
    
    // console.log('[ShipDock] Ship dock initialized');
}

// Render ship dock HTML
function renderShipDock() {
    const dockShips = document.getElementById('dockShips');
    if (!dockShips) return;
    
    dockShips.innerHTML = '';
    
    shipDockState.ships.forEach(ship => {
        const shipEl = document.createElement('div');
        shipEl.className = `dock-ship ${ship.placed ? 'placed' : ''}`;
        shipEl.dataset.shipId = ship.id;
        shipEl.dataset.shipName = ship.name;
        shipEl.dataset.shipSize = ship.size;
        shipEl.draggable = !ship.placed;
        
        const imgPath = `images/characters/${shipDockState.characterFolder}/ships/${SHIP_IMAGE_MAP[ship.name]}`;
        
        shipEl.innerHTML = `
            <div class="dock-ship-image">
                <img src="${imgPath}" alt="${ship.name}">
            </div>
            <div class="dock-ship-label">${ship.label}</div>
            <div class="dock-ship-size">${ship.size} ô</div>
        `;
        
        dockShips.appendChild(shipEl);
    });
    
    updatePlacedCount();
}

// Update placed ships counter
function updatePlacedCount() {
    const placedCount = shipDockState.ships.filter(s => s.placed).length;
    const placedEl = document.getElementById('placedCount');
    if (placedEl) {
        placedEl.textContent = placedCount;
    }
    
    // Enable/disable ready button
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = placedCount !== 5;
    }
    
    // Enable/disable reset button
    const resetBtn = document.getElementById('resetShipsBtn');
    if (resetBtn) {
        resetBtn.disabled = placedCount === 0;
    }
}

// Setup event listeners for dock
function setupDockEventListeners() {
    const dockShips = document.getElementById('dockShips');
    const board = document.getElementById('placementBoard');
    const resetBtn = document.getElementById('resetShipsBtn');
    
    if (!dockShips || !board) return;
    
    // Drag start from dock
    dockShips.addEventListener('dragstart', handleDockDragStart);
    dockShips.addEventListener('dragend', handleDockDragEnd);
    
    // Board drag events
    board.addEventListener('dragover', handleBoardDragOver);
    board.addEventListener('dragleave', handleBoardDragLeave);
    board.addEventListener('drop', handleBoardDrop);
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetShips);
    }
    
    // Keyboard rotation during drag
    document.addEventListener('keydown', handleDragRotation);
}

// Handle drag start from dock
function handleDockDragStart(e) {
    const shipEl = e.target.closest('.dock-ship');
    if (!shipEl || shipEl.classList.contains('placed')) return;
    
    const shipId = shipEl.dataset.shipId;
    const shipName = shipEl.dataset.shipName;
    const shipSize = parseInt(shipEl.dataset.shipSize);
    
    shipDockState.currentDrag = {
        shipId,
        shipName,
        shipSize,
        sourceElement: shipEl
    };
    
    shipDockState.isHorizontal = true; // Default horizontal
    
    shipEl.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shipId);
    
    // console.log('[ShipDock] Drag started:', shipName);
}

// Handle drag end
function handleDockDragEnd(e) {
    const shipEl = e.target.closest('.dock-ship');
    if (shipEl) {
        shipEl.classList.remove('dragging');
    }
    
    clearDragState();
}

// Handle drag over board - show ghost preview with STRICT GRID SNAP
function handleBoardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if dragging from BOARD (repositioning existing ship)
    if (typeof gameState !== 'undefined' && gameState?.placementMode?.draggedShip) {
        const draggedName = gameState.placementMode.draggedShip;
        
        // Setup drag state for repositioning
        if (!shipDockState.currentDrag || shipDockState.currentDrag.shipName !== draggedName) {
            setDragFromBoard(draggedName);
        } else {
            const ship = gameState.myShips?.find(s => s.name === draggedName);
            const resolvedSize = getShipSizeByName(draggedName, ship);
            if (resolvedSize && shipDockState.currentDrag.shipSize !== resolvedSize) {
                shipDockState.currentDrag.shipSize = resolvedSize;
            }
        }
    }

    if (!shipDockState.currentDrag) return;
    
    const board = document.getElementById('placementBoard');
    const rect = board.getBoundingClientRect();
    const cellSize = getCellSize();
    
    // Calculate grid position from mouse with STRICT INTEGER ROUNDING
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    // Use Math.round for nearest cell, then clamp to valid range
    let col = Math.round(relX / cellSize);
    let row = Math.round(relY / cellSize);
    
    // Clamp to grid bounds [0, 9]
    col = Math.max(0, Math.min(GRID_SIZE - 1, col));
    row = Math.max(0, Math.min(GRID_SIZE - 1, row));
    
    // For vertical ships, ensure they don't go off bottom
    if (!shipDockState.isHorizontal) {
        const maxRow = GRID_SIZE - shipDockState.currentDrag.shipSize;
        row = Math.max(0, Math.min(maxRow, row));
    } else {
        // For horizontal ships, ensure they don't go off right edge
        const maxCol = GRID_SIZE - shipDockState.currentDrag.shipSize;
        col = Math.max(0, Math.min(maxCol, col));
    }
    
    // If repositioning, temporarily clear old position to check collision
    let oldShipCells = null;
    if (gameState?.placementMode?.draggedShip) {
        const draggedShip = gameState.myShips.find(s => s.name === gameState.placementMode.draggedShip);
        if (draggedShip) {
            oldShipCells = [...draggedShip.cells]; // Save old cells
            // Temporarily clear old position
            draggedShip.cells.forEach(cell => {
                gameState.myBoard[cell.row][cell.col] = null;
            });
        }
    }
    
    // Check if placement is valid
    const isValid = canPlaceShipAt(
        shipDockState.currentDrag.shipSize,
        row,
        col,
        shipDockState.isHorizontal
    );
    
    // Restore old position if repositioning
    if (oldShipCells) {
        const draggedShip = gameState.myShips.find(s => s.name === gameState.placementMode.draggedShip);
        if (draggedShip) {
            oldShipCells.forEach(cell => {
                gameState.myBoard[cell.row][cell.col] = draggedShip.name;
            });
        }
    }
    
    // Show ghost preview at SNAPPED integer position
    showGhostPreview(row, col, isValid);
}

// Handle drag leave board
function handleBoardDragLeave(e) {
    // Only remove if truly leaving the board
    const board = document.getElementById('placementBoard');
    if (e.target === board) {
        removeGhostPreview();
    }
}

// Handle drop on board with STRICT INTEGER POSITIONING
function handleBoardDrop(e) {
    e.preventDefault();
    
    // Check if dragging from BOARD (repositioning) or from DOCK (new placement)
    const draggedShipName = e.dataTransfer.getData('text/plain');
    
    // If dragging from board (ship already placed)
    if (gameState.placementMode.draggedShip) {
        handleShipRepositioning(e, gameState.placementMode.draggedShip);
        gameState.placementMode.draggedShip = null;
        return;
    }
    
    // Otherwise, handle normal dock drag
    if (!shipDockState.currentDrag) return;
    
    const board = document.getElementById('placementBoard');
    const rect = board.getBoundingClientRect();
    const cellSize = getCellSize();
    
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    // Use Math.round for nearest cell snap
    let col = Math.round(relX / cellSize);
    let row = Math.round(relY / cellSize);
    
    // Clamp to valid range
    col = Math.max(0, Math.min(GRID_SIZE - 1, col));
    row = Math.max(0, Math.min(GRID_SIZE - 1, row));
    
    // Adjust for ship bounds
    if (!shipDockState.isHorizontal) {
        const maxRow = GRID_SIZE - shipDockState.currentDrag.shipSize;
        row = Math.max(0, Math.min(maxRow, row));
    } else {
        const maxCol = GRID_SIZE - shipDockState.currentDrag.shipSize;
        col = Math.max(0, Math.min(maxCol, col));
    }
    
    const { shipName, shipSize, shipId } = shipDockState.currentDrag;
    
    // Validate placement
    if (!canPlaceShipAt(shipSize, row, col, shipDockState.isHorizontal)) {
        // console.log('[ShipDock] Invalid placement');
        SocketShared.showNotification('Không thể đặt tàu ở vị trí này!', 'warning');
        removeGhostPreview();
        return;
    }
    
    // CRITICAL: Check if this ship is already placed - prevent duplicates
    const existingShipIndex = gameState.myShips.findIndex(s => s.name === shipName);
    if (existingShipIndex !== -1) {
        // Remove old placement from board
        const oldShip = gameState.myShips[existingShipIndex];
        oldShip.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = null;
        });
        gameState.myShips.splice(existingShipIndex, 1);
        // console.log('[ShipDock] ⚠️ Removed duplicate ship:', shipName);
    }
    
    // Place ship on board
    const shipCells = [];
    for (let i = 0; i < shipSize; i++) {
        const r = shipDockState.isHorizontal ? row : row + i;
        const c = shipDockState.isHorizontal ? col + i : col;
        gameState.myBoard[r][c] = shipName;
        shipCells.push({ row: r, col: c });
    }
    
    gameState.myShips.push({
        name: shipName,
        size: shipSize,
        cells: shipCells
    });
    
    // Mark ship as placed in dock
    const ship = shipDockState.ships.find(s => s.id === shipId);
    if (ship) {
        ship.placed = true;
    }
    
    // Update placedShips tracking
    if (!gameState.placementMode.placedShips.includes(shipName)) {
        gameState.placementMode.placedShips.push(shipName);
    }
    
    // console.log('[ShipDock] ✓ Placed ship:', shipName, 'at row', row, 'col', col, shipDockState.isHorizontal ? '(H)' : '(V)');
    
    // Update UI
    removeGhostPreview();
    renderShipDock();
    renderPlacementBoard();
    
    SocketShared.showNotification(`Đã đặt ${ship.label}! ⚓`, 'success');
}

// Show ghost preview with INTEGER positioning only - SMOOTH COLORED OVERLAY
function showGhostPreview(row, col, isValid) {
    shipDockState.ghostPending = { row, col, isValid };
    if (shipDockState.ghostFrame) return;

    shipDockState.ghostFrame = requestAnimationFrame(() => {
        shipDockState.ghostFrame = null;
        if (!shipDockState.ghostPending) return;
        const { row: nextRow, col: nextCol, isValid: nextValid } = shipDockState.ghostPending;
        shipDockState.ghostPending = null;
        renderGhostPreview(nextRow, nextCol, nextValid);
    });
}

function renderGhostPreview(row, col, isValid) {
    const board = document.getElementById('placementBoard');
    if (!board) return;

    if (!shipDockState.currentDrag) return;

    const cellSize = getCellSize();
    const { shipSize, shipName } = shipDockState.currentDrag;
    const isHorizontal = shipDockState.isHorizontal;

    let ghostContainer = shipDockState.ghostElement;
    const ghostKey = `${shipSize}-${isHorizontal}-${cellSize}`;

    // Recreate ghost if orientation or size changed
    if (!ghostContainer || ghostContainer.dataset.key !== ghostKey) {
        removeGhostPreview();

        ghostContainer = document.createElement('div');
        ghostContainer.className = 'ship-ghost-container';
        ghostContainer.style.position = 'absolute';
        ghostContainer.style.pointerEvents = 'none';
        ghostContainer.style.zIndex = '100';
        ghostContainer.dataset.key = ghostKey;

        // Create ONE ship image (not segments)
        const imgPath = `images/characters/${shipDockState.characterFolder}/ships/${SHIP_IMAGE_MAP[shipName]}`;
        const img = document.createElement('img');
        img.src = imgPath;
        img.className = 'ghost-ship-image';
        img.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        
        ghostContainer.appendChild(img);
        board.appendChild(ghostContainer);
        shipDockState.ghostElement = ghostContainer;
    }

    // Update valid/invalid state
    ghostContainer.classList.toggle('valid', isValid);
    ghostContainer.classList.toggle('invalid', !isValid);

    // Calculate position based on grid
    const x = col * cellSize;
    const y = row * cellSize;
    
    // Get actual image dimensions for this ship
    const imgDimensions = SHIP_IMAGE_DIMENSIONS[shipName] || { width: 50, height: 200 };
    
    // Calculate container size based on orientation
    // HORIZONTAL: Container = shipSize cells wide × 1 cell tall
    // VERTICAL: Container = 1 cell wide × shipSize cells tall
    // BUT when image rotates 90deg, its width/height swap!
    
    let containerWidth, containerHeight;
    if (isHorizontal) {
        // Horizontal ship: stretched across multiple cells
        containerWidth = shipSize * cellSize;
        containerHeight = cellSize;
    } else {
        // Vertical ship: stretched down multiple cells
        // Image will rotate 90deg, so we need to account for aspect ratio
        containerWidth = cellSize;
        containerHeight = shipSize * cellSize;
    }

    // Position and size the ghost container to match grid cells
    ghostContainer.style.left = `${x}px`;
    ghostContainer.style.top = `${y}px`;
    ghostContainer.style.width = `${containerWidth}px`;
    ghostContainer.style.height = `${containerHeight}px`;
    ghostContainer.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

    // Rotate image for vertical orientation
    const img = ghostContainer.querySelector('.ghost-ship-image');
    if (img) {
        // When vertical, rotate 90deg - the image will fit inside rotated space
        img.style.transform = isHorizontal ? 'rotate(0deg)' : 'rotate(90deg)';
        img.style.opacity = isValid ? '0.8' : '0.5';
        img.style.filter = isValid 
            ? 'brightness(1.3) saturate(1.5) drop-shadow(0 0 10px rgba(40, 200, 80, 0.8))'
            : 'brightness(1.1) saturate(1.2) grayscale(0.3) drop-shadow(0 0 10px rgba(255, 50, 50, 0.8))';
    }

    shipDockState.ghostRow = row;
    shipDockState.ghostCol = col;
}

// Remove ghost preview
function removeGhostPreview() {
    if (shipDockState.ghostElement) {
        shipDockState.ghostElement.remove();
        shipDockState.ghostElement = null;
    }
    shipDockState.ghostPending = null;
    shipDockState.ghostRow = null;
    shipDockState.ghostCol = null;
    if (shipDockState.ghostFrame) {
        cancelAnimationFrame(shipDockState.ghostFrame);
        shipDockState.ghostFrame = null;
    }
}

// Handle rotation during drag (R key) - SMOOTH WITH AUTO-ADJUSTMENT
function handleDragRotation(e) {
    if ((e.key === 'r' || e.key === 'R') && shipDockState.currentDrag) {
        e.preventDefault();
        
        // Toggle orientation
        shipDockState.isHorizontal = !shipDockState.isHorizontal;
        
        // Get current ghost position
        let row = shipDockState.ghostRow;
        let col = shipDockState.ghostCol;
        
        if (row === null || col === null) return;
        
        const shipSize = shipDockState.currentDrag.shipSize;
        
        // SMART POSITION ADJUSTMENT: Find nearest valid position after rotation
        let adjustedRow = row;
        let adjustedCol = col;
        
        if (!shipDockState.isHorizontal) {
            // Rotating to VERTICAL
            // Check if ship will go off bottom edge
            if (row + shipSize > GRID_SIZE) {
                // Move ship up to fit
                adjustedRow = GRID_SIZE - shipSize;
            }
            // Check horizontal bounds (should stay within)
            if (col < 0) adjustedCol = 0;
            if (col >= GRID_SIZE) adjustedCol = GRID_SIZE - 1;
        } else {
            // Rotating to HORIZONTAL
            // Check if ship will go off right edge
            if (col + shipSize > GRID_SIZE) {
                // Move ship left to fit
                adjustedCol = GRID_SIZE - shipSize;
            }
            // Check vertical bounds (should stay within)
            if (row < 0) adjustedRow = 0;
            if (row >= GRID_SIZE) adjustedRow = GRID_SIZE - 1;
        }
        
        // If adjusted position has collision, try nearby positions
        let finalRow = adjustedRow;
        let finalCol = adjustedCol;
        let foundValid = canPlaceShipAt(shipSize, adjustedRow, adjustedCol, shipDockState.isHorizontal);
        
        if (!foundValid) {
            // Try nearby positions in a spiral pattern
            const searchRadius = 3;
            for (let radius = 1; radius <= searchRadius && !foundValid; radius++) {
                // Try positions around the adjusted position
                const offsets = [
                    [0, -radius], [0, radius],  // Up, Down
                    [-radius, 0], [radius, 0],  // Left, Right
                    [-radius, -radius], [-radius, radius], [radius, -radius], [radius, radius] // Diagonals
                ];
                
                for (const [dr, dc] of offsets) {
                    const testRow = adjustedRow + dr;
                    const testCol = adjustedCol + dc;
                    
                    // Ensure within bounds for new orientation
                    if (testRow < 0 || testCol < 0) continue;
                    if (!shipDockState.isHorizontal && testRow + shipSize > GRID_SIZE) continue;
                    if (shipDockState.isHorizontal && testCol + shipSize > GRID_SIZE) continue;
                    if (testRow >= GRID_SIZE || testCol >= GRID_SIZE) continue;
                    
                    if (canPlaceShipAt(shipSize, testRow, testCol, shipDockState.isHorizontal)) {
                        finalRow = testRow;
                        finalCol = testCol;
                        foundValid = true;
                        break;
                    }
                }
            }
        }
        
        // Update ghost preview with smooth transition
        const isValid = foundValid;
        showGhostPreview(finalRow, finalCol, isValid);
        
        // console.log('[ShipDock] Rotated to:', shipDockState.isHorizontal ? 'horizontal' : 'vertical', 
        //            'Position adjusted to:', finalRow, finalCol, 'Valid:', isValid);
    }
}

// Reset all ships
function handleResetShips() {
    // console.log('[ShipDock] Resetting all ships...');
    
    // Clear board
    gameState.myBoard = createEmptyBoard();
    gameState.myShips = [];
    gameState.placementMode.placedShips = [];
    
    // Reset dock state
    shipDockState.ships.forEach(ship => {
        ship.placed = false;
    });
    
    // Update UI
    renderShipDock();
    renderPlacementBoard();
    
    SocketShared.showNotification('Đã reset tất cả tàu!', 'info');
}

// Helper: Check if can place ship
function canPlaceShipAt(shipSize, row, col, isHorizontal) {
    for (let i = 0; i < shipSize; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        
        // Check bounds
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            return false;
        }
        
        // Check collision
        if (gameState.myBoard[r][c] !== null) {
            return false;
        }
    }
    
    return true;
}

// Handle repositioning ship already on board
function handleShipRepositioning(e, shipName) {
    const board = document.getElementById('placementBoard');
    const rect = board.getBoundingClientRect();
    const cellSize = getCellSize();
    
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    // Use Math.round for nearest cell snap
    let col = Math.round(relX / cellSize);
    let row = Math.round(relY / cellSize);
    
    // Clamp to valid range
    col = Math.max(0, Math.min(GRID_SIZE - 1, col));
    row = Math.max(0, Math.min(GRID_SIZE - 1, row));
    
    // Find ship in gameState
    const ship = gameState.myShips.find(s => s.name === shipName);
    if (!ship) {
        removeGhostPreview();
        return;
    }
    
    // Determine current orientation
    const isHorizontal = ship.cells.length > 1 ? 
        (ship.cells[0].row === ship.cells[1].row) : true;
    
    const shipSize = ship.size;
    
    // Adjust for ship bounds
    if (!isHorizontal) {
        const maxRow = GRID_SIZE - shipSize;
        row = Math.max(0, Math.min(maxRow, row));
    } else {
        const maxCol = GRID_SIZE - shipSize;
        col = Math.max(0, Math.min(maxCol, col));
    }
    
    // Clear old position temporarily to check placement
    ship.cells.forEach(cell => {
        gameState.myBoard[cell.row][cell.col] = null;
    });
    
    // Validate new placement
    const isValid = canPlaceShipAt(shipSize, row, col, isHorizontal);
    
    if (!isValid) {
        // Restore old position
        ship.cells.forEach(cell => {
            gameState.myBoard[cell.row][cell.col] = shipName;
        });
        SocketShared.showNotification('Không thể đặt tàu ở vị trí này!', 'warning');
        renderPlacementBoard();
        removeGhostPreview();
        return;
    }
    
    // Place ship at new position
    const newCells = [];
    for (let i = 0; i < shipSize; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        gameState.myBoard[r][c] = shipName;
        newCells.push({ row: r, col: c });
    }
    
    // Update ship cells
    ship.cells = newCells;
    
    // Re-render and remove ghost
    renderPlacementBoard();
    removeGhostPreview();
    
    SocketShared.showNotification(`Đã di chuyển ${shipName}!`, 'success');
}

function setDragFromBoard(shipName) {
    const ship = gameState.myShips.find(s => s.name === shipName);
    if (!ship) return;

    const dockShip = shipDockState.ships.find(s => s.name === shipName);
    shipDockState.currentDrag = {
        shipId: dockShip ? dockShip.id : shipName.toLowerCase(),
        shipName: ship.name,
        shipSize: getShipSizeByName(ship.name, ship),
        sourceElement: null
    };

    shipDockState.isHorizontal = ship.cells.length > 1
        ? ship.cells[0].row === ship.cells[1].row
        : true;
}

function clearDragState() {
    removeGhostPreview();
    shipDockState.currentDrag = null;
}

// Helper: Get cell size based on current board size - returns INTEGER
function getCellSize() {
    const board = document.getElementById('placementBoard');
    if (!board) return 50;

    const cellVar = parseFloat(getComputedStyle(board).getPropertyValue('--cell'));
    if (Number.isFinite(cellVar) && cellVar > 0) {
        return cellVar;
    }

    const boardWidth = parseFloat(window.getComputedStyle(board).width);
    return Math.round(boardWidth / GRID_SIZE); // ALWAYS return integer
}

// Export functions for use in game.js
window.ShipDock = {
    init: initShipDock,
    render: renderShipDock,
    reset: handleResetShips,
    updateCount: updatePlacedCount,
    setDragFromBoard,
    clearDrag: clearDragState,
    getCharacterFolder: () => shipDockState.characterFolder,
    getShips: () => shipDockState.ships,
    lockDock: () => {
        // Lock all ship interactions when ready
        const dockShips = document.getElementById('dockShips');
        if (dockShips) {
            dockShips.style.pointerEvents = 'none';
            dockShips.style.opacity = '0.6';
        }
    }
};
