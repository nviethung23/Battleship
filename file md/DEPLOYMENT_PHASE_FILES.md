# 📋 SHIP PLACEMENT (DEPLOY FLEET) - DANH SÁCH FILES

## 🎯 Tổng quan
Ship Placement phase (Deploy Fleet) là giai đoạn đầu tiên trong game, nơi người chơi đặt các tàu chiến lên bàn cờ.

---

## 📁 CẤU TRÚC FILES

### **1. HTML - Layout & Structure**

#### **File: `client/game.html`**
**Sections liên quan:**

```html
<!-- DEPLOYMENT SCREEN -->
<div id="placementScreen" class="screen">
    <div class="placement-wrapper-hud">
        <!-- HUD Elements -->
        <div class="hud-you-card">...</div>
        <div class="hud-timer-center">...</div>
        <div class="hud-opponent-card">...</div>
        
        <!-- Main Content -->
        <div class="placement-content-center">
            <div class="placement-header">...</div>
            <div class="placement-guide-banner">...</div>
            <div class="placement-board-container">
                <div id="placementBoard">...</div>
            </div>
            <button id="readyBtn">...</button>
        </div>
    </div>
</div>
```

**Element IDs quan trọng:**
- `#placementScreen` - Container chính
- `#placementBoard` - Board game (10x10 grid)
- `#randomPlaceBtn` - Nút random ships
- `#readyBtn` - Nút ready
- `#deploymentTimer` - Timer countdown 120s
- `#deployYourCharacter` - Avatar YOU
- `#deployOpponentCharacter` - Avatar OPPONENT
- `#deployYourName` - Tên YOU
- `#deployOpponentName` - Tên OPPONENT
- `#deployOpponentStatus` - Status OPPONENT

---

### **2. CSS - Styling**

#### **File: `client/css/game.css`**

**Sections liên quan đến Ship Placement:**

##### **A. HUD Layout (Lines ~340-420)**
```css
/* === PLACEMENT SCREEN HUD LAYOUT === */
.placement-wrapper-hud { ... }          /* Main wrapper với gradient background */
.hud-you-card { ... }                   /* YOU card - top-left */
.hud-opponent-card { ... }              /* OPPONENT card - bottom-right */
.hud-timer-center { ... }               /* Timer - top-center */
.timer-label-hud { ... }                /* Timer label "DEPLOYMENT" */
.timer-value-hud { ... }                /* Timer value "02:00" */
.timer-value-hud.warning { ... }        /* Warning state (≤10s) */
@keyframes timer-pulse { ... }          /* Pulse animation cho warning */
```

##### **B. Main Content Area (Lines ~422-513)**
```css
.placement-content-center { ... }       /* Centered content wrapper */

/* Responsive breakpoints */
@media (max-width: 1024px) { ... }
@media (max-width: 768px) { ... }
@media (max-width: 480px) { ... }
```

##### **C. Header & Title (Lines ~524-605)**
```css
.placement-wrapper { ... }
.placement-header { ... }
.deploy-title { ... }
```

##### **D. Guide Banner (Lines ~607-658)**
```css
.placement-guide-banner { ... }         /* Instruction banner */
.placement-guide-banner .guide-icon { ... }
.placement-guide-banner .guide-text { ... }
.placement-guide-banner kbd { ... }     /* Keyboard key styling */
```

##### **E. Character Cards (Lines ~668-795)**
```css
.deploy-character-card { ... }          /* Base card style */
.deploy-character-card:hover { ... }    /* Hover effect */
.deploy-you { ... }                     /* YOU card border */
.deploy-opponent { ... }                /* OPPONENT card border */
.character-badge { ... }                /* Badge "YOU" / "OPPONENT" */
.badge-you { ... }                      /* YOU badge gradient */
.badge-opponent { ... }                 /* OPPONENT badge gradient */
.character-circle { ... }               /* Avatar circle */
.character-avatar { ... }               /* Avatar image */
.character-name { ... }                 /* Player name text */
.character-status { ... }               /* Status badge */
.status-active { ... }                  /* Ready status */
.status-waiting { ... }                 /* Waiting status */
.deploy-opponent.waiting .character-circle { ... }  /* Opacity 50% */
.deploy-opponent.ready .character-circle { ... }    /* Opacity 100% */
```

##### **F. Board Controls (Lines ~799-860)**
```css
.board-controls-top { ... }
.btn-rotate { ... }                     /* Random button */
.btn-rotate:hover { ... }
.btn-rotate .rotate-icon { ... }
.placement-board-container { ... }
.placement-instructions-bottom { ... }
```

