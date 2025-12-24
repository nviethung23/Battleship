# Fix: Socket Error & Back to Hub

## Vấn đề đã sửa:

### 1. ❌ Lỗi: `Cannot read properties of null (reading 'emit')`
**Nguyên nhân:**
- `game.js` sử dụng `SocketShared.init()` để tạo socket instance
- `socket.js` có biến `socket` riêng chưa được khởi tạo
- Hàm `sendPlayerReady()` trong `socket.js` cố gọi `socket.emit()` nhưng socket = null
- Có 2 socket instance khác nhau gây conflict

**Giải pháp:**
- Sử dụng hàm `sendPlayerReady()` trong `game.js` (đã có sẵn)
- Lưu socket instance vào `gameState.socket` để dễ truy cập
- Thêm null check trong `sendPlayerReady()` để tránh crash
- Trong auto-ready timeout, lấy socket từ `gameState.socket` hoặc `SocketShared.getSocket()`

### 2. 🏠 Back về Hub thay vì Lobby
**Nguyên nhân:**
- Nút vẫn hiển thị text "Về Lobby" 
- Logic đã đúng (redirect về `/hub`) nhưng text chưa cập nhật

**Giải pháp:**
- Đổi text nút từ "Về Lobby" → "Về Hub" trong `game.html`
- Thêm cleanup session storage trong `backToHub()`
- Thêm log rõ ràng hơn

---

## Chi tiết thay đổi:

### `client/js/game.js`:

1. **Thêm `socket` vào gameState** (line ~18-36):
```javascript
let gameState = {
    // ...existing properties...
    socket: null // Store socket instance
};
```

2. **Lưu socket vào gameState khi khởi tạo** (line ~48-54):
```javascript
const socket = SocketShared.init((data) => {
    console.log('[Game] Socket connected:', data);
});

if (!socket) {
    console.error('[Game] Failed to initialize socket');
    return;
}

// Store socket in game state for easy access
gameState.socket = socket;
```

3. **Thêm null check trong `sendPlayerReady()`** (line ~1043-1064):
```javascript
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
```

4. **Fix auto-ready timeout** (line ~492-514):
```javascript
setTimeout(() => {
    if (gameState.placementMode.placedShips.length === SHIPS.length) {
        console.log('[Placement] ⚓ Auto-ready triggered!');
        
        // Send player ready using socket from game state
        const socket = gameState.socket || SocketShared.getSocket();
        if (socket) {
            sendPlayerReady(socket, gameState.myShips, gameState.myBoard);
            // ...update UI...
        } else {
            console.error('[Placement] Socket not available for auto-ready!');
        }
    }
}, 600);
```

5. **Cải thiện `backToHub()`** (line ~197-228):
```javascript
function backToHub() {
    // Clear game state (bao gồm socket)
    gameState = {
        // ...all properties...
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
    
    // Clear session storage
    sessionStorage.removeItem('deploymentEndTime');
    
    // Clear room state
    BattleshipState.clearRoomState();
    
    // Redirect to hub
    console.log('[Game] 🏠 Returning to Hub...');
    window.location.href = '/hub';
}
```

### `client/js/socket.js`:

**Thêm null check trong `sendPlayerReady()`** (line ~385-397):
```javascript
function sendPlayerReady(ships, board) {
    if (!socket) {
        console.error('[Socket] Socket not initialized! Cannot send player ready.');
        SocketShared.showNotification('Lỗi kết nối! Vui lòng tải lại trang.', 'error');
        return;
    }
    
    console.log('[Socket] Sending player ready:', { roomId: currentRoomId, ships, board });
    
    socket.emit('player_ready', {
        roomId: currentRoomId,
        ships: ships,
        board: board
    });
}
```

> **Lưu ý**: Hàm này trong `socket.js` không được dùng nữa vì `game.js` có hàm riêng. Nhưng vẫn giữ null check để tránh lỗi nếu có file khác gọi.

### `client/game.html`:

**Đổi text nút** (line ~272):
```html
<button id="backToLobbyBtn" class="btn btn-primary btn-large">Về Hub</button>
```

---

## Test sau khi fix:

### ✅ Test 1: Ready button hoạt động
1. Vào game, xếp 5 tàu
2. Nhấn nút "READY!"
3. **Kết quả mong đợi**: 
   - Không có lỗi console
   - Nút đổi thành "WAITING..."
   - Thẻ YOU hiển thị "Ready!" màu xanh

### ✅ Test 2: Auto-ready khi hết giờ
1. Vào game, không xếp tàu
2. Đợi timer hết (hoặc set `DEPLOYMENT_DURATION = 10`)
3. **Kết quả mong đợi**:
   - Tự động random tàu
   - Tự động ready
   - Không có lỗi console

### ✅ Test 3: Back về Hub
1. Vào game
2. Nhấn nút "Về Hub" ở Game Over screen
3. **Kết quả mong đợi**:
   - Chuyển về `/hub` (hub.html)
   - Session storage được clear
   - Không có lỗi console

---

## Troubleshooting:

### Nếu vẫn lỗi socket null:
1. Kiểm tra Console có log: `[Game] Socket connected: ...`
2. Kiểm tra `gameState.socket` có giá trị trong DevTools Console:
   ```javascript
   console.log(gameState.socket);
   ```
3. Nếu null, kiểm tra `SocketShared.init()` có return socket không

### Nếu không back được về Hub:
1. Kiểm tra Console có log: `[Game] 🏠 Returning to Hub...`
2. Kiểm tra URL có chuyển về `/hub` không
3. Nếu lỗi 404, kiểm tra server có route `/hub` không

---

**Ngày fix**: 2025-12-23  
**Tác giả**: GitHub Copilot + User
