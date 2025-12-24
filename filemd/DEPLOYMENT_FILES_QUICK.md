# 📋 SHIP PLACEMENT FILES - TÓM TẮT NHANH

## 🎯 FILES CẦN QUAN TÂM

### **1. HTML** ✅
```
client/game.html
  └── Section: #placementScreen (lines ~24-130)
```

### **2. CSS** ✅
```
client/css/game.css
  ├── Lines 340-420:  HUD Layout (YOU, OPPONENT, Timer)
  ├── Lines 422-513:  Main Content + Responsive
  ├── Lines 524-605:  Header & Title
  ├── Lines 607-658:  Guide Banner
  ├── Lines 668-795:  Character Cards
  ├── Lines 799-860:  Board Controls (Random button)
  ├── Lines 863-910:  Board Labels (1-10, A-J)
  ├── Lines 912-955:  Board Grid + Ship Overlays
  └── Lines 957-1314: Cell Styles (ship, hit, miss, dragging)
```

### **3. JavaScript** ✅
```
client/js/game.js (hoặc game-clean.js)
  ├── Lines 27-71:    Initialization
  ├── Lines 73-112:   Event Listeners (#randomPlaceBtn, #readyBtn)
  ├── Lines 114-155:  Socket Handlers (player_ready_update, game_started)
  ├── Lines 188-285:  Screen Management + Character Loading
  ├── Lines 287-380:  Placement Mode + Deployment Timer (120s)
  ├── Lines 382-417:  Keyboard Controls (R key)
  ├── Lines 419-530:  Ship Rotation + Board Rendering
  ├── Lines 532-582:  Drag & Drop + Validation
  └── Lines 584-641:  Random Placement + Send Ready
```

### **4. Shared Utilities** ✅
```
client/js/shared/state.js         → BattleshipState (auth, room)
client/js/shared/socket-shared.js → SocketShared (socket, notifications)
client/js/charactersData.js       → Character data
```

### **5. Assets** ✅
```
client/images/characters/
  └── character{1-3}/
      ├── avatar-large.png    (YOU/OPPONENT cards)
      └── ships/
          ├── carrier.png
          ├── battleship.png
          ├── cruiser.png
          ├── submarine.png
          └── destroyer.png
```

---

## 🔑 ELEMENT IDs QUAN TRỌNG

```javascript
// Screens
#placementScreen         // Container chính

// Board
#placementBoard          // Board 10x10
#randomPlaceBtn          // Nút random ships
#readyBtn                // Nút ready

// Timer
#deploymentTimer         // Timer 120s

// YOU card
#deployYourCharacter     // Avatar
#deployYourName          // Tên

// OPPONENT card
#deployOpponentCharacter // Avatar
#deployOpponentName      // Tên
#deployOpponentStatus    // Status (Waiting/Ready)
#deployOpponentCircle    // Avatar circle
```

---

## 🎨 CSS CLASSES QUAN TRỌNG

```css
/* Layout */
.placement-wrapper-hud        /* Main wrapper */
.placement-content-center     /* Content area */
.hud-you-card                 /* YOU card (top-left) */
.hud-opponent-card            /* OPPONENT card (bottom-right) */
.hud-timer-center             /* Timer (top-center) */

/* Timer */
.timer-value-hud              /* Timer value */
.timer-value-hud.warning      /* Warning state (≤10s) */

/* Character Cards */
.deploy-character-card        /* Base card */
.deploy-you                   /* YOU card (blue border) */
.deploy-opponent              /* OPPONENT card (red border) */
.deploy-opponent.waiting      /* Opponent waiting (opacity 50%) */
.deploy-opponent.ready        /* Opponent ready (opacity 100%) */

/* Board */
.board-placement              /* Main board */
.cell                         /* Grid cell */
.cell.ship                    /* Cell with ship */
.cell.placement-valid         /* Valid placement (green) */
.cell.placement-invalid       /* Invalid placement (red) */
.ship-overlay                 /* Ship image overlay */
```

---

## 📊 JAVASCRIPT FUNCTIONS CHÍNH

```javascript
// Initialization
showPlacementScreen()         // Show screen
initPlacementMode()           // Init board + ships
loadDeployCharacterInfo()     // Load characters

// Timer
startDeploymentTimer()        // Start 120s
stopDeploymentTimer()         // Stop timer

// Placement
placeShipsRandomly()          // Auto place all ships
renderPlacementBoard()        // Render board + overlays
rotateShipOnBoard(shipName)   // Rotate ship
handleDrop(e)                 // Drag & drop

// Ready
sendPlayerReady(socket, ships, board)  // Send to server
updatePlayerReadyStatus(data)          // Update opponent status
```

---

## 🔄 SOCKET EVENTS

```javascript
// Emit
socket.emit('player_ready', { roomId, ships, board })

// Listen
socket.on('player_ready_update', (data) => { ... })
socket.on('game_started', (data) => { ... })
```

---

## ✅ CHECKLIST KHI LÀM LẠI

- [ ] Element IDs giữ nguyên
- [ ] CSS classes giữ nguyên
- [ ] Drag/drop hoạt động
- [ ] Rotate ships (click + R key)
- [ ] Timer 120s countdown
- [ ] Character cards display
- [ ] Opponent status update
- [ ] Ship images không méo
- [ ] Random button
- [ ] Ready button

---

## 📁 FILE STRUCTURE

```
battleship/
├── client/
│   ├── game.html                      ← HTML layout
│   ├── css/
│   │   └── game.css                   ← All styles
│   ├── js/
│   │   ├── game.js                    ← Main logic
│   │   ├── shared/
│   │   │   ├── state.js               ← State management
│   │   │   └── socket-shared.js       ← Socket helper
│   │   └── charactersData.js          ← Character data
│   └── images/
│       └── characters/
│           ├── character1/
│           │   ├── avatar-large.png
│           │   └── ships/
│           │       ├── carrier.png
│           │       ├── battleship.png
│           │       ├── cruiser.png
│           │       ├── submarine.png
│           │       └── destroyer.png
│           ├── character2/ (same)
│           └── character3/ (same)
└── DEPLOYMENT_PHASE_FILES.md          ← Chi tiết đầy đủ
```

---

Xem chi tiết đầy đủ tại: **`DEPLOYMENT_PHASE_FILES.md`** 📖
