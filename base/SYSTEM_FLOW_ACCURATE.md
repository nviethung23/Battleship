# BATTLESHIP GAME - DATA FLOW DIAGRAM (100% ACCURATE)
## Dựa trên source code thực tế

**Cập nhật:** 24/12/2024  
**Verified from:** server.js, gameHandler.js, chatHandler.js, webrtcHandler.js, authController.js, database.js

---

## 1. ERD - ENTITY RELATIONSHIP DIAGRAM

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                        ERD - BATTLESHIP DATABASE (MongoDB Atlas)                       │
│                              Database: test                                            │
└───────────────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────┐
                    │           USER                │
                    │      (users collection)       │
                    ├───────────────────────────────┤
                    │ _id          : ObjectId (PK)  │
                    │ username     : String UNIQUE  │
                    │ email        : String         │
                    │ password     : String (hash)  │
                    │ role         : String         │
                    │              (user|admin)     │
                    │ isGuest      : Boolean        │
                    │ guestDisplayName : String     │
                    │ lastSeenAt   : Date           │
                    │ expiresAt    : Date (TTL idx) │
                    │ createdAt    : Date           │
                    │ updatedAt    : Date           │
                    └──────────────┬────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │ 1:N                    │ 1:N                    │ 1:N
          ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│        GAME         │  │    CHAT_MESSAGE     │  │      CALL_LOG       │
│  (games collection) │  │ (chatmessages coll) │  │ (calllogs coll)     │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ _id      : ObjectId │  │ _id      : ObjectId │  │ _id      : ObjectId │
│ roomId   : String   │  │ roomId   : String   │  │ roomId   : String   │
│ player1Id: String   │◄─│ gameId   : ObjectId │  │ gameId   : ObjectId │
│ player1Username     │  │ userId   : String   │  │ callerId : String   │
│ player1IsGuest      │  │ username : String   │  │ callerUsername      │
│ player1DisplayName  │  │ isGuest  : Boolean  │  │ receiverId: String  │
│ player2Id: String   │  │ message  : String   │  │ receiverUsername    │
│ player2Username     │  │ messageType: String │  │ callType : String   │
│ player2IsGuest      │  │  (text|system)      │  │  (video|audio)      │
│ player2DisplayName  │  │ timestamp: Date     │  │ status   : String   │
│ winnerId : String   │  │ createdAt: Date     │  │  (initiated|        │
│ winnerUsername      │  │ updatedAt: Date     │  │   accepted|rejected|│
│ duration : Number   │  │ TTL: 7 days index   │  │   ended)            │
│ startedAt: Date     │  └─────────────────────┘  │ startedAt: Date     │
│ endedAt  : Date     │                           │ answeredAt: Date    │
│ createdAt: Date     │                           │ endedAt  : Date     │
│ updatedAt: Date     │                           │ duration : Number   │
└─────────────────────┘                           │ createdAt: Date     │
                                                  │ updatedAt: Date     │
                                                  └─────────────────────┘
