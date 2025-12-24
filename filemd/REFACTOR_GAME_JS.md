# TÁCH LOGIC GAME.JS - HƯỚNG DẪN

## 📋 Tổng quan
File `game.js` hiện tại đang chứa **LẪN LỘN** logic của:
- ❌ **Hub** (tạo phòng, join room, quick play)
- ❌ **Lobby** (waiting room, character selection)
- ✅ **Game** (deployment, gameplay, game over)

## 🎯 Mục tiêu
Tách riêng logic theo đúng chức năng:
- `hub.js` → Hub logic (ĐÃ CÓ SẴN, hoàn chỉnh)
- `lobby.js` → Lobby logic (ĐÃ CÓ SẴN, hoàn chỉnh)
- `game.js` → **CHỈ** game logic (placement + gameplay + game over)

---

## 📁 Cấu trúc file hiện tại

### **hub.html** ✅
```html
- Quick Play button (#btnQuickPlay)
- Create Private Room button (#btnCreatePrivateRoom)
- Join Private Room button (#btnJoinPrivateRoom)
- Room Code Input (#inputRoomCode)
- Character switcher (UI only, cosmetic)
```

**Scripts được load:**
```html
<script src="js/shared/state.js"></script>
<script src="js/shared/socket-shared.js"></script>
<script src="js/hub.js"></script>  <!-- ĐÃ ĐÚNG -->
```

### **lobby.html** ✅
```html
- Room Code Display (#lobbyRoomCode)
- Leave Room button (#btnLeaveRoom)
- Ready button (#btnReady)
- Player 1 & Player 2 cards
- Character selector (UI only, cosmetic)
- Lobby timer (60s)
```

**Scripts được load:**
```html
<script src="js/shared/state.js"></script>
<script src="js/shared/socket-shared.js"></script>
<script src="js/lobby.js"></script>  <!-- ĐÃ ĐÚNG -->
```

### **game.html** ❌ (CẦN SỬA)
```html
<!-- DEPLOYMENT SCREEN -->
- HUD YOU card (top-left)
- HUD OPPONENT card (bottom-right)
- HUD Timer (top-center)
- Placement board
- Random button (#randomPlaceBtn)
- Ready button (#readyBtn)

<!-- GAME SCREEN -->
- Game boards (left + right)
- Timer
- Attack interface
- Chat + Video call

<!-- GAME OVER SCREEN -->
- Results
- Back to Lobby button (#backToLobbyBtn)
```

**Scripts HIỆN TẠI (SAI):**
```html
<script src="js/charactersData.js"></script>
<script src="js/game.js"></script>  <!-- ❌ ĐANG CHỨA HUB/LOBBY LOGIC -->
<script src="js/ui.js"></script>
<script src="js/socket.js"></script>
<script src="js/chat.js"></script>
<script src="js/webrtc.js"></script>
```

**Scripts NÊN DÙNG (ĐÚNG):**
```html
<script src="js/shared/state.js"></script>
<script src="js/shared/socket-shared.js"></script>
<script src="js/charactersData.js"></script>
<script src="js/game.js"></script>  <!-- ✅ CHỈ GAME LOGIC -->
<script src="js/ui.js"></script>
<script src="js/chat.js"></script>
<script src="js/webrtc.js"></script>
```

---

## 🔨 Các bước thực hiện

### **Bước 1: Backup file game.js cũ**
```bash
# Copy file cũ để backup
cp client/js/game.js client/js/game-old-backup.js
```

### **Bước 2: Thay thế game.js bằng game-clean.js**
```bash
# Xóa file cũ
rm client/js/game.js

# Copy file clean
cp client/js/game-clean.js client/js/game.js
```

### **Bước 3: Cập nhật game.html**
Thay đổi phần `<script>` tags:

**XÓA:**
```html
<script src="js/socket.js"></script>
```

**THÊM (nếu chưa có):**
```html
<script src="js/shared/state.js"></script>
<script src="js/shared/socket-shared.js"></script>
```

### **Bước 4: Kiểm tra các file liên quan**

#### **hub.js** ✅ (ĐÃ HOÀN CHỈNH)
Chứa:
- Quick Play logic
- Create Private Room logic
- Join Private Room logic
- Character switcher (UI cosmetic)
- Socket handlers: `match:found`, `room_created`, `queue:waiting`, etc.

#### **lobby.js** ✅ (ĐÃ HOÀN CHỈNH)
Chứa:
- Leave Room logic
- Ready button logic (CRITICAL: triggers deployment phase)
- Character selector (UI cosmetic)
- Lobby timer (60s countdown)
- Socket handlers: `lobby:bothReady`, `room:updated`, `player_ready_update`, etc.

#### **game.js** ✅ (SẼ CLEAN)
Chỉ chứa:
- Deployment phase (ship placement)
- Deployment timer (120s)
- Ship drag/drop, rotate
- Game play (attack, turn management)
- Game over screen
- Socket handlers: `player_ready_update`, `game_started`, `attack_result`, `turn_changed`, `game_over`

---

## ⚠️ Các lưu ý QUAN TRỌNG

### **1. Socket Handlers**
Mỗi file chỉ listen các socket events thuộc chức năng của nó:

**hub.js:**
```javascript
socket.on('match:found', ...)      // Quick play matched
socket.on('room_created', ...)     // Private room created
socket.on('queue:waiting', ...)    // Queue position update
socket.on('room:error', ...)       // Room errors
```

**lobby.js:**
```javascript
socket.on('lobby:bothReady', ...)        // Both players ready → go to game
socket.on('room:updated', ...)           // Room state changed
socket.on('player_ready_update', ...)    // Player clicked ready
socket.on('room:disbanded', ...)         // Room disbanded
socket.on('room:playerLeft', ...)        // Player left room
```

**game.js:**
```javascript
socket.on('player_ready_update', ...)    // Deployment ready status
socket.on('game_started', ...)           // Game begins
socket.on('attack_result', ...)          // Attack result
socket.on('turn_changed', ...)           // Turn switched
socket.on('turn_continue', ...)          // Hit = continue turn
socket.on('game_over', ...)              // Game ended
socket.on('player_disconnected', ...)    // Opponent disconnected
```

### **2. State Management**
Sử dụng `BattleshipState` (từ `shared/state.js`):

```javascript
// Authentication
BattleshipState.isAuthenticated()
BattleshipState.getUserId()
BattleshipState.getUsername()
BattleshipState.isGuest()

// Room state
BattleshipState.getRoomCode()
BattleshipState.setRoomCode(code)
BattleshipState.clearRoomState()

// Full reset
BattleshipState.clearAll()
```

### **3. Socket Helper**
Sử dụng `SocketShared` (từ `shared/socket-shared.js`):

```javascript
// Initialize socket
const socket = SocketShared.init((data) => {
    console.log('Connected:', data);
});

// Show notifications
SocketShared.showNotification('Message', 'success'); // success|error|warning|info
```

---

## 🧪 Kiểm tra sau khi thay đổi

### **Test Hub (hub.html)**
1. ✅ Quick Play → Ghép trận → Chuyển sang lobby.html
2. ✅ Create Private Room → Tạo phòng → Hiển thị room code → Chuyển sang lobby.html
3. ✅ Join Private Room → Nhập mã → Join thành công → Chuyển sang lobby.html
4. ✅ Character switcher → Đổi character (chỉ UI, không ảnh hưởng gameplay)
5. ✅ Logout → Clear localStorage → Redirect về /

### **Test Lobby (lobby.html)**
1. ✅ Hiển thị room code đúng
2. ✅ Hiển thị cả 2 players (avatar, tên)
3. ✅ Character selector → Đổi character (chỉ UI, không ảnh hưởng gameplay)
4. ✅ Lobby timer đếm ngược 60s
5. ✅ Leave button → Về hub
6. ✅ Ready button → Update status → Khi cả 2 ready → Chuyển sang game.html (deployment phase)

### **Test Game (game.html)**
1. ✅ Deployment phase:
   - Hiển thị HUD cards (YOU top-left, OPPONENT bottom-right)
   - Timer 120s đếm ngược
   - Ships đặt random tự động
   - Drag/drop ships hoạt động
   - Rotate ships (click hoặc phím R) hoạt động
   - Ready button → Gửi ships data → Chờ opponent

2. ✅ Game play phase:
   - Board render đúng
   - Attack interface hoạt động
   - Turn management đúng
   - Chat + Video call hoạt động

3. ✅ Game over phase:
   - Hiển thị kết quả
   - Back to Lobby button → Về hub

---

## 📝 Checklist hoàn thành

- [ ] Backup game.js cũ → game-old-backup.js
- [ ] Copy game-clean.js → game.js
- [ ] Cập nhật game.html scripts (xóa socket.js, thêm shared files)
- [ ] Test hub.html (quick play, create room, join room)
- [ ] Test lobby.html (ready button, timer, leave button)
- [ ] Test game.html (deployment, gameplay, game over)
- [ ] Xóa game-old-backup.js (sau khi test xong)

---

## 🎉 Kết quả mong đợi

Sau khi hoàn thành:
- ✅ `hub.js` → Chỉ hub logic
- ✅ `lobby.js` → Chỉ lobby logic
- ✅ `game.js` → Chỉ game logic
- ✅ Không còn code lẫn lộn
- ✅ Dễ maintain, dễ debug
- ✅ Sẵn sàng để làm lại game.html mà không sợ mất logic

---

## 💡 Lưu ý cho tương lai

Khi làm lại `game.html`:
1. **GIỮ NGUYÊN** các element IDs (để game.js vẫn hoạt động):
   - `#placementScreen`, `#gameScreen`, `#gameOverScreen`
   - `#placementBoard`, `#randomPlaceBtn`, `#readyBtn`
   - `#deployYourCharacter`, `#deployOpponentCharacter`
   - `#deploymentTimer`, v.v.

2. **GIỮ NGUYÊN** class names cho CSS:
   - `.hud-you-card`, `.hud-opponent-card`, `.hud-timer-center`
   - `.board-placement`, `.cell`, `.ship-overlay`
   - v.v.

3. **CHỈ THAY ĐỔI** structure HTML, layout, styling
4. **KHÔNG THAY ĐỔI** logic JavaScript trong game.js

---

Hoàn thành! 🚀
