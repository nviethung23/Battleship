# 🎨 SHIP PLACEMENT - VISUAL STRUCTURE

## 📐 LAYOUT DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    PLACEMENT SCREEN                         │
│  .placement-wrapper-hud (full viewport, gradient bg)       │
│                                                             │
│  ┌──────────────┐        ┌───────────┐                    │
│  │ YOU CARD     │        │ TIMER HUD │                    │
│  │ (top-left)   │        │ (center)  │                    │
│  │              │        │ 02:00     │                    │
│  │ .hud-you-card│        │.hud-timer-│                    │
│  └──────────────┘        └───────────┘                    │
│                                                             │
│         ┌───────────────────────────────────┐              │
│         │  .placement-content-center        │              │
│         │  (scrollable, centered)           │              │
│         │                                   │              │
│         │  ┌─────────────────────────┐     │              │
│         │  │ Deploy Fleet (title)    │     │              │
│         │  └─────────────────────────┘     │              │
│         │                                   │              │
│         │  ┌─────────────────────────┐     │              │
│         │  │ Guide: Drag, Rotate, R  │     │              │
│         │  └─────────────────────────┘     │              │
│         │                                   │              │
│         │  ┌─────────────────────────┐     │              │
│         │  │  [Random] button        │     │              │
│         │  └─────────────────────────┘     │              │
│         │                                   │              │
│         │  ┌─────────────────────────┐     │              │
│         │  │   10x10 BOARD           │     │              │
│         │  │   #placementBoard       │     │              │
│         │  │                         │     │              │
│         │  │   [A-J] x [1-10]        │     │              │
│         │  │   with ship overlays    │     │              │
│         │  └─────────────────────────┘     │              │
│         │                                   │              │
│         │  ┌─────────────────────────┐     │              │
│         │  │  [⚓ READY!] button      │     │              │
│         │  └─────────────────────────┘     │              │
│         │                                   │              │
│         └───────────────────────────────────┘              │
│                                                             │
│                                      ┌──────────────┐      │
│                                      │ OPPONENT CARD│      │
│                                      │ (bottom-right│      │
│                                      │              │      │
│                                      │.hud-opponent-│      │
│                                      └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎴 CHARACTER CARD STRUCTURE

```
┌────────────────────────────┐
│    .deploy-character-card  │
│                            │
│      ╔═══════════╗         │  ← .character-badge ("YOU" / "OPPONENT")
│      ║    YOU    ║         │
│      ╚═══════════╝         │
│                            │
│         ┌─────┐            │
│         │     │            │  ← .character-circle
│         │ 👤  │            │     .character-avatar (avatar-large.png)
│         │     │            │
│         └─────┘            │
│                            │
│      Captain Morgan        │  ← .character-name
│                            │
│      ┌─────────────┐       │
│      │ ✓  Ready    │       │  ← .character-status (.status-active)
│      └─────────────┘       │
│                            │
└────────────────────────────┘
```

---

## 🎯 TIMER STRUCTURE

```
┌──────────────────────────┐
│  .hud-timer-center       │
│  (fixed top-center)      │
│                          │
│    DEPLOYMENT            │  ← .timer-label-hud
│                          │
│       02:00              │  ← .timer-value-hud
│                          │
│  [Warning at :10 = red]  │  ← .timer-value-hud.warning
│                          │
└──────────────────────────┘
```

---

## 📊 BOARD GRID STRUCTURE

```
    ┌────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
    │    │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │  ← .board-labels-top
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ A  │░░░│░░░│░░░│░░░│░░░│   │   │   │   │   │  ← Carrier (5 cells)
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ B  │   │   │   │   │   │   │   │   │   │   │
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ C  │   │░░░│░░░│░░░│░░░│   │   │   │   │   │  ← Battleship (4 cells)
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ D  │   │   │   │   │   │   │   │   │   │   │
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ E  │   │   │░░░│   │   │   │   │   │   │   │  ← Cruiser (3 cells)
    │    │   │   │░░░│   │   │   │   │   │   │   │     vertical
    │ F  │   │   │░░░│   │   │   │   │   │   │   │
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ G  │   │   │   │   │   │   │   │   │   │   │
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ H  │   │   │   │   │   │░░░│░░░│░░░│   │   │  ← Submarine (3 cells)
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ I  │   │   │   │   │   │   │   │   │   │   │
    ├────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
    │ J  │   │   │   │   │   │   │░░░│░░░│   │   │  ← Destroyer (2 cells)
    └────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
     ↑
.board-labels-left

░░░ = .cell.ship (có ship overlay image)
```

---

## 🚢 SHIP OVERLAY RENDERING

```
Horizontal Ship (Carrier):
┌───────────────────────────────┐
│   <img class="ship-overlay">  │  width: 50% (5 cells × 10%)
│   carrier.png                  │  height: 10% (1 cell)
│   position: absolute           │  left: calculated
│   transform: none              │  top: calculated
└───────────────────────────────┘

Vertical Ship (Submarine):
┌─────┐
│     │  width: 30% (3 cells × 10%)
│  🚢 │  height: 10% (1 cell)
│     │  transform: translate(-50%, -50%) rotate(90deg)
│     │  transformOrigin: center center
└─────┘
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Desktop (>1024px):
┌─────────────────────────────────┐
│  [YOU]    [TIMER]    [OPPONENT] │
│                                 │
│        [BOARD FULL SIZE]        │
│                                 │
└─────────────────────────────────┘

Tablet (768px - 1024px):
┌───────────────────────────┐
│ [YOU]  [TIMER]  [OPP]    │
│                           │
│   [BOARD 90% SCALE]       │
│                           │
└───────────────────────────┘

Mobile (<768px):
┌─────────────────────┐
│[Y][TIMER][O]       │
│                     │
│ [BOARD 80% SCALE]   │
│                     │
└─────────────────────┘
```

---

## 🎬 INTERACTION FLOW

```
USER ACTIONS                    SYSTEM RESPONSE
──────────────────────────────────────────────────

1. Page Load
   └→ initPlacementMode()
      ├→ placeShipsRandomly()       [Auto place 5 ships]
      ├→ renderPlacementBoard()     [Show board + ships]
      └→ startDeploymentTimer()     [Start 120s countdown]

2. Drag Ship
   ├→ dragstart event
   │  └→ ship.cells.add('dragging')
   ├→ dragover event
   │  └→ Show preview (green/red)
   └→ drop event
      └→ handleDrop()
         ├→ Validate position
         ├→ Remove from old position
         ├→ Place at new position
         └→ renderPlacementBoard()

3. Click Ship
   └→ click event
      └→ rotateShipOnBoard()
         ├→ Check can rotate
         ├→ Rotate or restore
         └→ renderPlacementBoard()

4. Press R Key
   └→ keydown event
      └→ rotateShipOnBoard()
         [Same as click]

5. Click Random Button
   └→ click event
      └→ placeShipsRandomly()
         ├→ Clear all ships
         ├→ Random place all
         └→ renderPlacementBoard()

6. Click Ready Button
   └→ click event
      └→ sendPlayerReady()
         ├→ Emit 'player_ready'
         ├→ Disable button
         └→ Show notification

7. Opponent Ready
   ├→ socket.on('player_ready_update')
   └→ updatePlayerReadyStatus()
      ├→ Update opponent card
      │  ├→ opacity: 0.5 → 1.0
      │  └→ status: "Waiting..." → "Ready!"
      └→ If both ready → game_started event

8. Timer Expired (0:00)
   └→ handleDeploymentTimeout()
      ├→ Disable random button
      ├→ Disable ready button
      └→ Show notification
```

---

## 🔧 CSS INHERITANCE TREE

```
.placement-wrapper-hud
  ├── .hud-you-card
  │   ├── .deploy-character-card
  │   │   ├── .character-badge.badge-you
  │   │   ├── .character-circle
  │   │   │   └── .character-avatar
  │   │   ├── .character-name
  │   │   └── .character-status.status-active
  │   └── .deploy-you (border style)
  │
  ├── .hud-timer-center
  │   ├── .timer-label-hud
  │   └── .timer-value-hud (+ .warning)
  │
  ├── .hud-opponent-card
  │   ├── .deploy-character-card
  │   │   [Same structure as YOU card]
  │   └── .deploy-opponent (+ .waiting / .ready)
  │
  └── .placement-content-center
      ├── .placement-header
      │   └── .deploy-title
      ├── .placement-guide-banner
      │   ├── .guide-icon
      │   ├── .guide-text
      │   └── kbd
      ├── .placement-board-container
      │   ├── .board-controls-top
      │   │   └── .btn-rotate
      │   └── .board-with-labels
      │       ├── .board-labels-top
      │       │   ├── .corner-label
      │       │   └── .label (x10)
      │       └── .board-with-side-labels
      │           ├── .board-labels-left
      │           │   └── .label (x10)
      │           └── .board-placement
      │               ├── .cell (x100)
      │               │   └── .ship (if has ship)
      │               └── .ship-overlay (x5)
      └── .btn-ready
```

---

## 🎯 STATE MANAGEMENT

```
gameState
  ├── myShips: [
  │     { name: 'Carrier', size: 5, cells: [{row, col}, ...] },
  │     { name: 'Battleship', size: 4, cells: [...] },
  │     ...
  │   ]
  ├── myBoard: [
  │     [null, 'Carrier', 'Carrier', ...],  // Row A
  │     [null, null, 'Battleship', ...],    // Row B
  │     ...
  │   ]
  └── placementMode: {
        currentShip: null,
        isHorizontal: true,
        placedShips: ['Carrier', 'Battleship', ...],
        draggedShip: 'Carrier',
        selectedCharacter: 0  // From lobby
      }

localStorage
  ├── token
  ├── userId
  ├── username
  ├── isGuest
  ├── roomCode
  └── gameRoomData: {
        player1: { userId, username, characterId, ... },
        player2: { userId, username, characterId, ... }
      }
```

---

## 📦 DATA FLOW

```
LOBBY → DEPLOYMENT → GAME

localStorage.gameRoomData
    ↓
loadDeployCharacterInfo()
    ↓
Update YOU card
    ├── Avatar: character{characterId}/avatar-large.png
    └── Name: username or guestDisplayName
    ↓
Update OPPONENT card
    ├── Avatar: character{characterId}/avatar-large.png
    ├── Name: username or guestDisplayName
    └── Status: "Waiting..." (opacity 50%)

User clicks Ready
    ↓
sendPlayerReady(socket, ships, board)
    ↓
socket.emit('player_ready', { roomId, ships, board })
    ↓
Server processes
    ↓
socket.on('player_ready_update', data)
    ↓
updatePlayerReadyStatus(data)
    ├── If opponent ready:
    │   ├── OPPONENT card opacity → 100%
    │   └── Status → "Ready!"
    └── If both ready:
        ↓
    socket.on('game_started', data)
        ↓
    stopDeploymentTimer()
        ↓
    startGame(data)
        ↓
    showGameScreen()
```

---

Xem chi tiết tại:
- **`DEPLOYMENT_PHASE_FILES.md`** - Chi tiết đầy đủ
- **`DEPLOYMENT_FILES_QUICK.md`** - Tóm tắt nhanh