```

---

## 2. IN-MEMORY DATA STRUCTURES (Server Runtime)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                    IN-MEMORY STORAGE (gameHandler.js)                                  │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  rooms (Map)                                                                         │
│  Key: roomId (string "room_xxx")                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Value: {                                                                           │
│    id: string,                    // "room_xxx"                                     │
│    code: string,                  // "ABC123" (6-char for private rooms)            │
│    isPrivate: boolean,                                                              │
│    status: string,                // "waiting"|"character_selection"|               │
│                                   // "preparing"|"playing"|"finished"               │
│    player1: {                                                                       │
│      userId: string,                                                                │
│      username: string,                                                              │
│      socketId: string,                                                              │
│      ready: boolean,              // Ship placement done                            │
│      lobbyReady: boolean,         // Lobby ready clicked                            │
│      characterId: number|string,  // 0,1,2 or "character1","character2","character3"│
│      characterLocked: boolean,                                                      │
│      isGuest: boolean,                                                              │
│      guestDisplayName: string|null,                                                 │
│      ships: Array,                // Ship positions (after placement)              │
│      board: Array                 // 10x10 board array                             │
│    },                                                                               │
│    player2: {...same as player1} | null,                                            │
│    characterSelectionStartTime: number,                                             │
│    lobbyDeadlineAt: number,       // For 60s timeout                               │
│    lobbyTimer: Timeout,                                                             │
│    battleDisconnectTimer: Timeout,                                                  │
│    createdAt: number,                                                               │
│    gameId: string                                                                   │
│  }                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  games (Map)                                                                         │
│  Key: roomId (string)                                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Value: {                                                                           │
│    roomId: string,                                                                  │
│    player1: {                                                                       │
│      ...playerData,                                                                 │
│      characterId: string,         // "character1"|"character2"|"character3"         │
│      attackedCells: Array,        // [{row, col, hit}] - attacks received          │
│      ships: Array                 // [{name, size, positions, hits}]               │
│    },                                                                               │
│    player2: {...same},                                                              │
│    currentTurn: string,           // userId of current player                       │
│    startTime: number,             // Game start timestamp                           │
│    turnStartTime: number,                                                           │
│    turnTimeLimit: 60000,          // 60 seconds                                     │
│    turnTimer: Timeout,                                                              │
│    turnCountdownInterval: Interval,                                                 │
│    turnTimeRemaining: number                                                        │
│  }                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  playerSockets (Map)                                                                 │
│  Key: userId (string)                                                                │
│  Value: socketId (string)                                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  matchmakingQueue (Array)                                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  [{socketId, userId, username, isGuest, guestDisplayName, queuedAt}, ...]           │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  activeCalls (Map) - webrtcHandler.js                                                │
│  Key: roomId (string)                                                                │
│  Value: {callId, callerId, callerSocketId, startedAt, answeredAt}                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DATA FLOW DIAGRAM - AUTHENTICATION

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION DATA FLOW                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════
                              REGISTER FLOW
══════════════════════════════════════════════════════════════════════════════════════════

┌──────────┐    POST /api/register      ┌────────────────┐    Database.createUser()    ┌─────────┐
│  CLIENT  │ ──────────────────────────►│ authController │ ────────────────────────────►│ MongoDB │
│(auth.js) │    {username, email,       │   register()   │    User.save()              │  users  │
│          │     password}              │                │                              │         │
│          │                            │ - sanitize     │                              │         │
│          │                            │ - validate     │                              │         │
│          │                            │ - bcrypt.hash  │                              │         │
│          │◄──────────────────────────│ - jwt.sign     │◄────────────────────────────│         │
│          │    {token, user}           │                │    user document             │         │
└──────────┘                            └────────────────┘                              └─────────┘
     │
     │ localStorage.setItem('token', token)
     │ localStorage.setItem('userId', user.id)
     │ localStorage.setItem('username', user.username)
     │ sessionStorage.setItem('bs_token', token)
     │
     ▼
┌──────────┐
│ hub.html │
└──────────┘

══════════════════════════════════════════════════════════════════════════════════════════
                              LOGIN FLOW
══════════════════════════════════════════════════════════════════════════════════════════

┌──────────┐    POST /api/login         ┌────────────────┐    Database.findUserByUsername()  ┌─────────┐
│  CLIENT  │ ──────────────────────────►│ authController │ ────────────────────────────────►│ MongoDB │
│(auth.js) │    {username, password}    │    login()     │                                   │  users  │
│          │                            │                │                                   │         │
│          │                            │ - sanitize     │                                   │         │
│          │                            │ - bcrypt.compare│                                  │         │
│          │◄──────────────────────────│ - jwt.sign     │◄──────────────────────────────────│         │
│          │    {token, user}           │                │    user document                  │         │
└──────────┘                            └────────────────┘                                   └─────────┘

══════════════════════════════════════════════════════════════════════════════════════════
                              GUEST LOGIN FLOW
══════════════════════════════════════════════════════════════════════════════════════════

┌──────────┐    POST /api/guest-login   ┌────────────────┐    Database.createUser()    ┌─────────┐
│  CLIENT  │ ──────────────────────────►│ authController │ ────────────────────────────►│ MongoDB │
│(guestLogin.js)  {guestName}           │  guestLogin()  │    {                         │  users  │
│          │                            │                │      username: guest_xxx,    │         │
│          │                            │ - sanitize     │      isGuest: true,          │         │
│          │                            │ - generate     │      guestDisplayName,       │         │
│          │                            │   guest_xxx    │      expiresAt: +24h         │         │
│          │◄──────────────────────────│ - jwt.sign     │    }                          │         │
│          │    {token, user{isGuest}}  │   (24h exp)    │◄────────────────────────────│         │
└──────────┘                            └────────────────┘                              └─────────┘
```