##### **G. Board with Labels (Lines ~863-910)**
```css
.board-with-labels { ... }
.board-labels-top { ... }               /* Top labels (1-10) */
.board-labels-top .corner-label { ... }
.board-labels-top .label { ... }
.board-with-side-labels { ... }
.board-labels-left { ... }              /* Left labels (A-J) */
.board-labels-left .label { ... }
```

##### **H. Board Grid & Cells (Lines ~912-955)**
```css
.board-placement { ... }                /* Main board container */
/* Ship Overlay Images */
.ship-overlay { ... }                   /* Ship image overlay */
/* Ensure all ship images use smooth scaling */
.board-placement img,
.ship-icon,
.character-avatar { ... }
```

##### **I. Board & Cell Styles (Lines ~957-1314)**
```css
.board { ... }                          /* Base board */
.cell { ... }                           /* Grid cell */
.cell:hover { ... }
.cell.ship { ... }                      /* Cell with ship */
.cell.ship:hover { ... }
.cell.hit { ... }                       /* Hit cell */
.cell.miss { ... }                      /* Miss cell */
.cell.sunk { ... }                      /* Sunk ship cell */
.cell.dragging { ... }                  /* Cell being dragged */
.cell.placement-valid { ... }           /* Valid placement preview */
.cell.placement-invalid { ... }         /* Invalid placement preview */
```

##### **J. Ready Button (Lines ~943-954)**
```css
.btn-ready { ... }
.btn-ready:hover { ... }
```

**CSS Files được load trong game.html:**
```html
<link rel="stylesheet" href="css/style.css">     <!-- Global styles -->
<link rel="stylesheet" href="css/game.css">      <!-- Game-specific styles -->
```

---

### **3. JavaScript - Logic & Interactions**

#### **File: `client/js/game.js`** (hoặc `game-clean.js`)

**Functions liên quan đến Ship Placement:**

##### **A. Initialization (Lines ~27-71)**
```javascript
document.addEventListener('DOMContentLoaded', ...)
setupEventListeners(socket)
setupSocketHandlers(socket)
showPlacementScreen()
```

##### **B. Event Listeners (Lines ~73-112)**
```javascript
setupEventListeners(socket)
  - #randomPlaceBtn → placeShipsRandomly()
  - #readyBtn → sendPlayerReady()
```

##### **C. Socket Handlers (Lines ~114-155)**
```javascript
setupSocketHandlers(socket)
  - 'player_ready_update' → updatePlayerReadyStatus()
  - 'game_started' → startGame()
```

##### **D. Screen Management (Lines ~188-208)**
```javascript
showPlacementScreen()         // Show deployment screen
hideAllScreens()              // Hide all screens
```

##### **E. Character Info Loading (Lines ~210-285)**
```javascript
loadDeployCharacterInfo()     // Load player & opponent data
updatePlayerReadyStatus(data) // Update opponent ready status
```

##### **F. Placement Mode Init (Lines ~287-316)**
```javascript
initPlacementMode()           // Initialize placement phase
  - Reset board & ships
  - Auto place ships randomly
  - Start deployment timer
  - Setup keyboard controls
```

##### **G. Deployment Timer (Lines ~318-380)**
```javascript
// Timer variables
let deploymentTimerInterval = null
let deploymentTimeRemaining = 120

// Timer functions
startDeploymentTimer()        // Start 120s countdown
updateDeploymentTimerDisplay() // Update MM:SS display
handleDeploymentTimeout()     // Handle timeout (disable controls)
stopDeploymentTimer()         // Clear timer interval
```

##### **H. Keyboard Controls (Lines ~382-417)**
```javascript
setupKeyboardControls()       // Add keyboard listener
window.keyboardRotateHandler  // R key to rotate ships
```

##### **I. Ship Placement Functions (Lines ~419-530)**
```javascript
// Ship rotation
rotateShipOnBoard(shipName)   // Rotate ship on board

// Board rendering
renderPlacementBoard()        // Render board with ships
  - Render grid cells (10x10)
  - Render ship image overlays
  - Add drag/drop handlers
  - Add click to rotate

// Drag & Drop
handleDrop(e)                 // Handle ship drop
saveShipPosition(shipName)    // Save position before move
restoreShipPosition(oldData)  // Restore if invalid move
removeShipFromBoard(shipName) // Remove ship from board
tryPlaceShipAt(ship, row, col) // Try to place ship
```

##### **J. Placement Validation (Lines ~532-582)**
```javascript
canPlaceShipIgnoringSelf(ship, row, col, isHorizontal)
canPlaceShip(ship, row, col, isHorizontal)
clearPreview()                // Clear placement preview
```

##### **K. Random Placement (Lines ~584-625)**
```javascript
placeShipsRandomly()          // Auto place all ships
  - Loop through all SHIPS
  - Random position & orientation
  - Max 100 attempts per ship
```

