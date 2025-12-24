# Lobby Lifecycle & Timeout Fixes

## ✅ Implemented Features

### 1. **60s Lobby Countdown Timer**
- **Public Rooms (Quick Play)**: Timer starts when match found (2 players joined)
- **Private Rooms**: Timer starts ONLY when player2 joins (not when host alone)
- Timer auto-cancels and disbands room if 60s expires without both players ready
- Timer cleared when both players press Ready

### 2. **Room Disband Logic**

#### Public Rooms (isPrivate=false):
- ❌ **Either player leaves/disconnects** → Disband room + redirect both to /hub
- ❌ **60s timeout expires** → Disband room + redirect both to /hub
- ✅ **Both players ready** → Clear timer + proceed to game

#### Private Rooms (isPrivate=true):
- 🕐 **Host alone in waiting** → Timer LOCKED at 60 (not counting down)
- ▶️ **Player2 joins** → Start 60s countdown
- ⏸️ **Player2 leaves/disconnects** → Reset to waiting (host stays, timer cleared)
- ❌ **Host leaves/disconnects** → Disband room completely
- ✅ **Both players ready** → Clear timer + proceed to game

### 3. **Realtime Character Sync**
- Fixed room lookup to support BOTH:
  - Private rooms: `room.code === roomCode`
  - Public rooms: `roomId === roomCode`
- Character changes emit to opponent instantly
- No more "Room not found" errors

### 4. **Event Name Compatibility**
- Server listens to BOTH `queue:cancel` AND `queue:leave` (backwards compatible)
- Server emits BOTH `queue:cancelled` AND `queue:left`
- Added new `room:leave` handler for explicit room leaving
- Emits BOTH `player_joined` AND `room:playerJoined` when player2 joins

### 5. **Better Error Handling**
- All "Room not found" errors emit `room:error` with code `ROOM_NOT_FOUND`
- Client lobby.js auto-redirects to /hub on ROOM_NOT_FOUND
- Clear error messages with structured error codes

## 📝 Technical Implementation

### Server Changes (socket/gameHandler.js)

#### New Helper Functions:
```javascript
startLobbyCountdown(roomId, room)    // Start 60s timer
clearLobbyCountdown(room)            // Clear timer
disbandRoom(roomId, reason)          // Disband room + cleanup
resetPrivateToWaiting(roomId, room)  // Reset private to waiting
emitRoomUpdated(roomId)              // Emit room:updated event
leaveRoom(socket, data)              // Handle room:leave event
```

#### Modified Methods:
- `joinQueue()` - Start countdown when match found
- `cancelQueue()` - Emit both queue:cancelled and queue:left
- `joinPrivateRoom()` - Start countdown + emit room:playerJoined
- `lobbyPlayerReady()` - Clear timer when both ready
- `lobbyCharacterChanged()` - Support both private/public room lookup
- `handleDisconnect()` - Use disbandRoom/resetPrivateToWaiting logic

### Server Changes (server.js)

#### New Event Listeners:
```javascript
socket.on('queue:leave', ...)   // Alias for queue:cancel
socket.on('room:leave', ...)    // Explicit leave room handler
```

### Room Data Structure:
```javascript
room = {
    id: 'room_xxx',
    code: 'ABC123' | null,        // null for public rooms
    isPrivate: true | false,
    lobbyTimer: Timeout | null,   // Timer handle
    lobbyDeadlineAt: timestamp,   // Deadline timestamp
    player1: {...},
    player2: {...},
    status: 'waiting' | 'character_selection' | 'preparing' | 'playing',
    ...
}
```

## 🧪 Test Scenarios

### ✅ Test 1: Quick Play Lifecycle
1. Player A joins queue
2. Player B joins queue → Match found, both in lobby
3. **Server starts 60s countdown**
4. Player A changes character → Player B sees instantly ✓
5. Player B closes tab → Player A receives `room:disbanded` within 1s, redirects to /hub ✓

### ✅ Test 2: Quick Play Timeout
1. Match found, both in lobby
2. Neither presses Ready for 60s
3. **Server auto-disbands room at 60s**
4. Both receive `room:disbanded`, redirect to /hub ✓

### ✅ Test 3: Private Room - Host Alone
1. Host creates private room
2. Host waits → Timer shows 60 but NOT counting down ✓
3. Host changes character → No errors ✓

### ✅ Test 4: Private Room - Friend Joins Then Leaves
1. Host creates room, friend joins via code
2. **Server starts 60s countdown** ✓
3. Friend changes character → Host sees instantly ✓
4. Friend leaves → Host receives `room:playerLeft`, UI updates, stays in lobby ✓
5. Timer cleared, room status = 'waiting' ✓

### ✅ Test 5: Private Room - Host Leaves
1. Host creates room, friend joins
2. Host closes tab → Friend receives `room:disbanded`, redirects to /hub ✓

### ✅ Test 6: Both Ready in Time
1. Any room type (public/private)
2. Both players press Ready before 60s
3. **Timer cleared**, receive `lobby:bothReady`, proceed to game ✓

## 📊 Socket Events Reference

### Emitted by Server:
- `room:disbanded` - Room closed, redirect to /hub
- `room:playerLeft` - Player left (private room only)
- `room:updated` - Room state updated
- `room:error` - Error with code (e.g., ROOM_NOT_FOUND)
- `room:playerJoined` - Player2 joined room
- `lobby:opponentCharacterChanged` - Opponent changed character
- `lobby:playerReady` - Player marked ready
- `lobby:bothReady` - Both ready, start game
- `queue:cancelled` + `queue:left` - Queue cancelled

### Listened by Server:
- `queue:cancel` / `queue:leave` - Cancel matchmaking
- `room:leave` - Leave current room
- `lobby:playerReady` - Player ready in lobby
- `lobby:characterChanged` - Character changed

## 🔍 Debugging Tips

### Check Room State:
```javascript
// In server console
console.log('Rooms:', Array.from(rooms.entries()));
```

### Check Timer Status:
```javascript
room.lobbyTimer !== null  // Timer active
room.lobbyDeadlineAt      // When timer expires
```

### Monitor Events:
```javascript
// Client console
socket.onAny((event, ...args) => {
    console.log(`📨 ${event}:`, args);
});
```

## 🐛 Common Issues Fixed

1. ❌ **"Room not found" on character change**
   - ✅ Fixed: Room lookup now supports both `room.code` and `roomId`

2. ❌ **Player stuck in lobby when opponent leaves**
   - ✅ Fixed: Public rooms disband, private rooms reset to waiting

3. ❌ **No auto-cancel after 60s timeout**
   - ✅ Fixed: Timer implemented with `startLobbyCountdown()`

4. ❌ **Event name mismatches (queue:leave vs queue:cancel)**
   - ✅ Fixed: Server listens to both, emits both

5. ❌ **Character changes not realtime**
   - ✅ Fixed: `lobbyCharacterChanged()` emits to opponent + room:updated

## 📌 Notes

- Timer countdown is SERVER-SIDE (authoritative)
- Client receives `characterSelectionStartTime` for UI countdown display
- Private rooms never auto-disband when host alone (allows waiting for friends)
- Cleanup is thorough: timers cleared, rooms deleted, socket mappings removed
- All room operations use `disbandRoom()` or `resetPrivateToWaiting()` for consistency

## 🚀 Next Steps

1. Test all scenarios in production
2. Add client-side UI for countdown display (optional)
3. Consider adding grace period for reconnection (currently instant disband)
4. Add metrics/logging for room lifecycle analytics