---

## 4. DATA FLOW DIAGRAM - SOCKET CONNECTION

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                         SOCKET CONNECTION DATA FLOW                                    │
└───────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════
                         CLIENT → SERVER CONNECTION
══════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────┐                              ┌─────────────────┐
│     CLIENT      │                              │     SERVER      │
│ (socket-shared.js)                             │  (server.js)    │
└────────┬────────┘                              └────────┬────────┘
         │                                                │
         │  io.connect(SERVER, {                          │
         │    auth: { token: JWT }                        │
         │  })                                            │
         │ ──────────────────────────────────────────────►│
         │                                                │
         │                                  io.use() middleware:
         │                                  │ jwt.verify(token)
         │                                  │ socket.userId = decoded.id
         │                                  │ socket.username = decoded.username
         │                                  │ socket.isGuest = decoded.isGuest
         │                                  │ socket.guestName = decoded.guestName
         │                                                │
         │                                  'connection' event:
         │                                  │ console.log connected
         │                                  │ playerSockets.set(userId, socketId)
         │                                                │
         │◄──────────────────────────────────────────────│
         │  emit('connected', {                          │
         │    userId, username, socketId                 │
         │  })                                           │
         │                                                │
```

---

## 5. DATA FLOW DIAGRAM - GAME FLOW (COMPLETE)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE GAME DATA FLOW                                        │
└───────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════
PHASE 1: MATCHMAKING (hub.js → gameHandler.js)
══════════════════════════════════════════════════════════════════════════════════════════

[QUICK PLAY]
┌────────┐  emit('queue:join')     ┌─────────────┐
│ Client │ ───────────────────────►│ gameHandler │
│ hub.js │                         │ joinQueue() │
└────────┘                         └──────┬──────┘
                                          │
                                          │ matchmakingQueue.push({
                                          │   socketId, userId, username,
                                          │   isGuest, guestDisplayName, queuedAt
                                          │ })
                                          │
                                   ┌──────▼──────┐
                                   │ Queue ≥ 2?  │
                                   └──────┬──────┘
                                          │ YES
                                          │ processMatchmaking()
                                          │ - pop 2 players from queue
                                          │ - create room (generateRoomId + generateRoomCode)
                                          │ - rooms.set(roomId, room)
                                          │ - both sockets.join(roomId)
                                          ▼
┌────────┐◄─ emit('match:found', {room})  │
│ Client │                                │
└────────┘                                │

[CREATE PRIVATE ROOM]
┌────────┐  emit('room:createPrivate')    ┌─────────────┐
│ Client │ ──────────────────────────────►│ gameHandler │
│ hub.js │                                │createPrivateRoom()
└────────┘                                └──────┬──────┘
                                                 │
                                                 │ room = {
                                                 │   id: "room_xxx",
                                                 │   code: "ABC123",  // 6-char
                                                 │   isPrivate: true,
                                                 │   status: "waiting",
                                                 │   player1: {...}
                                                 │ }
                                                 │ rooms.set(roomId, room)
                                                 ▼
┌────────┐◄─ emit('room:created', {roomCode})    │
│ Client │                                       │
└────────┘                                       │

[JOIN PRIVATE ROOM]
┌────────┐  emit('room:joinPrivate', {code})    ┌─────────────┐
│ Client │ ────────────────────────────────────►│ gameHandler │
│ hub.js │                                      │joinPrivateRoom()
└────────┘                                      └──────┬──────┘
                                                       │
                                                       │ findRoomByCodeOrId(code)
                                                       │ room.player2 = {...}
                                                       │ room.status = "character_selection"
                                                       │ socket.join(roomId)
                                                       ▼
┌────────┐◄─ emit('player_joined', {room})             │
│ Client │                                             │
└────────┘                                             │

══════════════════════════════════════════════════════════════════════════════════════════
PHASE 2: LOBBY (lobby.js → gameHandler.js)
══════════════════════════════════════════════════════════════════════════════════════════

┌────────┐  emit('room:requestInfo', {roomCode})    ┌─────────────┐
│ Client │ ────────────────────────────────────────►│ gameHandler │
│lobby.js│                                          │requestRoomInfo()
└────────┘                                          └──────┬──────┘
         │                                                 │
         │◄──── emit('room:joined', {room}) ──────────────│
         │                                                 │
         │  emit('lobby:ready')                           │
         │ ───────────────────────────────────────────────►│
         │                                                 │ player.lobbyReady = true
         │                                                 │
         │◄──── emit('lobby:playerReady', {userId}) ──────│
         │                                                 │
         │                        [Both lobbyReady?]       │
         │                                                 │
         │◄──── emit('lobby:bothReady') ──────────────────│
         │                                                 │
         ▼                                                 │
┌────────────────┐                                         │
│ Redirect to    │                                         │
│   game.html    │                                         │
└────────────────┘                                         │

══════════════════════════════════════════════════════════════════════════════════════════
PHASE 3: SHIP DEPLOYMENT (game.js → gameHandler.js)
══════════════════════════════════════════════════════════════════════════════════════════

┌────────┐  emit('rejoin_game', {roomId, userId})    ┌─────────────┐
│ Client │ ─────────────────────────────────────────►│ gameHandler │
│ game.js│                                           │ rejoinGame()│
└────────┘                                           └──────┬──────┘
         │                                                  │
         │ [If game exists]                                 │
         │◄──── emit('rejoin_game_success', {...}) ────────│
         │                                                  │
         │ [If no game, wait for deployment]                │
         │                                                  │
         │  emit('player_ready', {                          │
         │    roomId, userId,                               │
         │    ships: [{name, size, positions}],             │
         │    board: [10x10 array]                          │
         │  })                                              │
         │ ────────────────────────────────────────────────►│
         │                                           │ GameLogic.isValidBoard(ships)
         │                                           │ player.ready = true
         │                                           │ player.ships = ships
         │                                           │ player.board = board
         │                                                  │
         │◄──── emit('player_ready_update', {              │
         │        player1Ready, player2Ready               │
         │      }) ────────────────────────────────────────│
         │                                                  │
         │                    [Both ready?]                 │
         │                                                  │
         │              startGame(roomId)                   │

══════════════════════════════════════════════════════════════════════════════════════════
PHASE 4: BATTLE (game.js → gameHandler.js)
══════════════════════════════════════════════════════════════════════════════════════════

                              startGame(roomId):
                              │
                              │ games.set(roomId, {
                              │   player1: {..., attackedCells: [], ships: [...]},
                              │   player2: {..., attackedCells: [], ships: [...]},
                              │   currentTurn: player1.userId,
                              │   turnTimeLimit: 60000
                              │ })
                              │
                              │ startTurnTimer(roomId)
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌────────┐◄─ emit('game_started', {              ┌────────┐
│Player 1│     currentTurn, player1, player2     │Player 2│
└────────┘   }) ─────────────────────────────────►└────────┘

[ATTACK FLOW]
┌────────┐  emit('attack', {roomId, userId, row, col})    ┌─────────────┐
│ Client │ ──────────────────────────────────────────────►│ gameHandler │
│(attacker)                                               │   attack()  │
└────────┘                                                └──────┬──────┘
                                                                 │
                                                   │ Check: game.currentTurn === userId
                                                   │ GameLogic.processAttack(...)
                                                   │ defender.attackedCells.push({row, col, hit})
                                                                 │
                                                          ┌──────┴──────┐
                                                          │  HIT/MISS?  │
                                                          └──────┬──────┘
                                                   ┌─────────────┴─────────────┐
                                                   │                           │
                                             [HIT]                       [MISS]
                                                   │                           │
         ┌─────────────────────────────────────────┤                           ├─────────────────────────────────────────┐
         │                                         │                           │                                         │
         ▼                                         ▼                           ▼                                         ▼
┌────────┐◄─ emit('attack_result', {hit:true})    │    emit('attack_result', {hit:false}) ─────────────────────────────►┌────────┐
│ Both   │                                        │                                                                      │ Both   │
│Players │◄─ emit('turn_continue', {              │    emit('turn_changed', {currentTurn: defender.userId}) ────────────►│Players │
└────────┘     currentTurn: attacker.userId       │                                                                      └────────┘
         │   })                                   │    game.currentTurn = defender.userId
         │                                        │    startTurnTimer(roomId)
         │ [Attacker keeps turn, shoots again]    │
         │                                        │

[TURN TIMER]
                              ┌───────────────────┐
                              │ turnCountdownInterval (1s)
                              │ emit('battle_timer_update', {timeRemaining})
                              │
                              │ At 10s: emit('battle_timer_warning')
                              │
                              │ At 0s: turnTimer fires
                              │  └─► emit('turn_timeout')
                              │  └─► emit('turn_changed')
                              │  └─► startTurnTimer() for next player
                              └───────────────────┘

[GAME OVER]
                                                   │
                                           GameLogic.isGameOver(defender.ships)?
                                                   │ YES
                                                   ▼
                                           endGame(roomId, winnerId)
                                                   │
                                           │ Database.createGame({
                                           │   roomId, player1Id, player2Id,
                                           │   winnerId, duration, ...
                                           │ })
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌────────┐◄─ emit('game_over', {                                            ┌────────┐
│ Winner │     winner, winnerId, winnerCharacterId,                         │ Loser  │
│        │     loser, loserId, loserCharacterId,                            │        │
│        │     duration                                                     │        │
└────────┘   })                                                             └────────┘

══════════════════════════════════════════════════════════════════════════════════════════
PHASE 5: DISCONNECT HANDLING
══════════════════════════════════════════════════════════════════════════════════════════

[DURING BATTLE]
┌────────┐  disconnect                            ┌─────────────┐
│ Client │ ──────────────────────────────────────►│ gameHandler │
│        │                                        │handleDisconnect()
└────────┘                                        └──────┬──────┘
                                                         │
                                                  │ player.disconnected = true
                                                  │ player.disconnectedAt = Date.now()
                                                  │
                                                  │ emit('player_disconnected', {
                                                  │   username, countdown: 30
                                                  │ })
                                                  │
                                                  │ room.battleDisconnectTimer = setTimeout(
                                                  │   30000, () => {
                                                  │     emit('player_disconnect_timeout')
                                                  │     endGame(roomId, opponent.userId)
                                                  │   }
                                                  │ )
                                                         │
                                                         ▼
┌────────┐◄─ emit('player_disconnected', {countdown: 30})
│Opponent│
└────────┘

[RECONNECT]
┌────────┐  emit('rejoin_game', {...})            ┌─────────────┐
│ Client │ ──────────────────────────────────────►│ gameHandler │
│        │                                        │ rejoinGame()│
└────────┘                                        └──────┬──────┘
                                                         │
                                                  │ clearTimeout(battleDisconnectTimer)
                                                  │ player.disconnected = false
                                                  │ playerSockets.set(userId, socketId)
                                                  │
                                                  │ emit('rejoin_game_success', {
                                                  │   myBoard, myShips,
                                                  │   myAttacks, enemyAttacks
                                                  │ })
                                                  │
                                                  │ emit('player_reconnected') to opponent
                                                         │
                                                         ▼
┌────────┐◄─ emit('player_reconnected')
│Opponent│
└────────┘
```