##### **L. Send Ready (Lines ~627-641)**
```javascript
sendPlayerReady(socket, ships, board)
  - Get room code from localStorage
  - Emit 'player_ready' socket event
```

**JavaScript Files được load trong game.html:**
```html
<script src="/socket.io/socket.io.js"></script>
<script src="js/shared/state.js"></script>          <!-- BattleshipState -->
<script src="js/shared/socket-shared.js"></script>   <!-- SocketShared -->
<script src="js/charactersData.js"></script>
<script src="js/game.js"></script>                   <!-- Main game logic -->
<script src="js/ui.js"></script>
<script src="js/chat.js"></script>
<script src="js/webrtc.js"></script>
```

---

### **4. Shared Utilities**

#### **File: `client/js/shared/state.js`**
```javascript
BattleshipState.getUserId()
BattleshipState.getUsername()
BattleshipState.getRoomCode()
BattleshipState.isAuthenticated()
BattleshipState.isGuest()
BattleshipState.getGuestDisplayName()
```

#### **File: `client/js/shared/socket-shared.js`**
```javascript
SocketShared.init(callback)
SocketShared.showNotification(message, type)
```

#### **File: `client/js/charactersData.js`**
```javascript
// Character data for UI
const LOBBY_CHARACTERS = [...]
```

---

### **5. Images & Assets**

#### **Character Images**
```
client/images/characters/
  ├── character1/
  │   ├── avatar-large.png     (YOU/OPPONENT avatar)
  │   ├── avatar-thumb.png
  │   └── ships/
  │       ├── carrier.png
  │       ├── battleship.png
  │       ├── cruiser.png
  │       ├── submarine.png
  │       └── destroyer.png
  ├── character2/
  │   └── (same structure)
  └── character3/
      └── (same structure)
```

#### **Background Images**
```
client/images/backgrounds/
  └── (nếu có background cho placement screen)
```

#### **Logo**
```
client/images/logo.png
```

---

## 🔑 ELEMENT IDs REFERENCE

### **HTML Elements trong Placement Screen**

| Element ID | Type | Mô tả |
|-----------|------|-------|
| `placementScreen` | `<div>` | Container chính của deployment phase |
| `placementBoard` | `<div>` | Board game (10x10 grid) |
| `randomPlaceBtn` | `<button>` | Nút random ships |
| `readyBtn` | `<button>` | Nút ready |
| `deploymentTimer` | `<div>` | Timer countdown (MM:SS) |
| `deployYourCharacter` | `<img>` | Avatar YOU |
| `deployOpponentCharacter` | `<img>` | Avatar OPPONENT |
| `deployYourName` | `<div>` | Tên người chơi YOU |
| `deployOpponentName` | `<div>` | Tên đối thủ OPPONENT |
| `deployOpponentStatus` | `<div>` | Status OPPONENT (Waiting/Ready) |
| `deployOpponentCircle` | `<div>` | Circle chứa avatar OPPONENT |

---

## 🎨 CSS CLASSES REFERENCE

### **Layout Classes**

| Class | Mô tả |
|-------|-------|
| `.placement-wrapper-hud` | Main wrapper với gradient background |
| `.placement-content-center` | Content area centered |
| `.hud-you-card` | YOU card (fixed top-left) |
| `.hud-opponent-card` | OPPONENT card (fixed bottom-right) |
| `.hud-timer-center` | Timer (fixed top-center) |

### **Timer Classes**

| Class | Mô tả |
|-------|-------|
| `.timer-label-hud` | "DEPLOYMENT" label |
| `.timer-value-hud` | Timer value "02:00" |
| `.timer-value-hud.warning` | Warning state (red + pulse) |

### **Character Card Classes**

| Class | Mô tả |
|-------|-------|
| `.deploy-character-card` | Base card style |
| `.deploy-you` | YOU card (blue border) |
| `.deploy-opponent` | OPPONENT card (red border) |
| `.character-badge` | Badge "YOU" / "OPPONENT" |
| `.character-circle` | Avatar circle |
| `.character-avatar` | Avatar image |
| `.character-name` | Player name |
| `.character-status` | Status badge |
| `.status-active` | Ready status (green) |
| `.status-waiting` | Waiting status (yellow) |
| `.deploy-opponent.waiting` | Opponent waiting (opacity 50%) |
| `.deploy-opponent.ready` | Opponent ready (opacity 100%) |

### **Board Classes**

| Class | Mô tả |
|-------|-------|
| `.board-placement` | Main board container |
| `.board-with-labels` | Board + labels wrapper |
| `.board-labels-top` | Top labels (1-10) |
| `.board-labels-left` | Left labels (A-J) |
| `.cell` | Grid cell |
| `.cell.ship` | Cell with ship |
| `.cell.dragging` | Cell being dragged |
| `.cell.placement-valid` | Valid placement preview (green) |
| `.cell.placement-invalid` | Invalid placement preview (red) |
| `.ship-overlay` | Ship image overlay |

