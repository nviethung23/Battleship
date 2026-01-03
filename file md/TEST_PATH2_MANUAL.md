# TEST PATH 2 FIX - MANUAL TESTING GUIDE

## 🧪 Cách Test Nhanh (Không Cần Script)

### **Test Scenario: Reconnect nhiều lần qua Path 2**

#### 1️⃣ Setup Redis Monitor

Terminal 1 - Monitor Redis:
```bash
redis-cli MONITOR | findstr "user:.*:connected user:.*:socket user:.*:disconnectAt"
```

#### 2️⃣ Start Server

Terminal 2 - Run server:
```bash
npm start
```

#### 3️⃣ Test Path 2 Reconnect

**Browser Console Steps:**

1. **Login và vào game room**
   - Login vào game
   - Tạo hoặc join room
   - Vào game.html (deployment screen)

2. **Check Redis state ban đầu**
   ```bash
   # Terminal 3
   redis-cli GET "user:admin:connected"
   redis-cli GET "user:admin:socket"
   ```
   - Expected: `connected = "true"`, `socket = <socketId>`

3. **Simulate reconnect via Path 2**
   
   **Browser Console:**
   ```javascript
   // Force disconnect
   socket.disconnect();
   
   // Wait 1 second
   setTimeout(() => {
       // Reconnect
       socket.connect();
       
       // After connect, emit requestRoomInfo (Path 2)
       socket.once('connect', () => {
           const roomCode = localStorage.getItem('gameRoomData');
           const data = JSON.parse(roomCode);
           
           console.log('🔄 Testing Path 2: requestRoomInfo');
           socket.emit('lobby:requestRoomInfo', {
               roomCode: data.roomCode || data.roomId,
               userId: BattleshipState.getUserId(),
               username: BattleshipState.getUsername()
           });
       });
   }, 1000);
   ```

4. **Check Server Logs**
   
   Nên thấy:
   ```
   ✅ [Lobby] 🔧 [PATH 2] Registering socket BEFORE room join for admin
   ✅ [SocketState] Registered socket for admin → socket_xyz in room_abc
   ```

5. **Check Redis After Reconnect**
   ```bash
   redis-cli GET "user:admin:connected"      # Should be "true"
   redis-cli GET "user:admin:socket"         # Should be new socketId
   redis-cli GET "user:admin:disconnectAt"   # Should be (nil)
   ```

6. **Wait for grace period (10s)** 
   
   Không nên thấy:
   ```
   ❌ [Disconnect] Grace period expired
   ❌ player_disconnect_timeout event
   ```

---

## 🧪 Test Race Condition

**Test: Old socket disconnect AFTER new socket registers**

**Browser Console:**
```javascript
// Save old socket
const oldSocket = socket;

// Create new socket
const newSocket = io({
    auth: { token: localStorage.getItem('token') }
});

newSocket.on('connect', () => {
    console.log('✅ New socket connected:', newSocket.id);
    
    // Register new socket via join_game_room
    const roomData = JSON.parse(localStorage.getItem('gameRoomData'));
    newSocket.emit('join_game_room', {
        roomCode: roomData.roomCode || roomData.roomId
    });
    
    // After 500ms, disconnect OLD socket (race condition)
    setTimeout(() => {
        console.log('🔌 Disconnecting OLD socket');
        oldSocket.disconnect();
    }, 500);
});
```

**Expected Server Logs:**
```
✅ [SocketState] Registered socket for admin → socket_NEW
⏳ [SocketState] ⚠️ Disconnect ignored for admin - socketId mismatch (current: NEW, disconnecting: OLD)
```

**Expected Redis State:**
```bash
redis-cli GET "user:admin:connected"   # Still "true" ✅
redis-cli GET "user:admin:socket"      # Still NEW socketId ✅
```

---

## 📊 SUCCESS CRITERIA

### ✅ Path 2 Fix Working:
- [ ] Log shows `[PATH 2] Registering socket BEFORE room join`
- [ ] Redis `user:*:connected` = "true" after requestRoomInfo
- [ ] Redis `user:*:disconnectAt` deleted after requestRoomInfo
- [ ] NO `player_disconnect_timeout` event after reconnect
- [ ] NO `room:disbanded` event after reconnect

### ✅ Race Condition Fixed:
- [ ] Log shows `Disconnect ignored - socketId mismatch`
- [ ] Redis `connected` stays "true" after old disconnect
- [ ] Redis `socket` stays as NEW socketId
- [ ] User NOT kicked from room

---

## 🚨 FAILURE PATTERNS (Should NOT See)

```
❌ [Lobby] admin requested room info (NO [PATH 2] log)
❌ [SocketState] Marked admin as disconnected (when reconnected)
❌ [GracePeriod] Redis check: { connected: 'false' }
❌ [Disconnect] Grace period expired
❌ player_disconnect_timeout event
❌ room:disbanded event
```

---

## 🔧 Redis Commands Reference

```bash
# Check connection state
redis-cli GET "user:admin:connected"

# Check current socketId
redis-cli GET "user:admin:socket"

# Check disconnect timestamp (should be nil after reconnect)
redis-cli GET "user:admin:disconnectAt"

# Check session data
redis-cli GET "session:admin"

# Watch all keys live
redis-cli MONITOR | findstr "user:admin"
```

---

## 📝 Quick Test Checklist

1. [ ] Start Redis monitor
2. [ ] Start server
3. [ ] Login and join room
4. [ ] Test Path 2 reconnect via browser console
5. [ ] Check server logs for `[PATH 2]`
6. [ ] Verify Redis `connected=true`
7. [ ] Wait 10s - no disconnect timeout
8. [ ] Test race condition scenario
9. [ ] Verify old disconnect ignored
10. [ ] All tests pass ✅

---

## 🎯 Alternative: Test with Postman/Curl

Nếu muốn test từng bước:

```bash
# 1. Login
curl -X POST https://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!@#"}' \
  -k

# 2. Monitor Redis
redis-cli MONITOR

# 3. Test reconnect qua browser (Socket.IO không support curl)
```

---

**Status**: ✅ Ready to test manually
**Time needed**: 5-10 minutes per test scenario