---

## 6. DATA FLOW DIAGRAM - CHAT

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              CHAT DATA FLOW                                            │
└───────────────────────────────────────────────────────────────────────────────────────┘

[SEND MESSAGE]
┌────────┐  emit('chat_message', {                   ┌─────────────┐      ┌─────────┐
│ Client │    roomId, userId, username,              │ chatHandler │      │ MongoDB │
│chat.js │    message, isGuest                       │sendMessage()│      │chatmessages│
└────────┘  })───────────────────────────────────────►└──────┬──────┘      └────┬────┘
                                                            │                   │
                                                     │ sanitizeChatMessage()    │
                                                     │ getActualRoomId()        │
                                                     │                          │
                                                     │ ChatMessage.save({       │
                                                     │   roomId, userId,        │
                                                     │   message, messageType,  │
                                                     │   timestamp              │
                                                     │ }) ─────────────────────►│
                                                     │                          │
                                                     │ io.to(roomId).emit(      │
                                                     │   'chat_message', {...}  │
                                                     │ )                        │
                                                            │
         ┌──────────────────────────────────────────────────┴──────────────────────────────────────────────────┐
         ▼                                                                                                      ▼
┌────────┐◄─ emit('chat_message', {userId, username, message, timestamp, messageId})                          ┌────────┐
│ Sender │                                                                                                     │Receiver│
└────────┘                                                                                                     └────────┘