### **Button Classes**

| Class | Mô tả |
|-------|-------|
| `.btn-rotate` | Random button |
| `.btn-ready` | Ready button |

---

## 📊 JAVASCRIPT FUNCTIONS REFERENCE

### **Initialization**
```javascript
showPlacementScreen()         // Show deployment screen
initPlacementMode()           // Initialize placement phase
loadDeployCharacterInfo()     // Load character data
setupKeyboardControls()       // Setup R key listener
```

### **Timer Management**
```javascript
startDeploymentTimer()        // Start 120s countdown
updateDeploymentTimerDisplay() // Update display
handleDeploymentTimeout()     // Handle timeout
stopDeploymentTimer()         // Stop timer
```

### **Ship Placement**
```javascript
placeShipsRandomly()          // Auto place all ships
renderPlacementBoard()        // Render board + ships
rotateShipOnBoard(shipName)   // Rotate ship
handleDrop(e)                 // Drag & drop handler
canPlaceShip(ship, row, col)  // Validate placement
```

### **Ready State**
```javascript
sendPlayerReady(socket, ships, board) // Send ready to server
updatePlayerReadyStatus(data) // Update opponent status
```

---

## 🔄 SOCKET EVENTS

### **Emit (Client → Server)**
```javascript
socket.emit('player_ready', {
    roomId: string,
    ships: array,
    board: array
})
```

### **Listen (Server → Client)**
```javascript
socket.on('player_ready_update', (data) => {
    // data: { player1Ready: boolean, player2Ready: boolean }
})

socket.on('game_started', (data) => {
    // Chuyển sang game screen
})
```

---

## 📦 DEPENDENCIES

### **NPM Packages** (backend)
- `socket.io` - Real-time communication

### **External Libraries** (frontend)
- Socket.IO Client (loaded via CDN or local)
- Google Fonts: "Black Ops One", "Be Vietnam Pro"

---

## 🎯 FLOW DIAGRAM

```
1. Lobby Screen (lobby.html)
   ↓ Both players click Ready
   
2. Navigate to game.html
   ↓ showPlacementScreen()
   
3. DEPLOYMENT PHASE
   ├── Load character info (loadDeployCharacterInfo)
   ├── Initialize board (initPlacementMode)
   ├── Auto place ships (placeShipsRandomly)
   ├── Start timer (startDeploymentTimer - 120s)
   ├── User interactions:
   │   ├── Drag/drop ships (handleDrop)
   │   ├── Click to rotate (rotateShipOnBoard)
   │   ├── Press R to rotate (keyboard handler)
   │   └── Random button (placeShipsRandomly)
   ├── Click Ready button
   ├── Send to server (sendPlayerReady)
   └── Wait for opponent
       ├── Opponent ready → Update UI (updatePlayerReadyStatus)
       └── Both ready → Server emits 'game_started'
   
4. GAME PHASE
   ↓ showGameScreen()
   └── (Game logic - not in this document)
```

---

## 📝 NOTES

### **Khi làm lại game.html:**
1. ✅ **GIỮ NGUYÊN** tất cả Element IDs
2. ✅ **GIỮ NGUYÊN** tất cả CSS class names
3. ✅ **CHỈ THAY ĐỔI** layout structure, spacing, styling
4. ❌ **KHÔNG THAY ĐỔI** JavaScript logic trong game.js

### **Image Paths:**
- Character images: `images/characters/character{1-3}/avatar-large.png`
- Ship images: `images/characters/character{1-3}/ships/{shipname}.png`
- Logo: `images/logo.png`

### **Ship Names:**
```javascript
const SHIPS = [
    { name: 'Carrier', size: 5 },      // carrier.png
    { name: 'Battleship', size: 4 },   // battleship.png
    { name: 'Cruiser', size: 3 },      // cruiser.png
    { name: 'Submarine', size: 3 },    // submarine.png
    { name: 'Destroyer', size: 2 }     // destroyer.png
]
```

---

## ✅ CHECKLIST KHI REFACTOR

- [ ] Tất cả Element IDs giữ nguyên
- [ ] Tất cả CSS classes giữ nguyên
- [ ] JavaScript vẫn hoạt động (drag/drop, rotate, ready)
- [ ] Timer đếm ngược 120s
- [ ] Character cards hiển thị đúng
- [ ] Opponent status update realtime
- [ ] Ship images render đúng (không bị méo)
- [ ] Responsive design (3 breakpoints: 1024px, 768px, 480px)
- [ ] Keyboard controls (R key) hoạt động
- [ ] Random button hoạt động
- [ ] Ready button disabled khi chưa đủ ships

---

Hoàn thành! 🚀