[GET HISTORY]
┌────────┐  emit('get_chat_history', {roomId, limit})    ┌─────────────┐      ┌─────────┐
│ Client │ ─────────────────────────────────────────────►│ chatHandler │      │ MongoDB │
│        │                                               │getChatHistory()    │         │
└────────┘                                               └──────┬──────┘      └────┬────┘
         │                                                      │                   │
         │                                              │ ChatMessage.find({roomId})│
         │                                              │   .sort({timestamp: -1})  │
         │                                              │   .limit(50) ────────────►│
         │                                              │◄─────────────────────────│
         │                                                      │
         │◄─ emit('chat_history', {roomId, messages, hasMore}) │
         │                                                      │
```

---

## 7. DATA FLOW DIAGRAM - WEBRTC CALLS

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              WEBRTC CALL DATA FLOW                                     │
└───────────────────────────────────────────────────────────────────────────────────────┘

[CALL REQUEST]
┌────────┐  emit('call_request', {roomId, username,      ┌─────────────┐      ┌─────────┐
│ Caller │    userId, callType})                         │webrtcHandler│      │ MongoDB │
│        │ ─────────────────────────────────────────────►│callRequest()│      │calllogs │
└────────┘                                               └──────┬──────┘      └────┬────┘
                                                                │                   │
                                                         │ CallLog.save({          │
                                                         │   roomId, callerId,     │
                                                         │   status: 'initiated'   │
                                                         │ }) ─────────────────────►│
                                                         │                          │
                                                         │ activeCalls.set(roomId, {│
                                                         │   callId, callerId,      │
                                                         │   callerSocketId         │
                                                         │ })                       │
                                                         │                          │
                                                         │ socket.to(roomId).emit(  │
                                                         │   'call_request', {...}  │
                                                         │ )                        │
                                                                │
                                                                ▼
┌────────┐◄─ emit('call_request', {from, callId, callType})
│Receiver│
└────────┘

[CALL ACCEPTED]
┌────────┐  emit('call_accepted', {roomId, callId})      ┌─────────────┐
│Receiver│ ─────────────────────────────────────────────►│webrtcHandler│
│        │                                               │callAccepted()│
└────────┘                                               └──────┬──────┘
                                                                │
                                                         │ CallLog.findByIdAndUpdate(callId, {
                                                         │   status: 'accepted',
                                                         │   answeredAt: new Date()
                                                         │ })
                                                         │
                                                         │ socket.to(roomId).emit('call_accepted')
                                                                │
                                                                ▼
┌────────┐◄─ emit('call_accepted')
│ Caller │
└────────┘

[WEBRTC SIGNALING]
┌────────┐  emit('webrtc_offer', {roomId, offer})        ┌─────────────┐      ┌────────┐
│ Caller │ ─────────────────────────────────────────────►│webrtcHandler│─────►│Receiver│
└────────┘                                               │ sendOffer() │      └────────┘
                                                         └─────────────┘
┌────────┐  emit('webrtc_answer', {roomId, answer})      ┌─────────────┐      ┌────────┐
│Receiver│ ─────────────────────────────────────────────►│webrtcHandler│─────►│ Caller │
└────────┘                                               │sendAnswer() │      └────────┘
                                                         └─────────────┘
┌────────┐  emit('webrtc_ice_candidate', {roomId, candidate})  ┌─────────────┐      ┌────────┐
│ Both   │ ───────────────────────────────────────────────────►│webrtcHandler│─────►│ Other  │
└────────┘                                                     │sendIceCandidate()  └────────┘
                                                               └─────────────┘

[END CALL]
┌────────┐  emit('end_call', {roomId, callId})           ┌─────────────┐
│ Either │ ─────────────────────────────────────────────►│webrtcHandler│
│ Player │                                               │  endCall()  │
└────────┘                                               └──────┬──────┘
                                                                │
                                                         │ CallLog.findByIdAndUpdate(callId, {
                                                         │   status: 'ended',
                                                         │   endedAt: new Date(),
                                                         │   duration: calculated
                                                         │ })
                                                         │
                                                         │ activeCalls.delete(roomId)
                                                         │
                                                         │ socket.to(roomId).emit('call_ended')
                                                                │
                                                                ▼
┌────────┐◄─ emit('call_ended')
│ Other  │
└────────┘
```

---

## 8. SOCKET EVENTS REFERENCE (COMPLETE LIST)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                      SOCKET EVENTS - CLIENT → SERVER                                   │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┬─────────────────────────┬─────────────────────────────────────┐
│ Event Name              │ Handler                  │ Data                                │
├─────────────────────────┼─────────────────────────┼─────────────────────────────────────┤
│ queue:join              │ gameHandler.joinQueue    │ {}                                  │
│ queue:leave             │ gameHandler.leaveQueue   │ {}                                  │
│ room:createPrivate      │ gameHandler.createPrivate│ {}                                  │
│ room:joinPrivate        │ gameHandler.joinPrivate  │ {code}                              │
│ room:requestInfo        │ gameHandler.requestInfo  │ {roomCode}                          │
│ room:leave              │ gameHandler.leaveRoom    │ {userId}                            │
│ lobby:ready             │ gameHandler.lobbyReady   │ {}                                  │
│ lobby:characterChanged  │ gameHandler.charChanged  │ {roomCode, characterIndex}          │
│ create_room             │ gameHandler.createRoom   │ {userId, username}                  │
│ join_room               │ gameHandler.joinRoom     │ {roomId, userId, username}          │
│ character_selected      │ gameHandler.charSelected │ {roomId, userId, characterId}       │
│ character_locked        │ gameHandler.charLocked   │ {roomId, userId, characterId}       │
│ player_ready            │ gameHandler.playerReady  │ {roomId, userId, ships, board}      │
│ rejoin_game             │ gameHandler.rejoinGame   │ {roomId, userId}                    │
│ attack                  │ gameHandler.attack       │ {roomId, userId, row, col}          │
│ chat_message            │ chatHandler.sendMessage  │ {roomId, userId, username, message} │
│ get_chat_history        │ chatHandler.getChatHistory│ {roomId, limit, before}            │
│ player_typing           │ chatHandler.playerTyping │ {roomId, username}                  │
│ webrtc_offer            │ webrtcHandler.sendOffer  │ {roomId, offer}                     │
│ webrtc_answer           │ webrtcHandler.sendAnswer │ {roomId, answer}                    │
│ webrtc_ice_candidate    │ webrtcHandler.sendIce    │ {roomId, candidate}                 │
│ call_request            │ webrtcHandler.callRequest│ {roomId, username, userId, callType}│
│ call_accepted           │ webrtcHandler.callAccepted│ {roomId, callId}                   │
│ call_rejected           │ webrtcHandler.callRejected│ {roomId, callId}                   │
│ end_call                │ webrtcHandler.endCall    │ {roomId, callId}                    │
└─────────────────────────┴─────────────────────────┴─────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                      SOCKET EVENTS - SERVER → CLIENT                                   │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┬─────────────────────────────────────────────────────────┐
│ Event Name                  │ Data                                                    │
├─────────────────────────────┼─────────────────────────────────────────────────────────┤
│ connected                   │ {userId, username, socketId}                            │
│ queue:waiting               │ {position}                                              │
│ queue:left                  │ {}                                                      │
│ match:found                 │ {room}                                                  │
│ room:created                │ {roomCode, room}                                        │
│ room:joined                 │ {room}                                                  │
│ room:updated                │ {room}                                                  │
│ room:playerJoined           │ {room}                                                  │
│ room:playerLeft             │ {leftUserId, room}                                      │
│ room:disbanded              │ {reason, code, roomId}                                  │
│ room:error                  │ {message, code}                                         │
│ lobby:playerReady           │ {userId, username}                                      │
│ lobby:bothReady             │ {}                                                      │
│ lobby:opponentCharacterChanged │ {characterIndex}                                     │
│ player_joined               │ {room, characterSelectionStartTime}                     │
│ character_selected          │ {userId, characterId, room}                             │
│ character_locked            │ {userId, characterId, room}                             │
│ character_selection_complete│ {room}                                                  │
│ player_ready_update         │ {player1Ready, player2Ready}                            │
│ game_started                │ {currentTurn, player1, player2}                         │
│ rejoin_game_success         │ {roomId, currentTurn, myBoard, myShips, myAttacks, ...} │
│ rejoin_game_failed          │ {message}                                               │
│ attack_result               │ {attacker, attackerId, defender, defenderId, row, col,  │
│                             │  hit, sunk, shipSunk}                                   │
│ turn_changed                │ {currentTurn, currentPlayer}                            │
│ turn_continue               │ {currentTurn, currentPlayer, message}                   │
│ turn_timeout                │ {timeoutPlayer}                                         │
│ battle_timer_update         │ {timeRemaining, currentTurn}                            │
│ battle_timer_warning        │ {message, timeRemaining}                                │
│ game_over                   │ {winner, winnerId, winnerCharacterId, loser, loserId,   │
│                             │  loserCharacterId, duration}                            │
│ player_disconnected         │ {username, countdown}                                   │
│ player_reconnected          │ {username, userId}                                      │
│ player_disconnect_timeout   │ {disconnectedPlayer, winner, message}                   │
│ chat_message                │ {userId, username, message, timestamp, messageId, isGuest}│
│ chat_history                │ {roomId, messages, hasMore}                             │
│ player_typing               │ {username}                                              │
│ call_request                │ {callId, from, fromUserId, fromSocketId, callType}      │
│ call_accepted               │ {from}                                                  │
│ call_rejected               │ {from}                                                  │
│ call_ended                  │ {from}                                                  │
│ webrtc_offer                │ {offer, from}                                           │
│ webrtc_answer               │ {answer, from}                                          │
│ webrtc_ice_candidate        │ {candidate, from}                                       │
└─────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 9. API ENDPOINTS REFERENCE

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              REST API ENDPOINTS                                        │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────┬─────────────────────────┬───────────────────────────┬─────────────────────────┐
│ Method  │ Endpoint                │ Handler                   │ Auth Required           │
├─────────┼─────────────────────────┼───────────────────────────┼─────────────────────────┤
│ POST    │ /api/register           │ authController.register   │ No                      │
│ POST    │ /api/login              │ authController.login      │ No                      │
│ POST    │ /api/guest-login        │ authController.guestLogin │ No                      │
│ GET     │ /api/profile            │ authController.getProfile │ Yes (JWT)               │
│ GET     │ /                       │ serve index.html          │ No                      │
│ GET     │ /hub                    │ serve hub.html            │ No (client checks)      │
│ GET     │ /lobby                  │ serve lobby.html          │ No (client checks)      │
│ GET     │ /game                   │ serve game.html           │ No (client checks)      │
│ GET     │ /admin                  │ serve admin.html          │ No (client checks)      │
└─────────┴─────────────────────────┴───────────────────────────┴─────────────────────────┘
```

---

## 10. ROOM STATUS STATE MACHINE

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           ROOM STATUS TRANSITIONS                                      │
└───────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   waiting   │ (Created, waiting for player2)
                              └──────┬──────┘
                                     │
                                     │ player2 joins
                                     ▼
                         ┌───────────────────────┐
                         │ character_selection   │ (Both players in, selecting characters)
                         └───────────┬───────────┘
                                     │
                                     │ Both characters locked
                                     ▼
                              ┌─────────────┐
                              │  preparing  │ (Ship placement phase)
                              └──────┬──────┘
                                     │
                                     │ Both players ready (ships placed)
                                     ▼
                              ┌─────────────┐
                              │   playing   │ (Battle in progress)
                              └──────┬──────┘
                                     │
                                     │ All ships sunk OR player left
                                     ▼
                              ┌─────────────┐
                              │  finished   │ (Game ended, cleanup in 30s)
                              └─────────────┘

                                     │
                        ┌────────────┼────────────┐
                        │            │            │
                 [player leaves] [timeout]  [disconnect timeout]
                        │            │            │
                        ▼            ▼            ▼
                  ┌───────────────────────────────────┐
                  │          room deleted             │
                  │     (rooms.delete, games.delete)  │
                  └───────────────────────────────────┘
```

---

**END OF DOCUMENT**
