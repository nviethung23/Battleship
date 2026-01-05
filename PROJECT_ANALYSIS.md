# Phân Tích Dự Án Battleship - Báo Cáo Chi Tiết

**Ngày tạo:** 4 Tháng 1, 2026  
**Nhóm:** Nhóm 3  
**GitHub:** https://github.com/nviethung23  
**Domain:** battleshipgame.fun

---

## 1. KIẾN THỨC LÝ THUYẾT VÀ LẬP TRÌNH MẠNG

### 1.1. Mô Hình Client-Server
- **Kiến trúc:** Client-Server với WebSocket real-time
- **Server:** Node.js (Express) - Xử lý HTTP API và Socket.IO
- **Client:** HTML/CSS/JavaScript - Single Page Application (SPA)
- **Database:** MongoDB Atlas (cloud) + Redis (in-memory cache)

### 1.2. Giao Thức Mạng
#### HTTP/HTTPS (Application Layer - TCP)
- **REST API:** Đăng ký, đăng nhập, profile
- **Endpoints:**
  - `POST /api/register` - Đăng ký tài khoản
  - `POST /api/login` - Đăng nhập
  - `POST /api/guest-login` - Đăng nhập khách
  - `GET /api/profile` - Lấy thông tin user
- **Authentication:** JWT (JSON Web Token)
- **Security:** Helmet CSP, Rate Limiting, CORS

#### WebSocket (Upgrade từ HTTP - TCP)
- **Thư viện:** Socket.IO v4.6.1
- **Mục đích:** Real-time communication cho game, lobby, chat
- **Features:**
  - Tự động reconnect khi mất kết nối
  - Room-based broadcasting
  - Binary data support
  - Heartbeat/ping-pong để duy trì kết nối

#### WebRTC (Media over UDP, Signaling over TCP)
- **Mục đích:** Peer-to-Peer voice/video call
- **Signaling:** Socket.IO (TCP)
- **Media Transport:** UDP (RTP/RTCP)
- **NAT Traversal:** STUN servers (Google STUN)
- **Configuration:**
  ```javascript
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
  ```

### 1.3. Lý Thuyết Socket
#### TCP Socket (Transmission Control Protocol)
- **Đặc điểm:**
  - Connection-oriented (thiết lập kết nối trước)
  - Reliable (đảm bảo gói tin đến đích)
  - Ordered (gói tin đến theo thứ tự)
  - Error checking (kiểm tra lỗi)
  - Flow control (điều khiển luồng)
  - Congestion control (điều khiển tắc nghẽn)
- **Ứng dụng trong project:**
  - HTTP/HTTPS API
  - WebSocket (Socket.IO)
  - WebRTC signaling

#### UDP Socket (User Datagram Protocol)
- **Đặc điểm:**
  - Connectionless (không cần thiết lập kết nối)
  - Unreliable (không đảm bảo gói tin đến)
  - Unordered (gói tin có thể đến không theo thứ tự)
  - No error recovery (không sửa lỗi)
  - Low latency (độ trễ thấp)
- **Ứng dụng trong project:**
  - WebRTC media streams (audio/video)
  - Chấp nhận mất gói tin để giảm độ trễ

### 1.4. Lý Thuyết NAT Traversal
- **Vấn đề:** Clients đằng sau NAT/Firewall không thể kết nối trực tiếp P2P
- **Giải pháp:**
  - **STUN (Session Traversal Utilities for NAT):** Discover public IP/port
  - **TURN (Traversal Using Relays around NAT):** Relay server (chưa implement)
  - **ICE (Interactive Connectivity Establishment):** Framework kết hợp STUN/TURN

---

## 2. LUỒNG NHẬP XUẤT (I/O FLOW)

### 2.1. Luồng Authentication
```
[Client] → HTTP POST /api/register → [Server]
         ← JWT Token (cookie/localStorage) ←

[Client] → HTTP POST /api/login → [Server]
         ← JWT Token + User Info ←

[Client] → Socket.IO connect (auth: {token}) → [Server]
         ← connected event ←
```

### 2.2. Luồng Matchmaking (Quick Play)
```
[Player A] → queue:join → [Server Queue]
[Player B] → queue:join → [Server Queue]
                ↓
         [Server matches 2 players]
                ↓
[Player A] ← match:found ← [Server]
[Player B] ← match:found ← [Server]
                ↓
         [Both join lobby]
```

### 2.3. Luồng Private Room
```
[Host] → room:createPrivate → [Server]
       ← room:created (roomCode: ABC123) ←

[Guest] → room:joinPrivate (code: ABC123) → [Server]
        ← room:joined ←

[Both] ← room:updated ← [Server]
```

### 2.4. Luồng Lobby & Ready
```
[Player] → lobby:playerReady → [Server]
         ← room:updated ←

[Both ready] → [Server checks]
             ← lobby:bothReady ←
             ← lobby:countdown (60s) ←
```

### 2.5. Luồng Game Play
```
[Player] → deploy_fleet (ships positions) → [Server validates]
         ← deployment_confirmed ←

[Both deployed] → [Server starts battle]
                ← deployment_complete ←
                ← battle_start ←
                ← battle_timer_update ←

[Current turn] → attack (row, col) → [Server validates]
               ← attack_result (hit/miss/sunk) ←
               ← turn_changed or turn_continue ←

[Victory condition] ← game_over ← [Server]
```

### 2.6. Luồng Chat
```
[Player] → chat_message (text) → [Server sanitizes + saves DB]
         → Broadcast to room → [All players in room]

[Player] → get_chat_history → [Server queries MongoDB]
         ← chat_history (messages array) ←
```

### 2.7. Luồng WebRTC Call
```
[Caller] → call_request → [Server] → [Callee]
         ← call_incoming ←

[Callee] → call_accepted → [Server] → [Caller]
         ← call_accepted ←

[Caller] → webrtc_offer (SDP) → [Server] → [Callee]
[Callee] → webrtc_answer (SDP) → [Server] → [Caller]
[Both] → webrtc_ice_candidate → [Server] → [Other peer]

[P2P Media Stream Established via UDP]

[Either] → call_ended → [Server] → [Other peer]
         → Save CallLog to MongoDB
```

### 2.8. Luồng Reconnect
```
[Player disconnects] → [Server detects disconnect event]
                     → Wait 2s grace period
                     → Check Redis for connection status
                     → [If still disconnected]
                        ← player:disconnected ← [Opponent]

[Player reconnects] → rejoin_game (roomId) → [Server]
                    ← rejoin_game_success (full game state) ←
                    → [Opponent] ← player:reconnected ←
```

---

## 3. TCP/UDP SOCKET - PHÂN TÍCH CHI TIẾT

### 3.1. TCP Socket Implementation

#### Server-side (Node.js)
```javascript
// HTTP Server (TCP)
const server = http.createServer(app);

// Socket.IO (TCP WebSocket)
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Socket authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.userId = decoded.id;
        socket.username = decoded.username;
        next();
    });
});

// Room-based broadcasting (TCP)
io.to(roomId).emit('attack_result', data);
```

#### Client-side (JavaScript)
```javascript
// Socket.IO Client (TCP WebSocket)
const socket = io({
    auth: { token: localStorage.getItem('token') }
});

socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.emit('attack', { row: 5, col: 3 });
```

### 3.2. UDP Implementation (WebRTC)

#### Client-side WebRTC (UDP for media)
```javascript
// Create peer connection
const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
});

// Add media stream (transmitted via UDP)
localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
});

// Handle incoming media (via UDP)
peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
};
```

### 3.3. So Sánh TCP vs UDP trong Project

| Khía Cạnh | TCP (Socket.IO) | UDP (WebRTC) |
|-----------|-----------------|--------------|
| **Mục đích** | Game logic, chat, lobby | Audio/video streaming |
| **Độ tin cậy** | 100% (retransmit nếu mất) | Best-effort (chấp nhận mất gói) |
| **Độ trễ** | Cao hơn (10-100ms) | Thấp (1-10ms) |
| **Thứ tự** | Đảm bảo thứ tự | Không đảm bảo |
| **Overhead** | Header lớn (20+ bytes) | Header nhỏ (8 bytes) |
| **Use case** | Turn-based game (chờ được) | Real-time voice (không chờ được) |

---

## 4. MULTICAST

### 4.1. Khái Niệm Multicast
**Multicast:** Gửi dữ liệu từ 1 nguồn đến NHIỀU đích cùng lúc (1-to-many).

### 4.2. Multicast trong Project

#### Socket.IO Room Broadcasting (Application-level Multicast)
```javascript
// Server broadcast to all users in room (TCP multicast simulation)
io.to(roomId).emit('attack_result', {
    row: 5,
    col: 3,
    result: 'hit'
});

// Tất cả sockets trong room 'roomId' nhận event
```

#### Không có IP Multicast
- Project **KHÔNG** sử dụng IP Multicast (224.0.0.0 - 239.255.255.255)
- Vì chạy trên Internet/Cloud, không phải LAN
- Socket.IO rooms là multicast ở application layer, không phải network layer

### 4.3. Ứng Dụng Room Broadcasting

| Event | Broadcast To | Mô tả |
|-------|--------------|-------|
| `attack_result` | Room (2 players) | Kết quả đánh sau khi validate |
| `chat_message` | Room (2 players) | Tin nhắn chat |
| `player:disconnected` | Room | Thông báo người chơi disconnect |
| `game_over` | Room | Kết thúc game |
| `lobby:countdown` | Room | Đếm ngược lobby |

---

## 5. ĐA TUYẾN (MULTIPROCESSING)

### 5.1. Hiện Tại: SINGLE PROCESS
- Project chạy **1 process Node.js duy nhất**
- Không có `cluster`, `worker`, `fork`, `child_process`
- Tất cả logic chạy trên **1 CPU core**

### 5.2. Tại Sao Không Cần Đa Tuyến?
1. **Scale nhỏ:** Game 2 người, không có hàng ngàn concurrent users
2. **I/O-bound:** Phần lớn thời gian chờ network/database, không phải compute
3. **Đơn giản:** Dễ debug, dễ deploy

### 5.3. Khi Nào CẦN Đa Tuyến?
- Nhiều hơn 10,000 concurrent connections
- CPU-bound tasks (AI, physics simulation)
- High availability (1 process chết, process khác tiếp tục)

### 5.4. Cách Scale Lên Đa Tuyến (Khuyến Nghị Tương Lai)

#### Option 1: Node.js Cluster Module
```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    // Fork workers (1 per CPU core)
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }
} else {
    // Worker process
    require('./server');
}
```

#### Option 2: PM2 Cluster Mode
```bash
pm2 start server.js -i max  # Auto scale to CPU count
```

**LƯU Ý:** Cần Redis adapter cho Socket.IO để sync rooms giữa processes:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(redisClient, redisClient.duplicate()));
```

---

## 6. ĐA LUỒNG (MULTITHREADING)

### 6.1. Node.js Event Loop (Single-threaded)
- JavaScript chạy trên **1 thread** (main thread)
- **Event Loop:** Xử lý I/O async (non-blocking)
- **Thread Pool:** libuv (4 threads mặc định) cho I/O tasks

### 6.2. Async I/O (Non-blocking)
```javascript
// NON-BLOCKING: Server có thể xử lý request khác trong khi chờ DB
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username }); // Async I/O
    // Trong khi chờ MongoDB response, event loop xử lý request khác
});
```

### 6.3. Worker Threads (Không Dùng)
- Project **KHÔNG** dùng `worker_threads` module
- Vì không có CPU-heavy tasks (image processing, crypto mining, etc.)

### 6.4. Socket.IO Async Pattern
```javascript
// Multiple concurrent socket connections (event-driven)
io.on('connection', (socket) => {
    // Mỗi socket event xử lý async, không block nhau
    socket.on('attack', async (data) => {
        await validateAttack(data); // Non-blocking
    });
    
    socket.on('chat_message', async (data) => {
        await saveChat(data); // Chạy song song với attack handler
    });
});
```

### 6.5. Concurrency Model
- **Concurrent connections:** 1000+ sockets cùng lúc
- **Model:** Event-driven, non-blocking I/O
- **NOT parallel processing:** Không chạy code song song trên nhiều cores

---

## 7. MÔ TẢ CÁC HÀM THỰC HIỆN CHƯƠNG TRÌNH

### 7.1. Authentication Module (`server/controllers/authController.js`)

#### `register(req, res)`
- **Input:** `{ username, email, password }`
- **Process:**
  1. Validate input (express-validator)
  2. Check username/email tồn tại chưa
  3. Hash password (bcrypt, 10 rounds)
  4. Save to MongoDB
- **Output:** `{ success: true, message: 'Registration successful' }`

#### `login(req, res)`
- **Input:** `{ username, password }`
- **Process:**
  1. Find user in MongoDB
  2. Compare password (bcrypt)
  3. Generate JWT token (7 days expiry)
- **Output:** `{ token, user: { id, username, email } }`

#### `guestLogin(req, res)`
- **Input:** `{ guestId?, guestDisplayName? }`
- **Process:**
  1. Nếu có guestId cũ → extend TTL
  2. Nếu không → tạo guest mới (TTL 24h)
  3. Generate JWT token
- **Output:** `{ token, guestId, user: { id, username, isGuest } }`

### 7.2. Game Logic Module (`server/utils/gameLogic.js`)

#### `validateShipPlacement(ships, board)`
- **Input:** Array of ship objects với positions
- **Process:**
  1. Check số lượng ships đúng (5 ships)
  2. Check ship sizes hợp lệ (2,3,3,4,5)
  3. Check positions trong board (0-9)
  4. Check không overlap
  5. Check alignment (horizontal/vertical)
- **Output:** `{ valid: true/false, error?: string }`

#### `checkHit(row, col, board)`
- **Input:** Tọa độ attack (row, col) và board
- **Process:**
  1. Check cell có ship không
  2. Check đã bị hit chưa
  3. Mark cell as hit
- **Output:** `{ isHit: true/false, alreadyHit: true/false }`

#### `checkShipSunk(shipId, board)`
- **Input:** shipId và board state
- **Process:**
  1. Find all cells của ship
  2. Check tất cả cells đều bị hit
- **Output:** `{ isSunk: true/false, shipType: string }`

#### `checkGameOver(board)`
- **Input:** Board state
- **Process:**
  1. Check tất cả ships đều sunk
- **Output:** `{ isGameOver: true/false }`

### 7.3. Socket Handler Module (`server/socket/gameHandler.js`)

#### `handleJoinQueue(socket)`
- **Input:** Socket connection
- **Process:**
  1. Check user đã trong queue chưa
  2. Add to `matchmakingQueue` array
  3. Nếu queue.length >= 2 → match 2 players
  4. Create room, emit `match:found`
- **Output:** Emit events `queue:waiting` hoặc `match:found`

#### `handleAttack(socket, data)`
- **Input:** `{ row, col, roomId }`
- **Process:**
  1. Validate coordinates (0-9)
  2. Check correct turn
  3. Call `checkHit(row, col, opponentBoard)`
  4. Update game state
  5. Check ship sunk
  6. Check game over
  7. Broadcast result to room
- **Output:** Emit `attack_result`, `turn_changed`, `game_over`

#### `handleReconnect(socket, data)`
- **Input:** `{ roomId }`
- **Process:**
  1. Find game by roomId
  2. Update socketId trong game state
  3. Update Redis connection status
  4. Send full game state to reconnected player
  5. Notify opponent
- **Output:** Emit `rejoin_game_success`, `player:reconnected`

### 7.4. Chat Handler Module (`server/socket/chatHandler.js`)

#### `handleChatMessage(socket, data)`
- **Input:** `{ roomId, message }`
- **Process:**
  1. Sanitize message (XSS prevention)
  2. Get actualRoomId từ code
  3. Save to MongoDB (ChatMessage model)
  4. Broadcast to room
- **Output:** Emit `chat_message` to all in room

#### `handleGetHistory(socket, data)`
- **Input:** `{ roomId, limit?, before? }`
- **Process:**
  1. Query MongoDB với pagination
  2. Sort by timestamp descending
  3. Limit results (default 50)
- **Output:** Emit `chat_history` array

### 7.5. WebRTC Handler Module (`server/socket/webrtcHandler.js`)

#### `sendOffer(socket, data)`
- **Input:** `{ roomId, offer (SDP) }`
- **Process:**
  1. Get actualRoomId
  2. Forward offer to other peer in room
- **Output:** Emit `webrtc_offer` to opponent

#### `sendAnswer(socket, data)`
- **Input:** `{ roomId, answer (SDP) }`
- **Process:**
  1. Forward answer to caller
- **Output:** Emit `webrtc_answer` to caller

#### `handleCallRequest(socket, data)`
- **Input:** `{ roomId }`
- **Process:**
  1. Find game, get opponent socketId
  2. Emit `call_incoming` to opponent
  3. Create CallLog in MongoDB (status: pending)
- **Output:** CallLog document, emit to opponent

#### `handleCallAccepted(socket, data)`
- **Input:** `{ roomId, callId }`
- **Process:**
  1. Update CallLog status = 'accepted'
  2. Emit `call_accepted` to both peers
  3. Start WebRTC negotiation
- **Output:** Updated CallLog, emit event

### 7.6. Redis State Module (`server/services/gameStateStore.js`)

#### `saveGameState(gameState)`
- **Input:** Game object
- **Process:**
  1. Serialize game to JSON
  2. Save to Redis với key pattern: `battleship:game:{roomId}`
  3. Set TTL (7200 seconds = 2 hours)
- **Output:** Redis SET success

#### `loadGameStateByIdentifier(identifier)`
- **Input:** roomId hoặc roomCode
- **Process:**
  1. Try load by roomId
  2. If not found, find roomId by code
  3. Deserialize JSON từ Redis
- **Output:** Game object hoặc null

### 7.7. Middleware Functions

#### `authenticateToken(req, res, next)`
- **Input:** HTTP request với Authorization header
- **Process:**
  1. Extract Bearer token
  2. Verify JWT với secret
  3. Attach user to req.user
- **Output:** Call next() hoặc return 401/403

#### `validateRegister(req, res, next)`
- **Input:** Registration data
- **Process:**
  1. Username: 3-20 chars, alphanumeric
  2. Email: valid format
  3. Password: min 6 chars
  4. Sanitize input (trim, escape)
- **Output:** Call next() hoặc return 400 errors

---

## 8. CÔNG NGHỆ SỬ DỤNG

### 8.1. Backend Stack

#### Core Framework
- **Node.js v18+:** JavaScript runtime
- **Express.js v4.18:** Web framework
- **Socket.IO v4.6:** Real-time WebSocket library

#### Database & Caching
- **MongoDB v8.20 (Mongoose):** NoSQL database
  - Cloud: MongoDB Atlas
  - Collections: `users`, `games`, `chatmessages`, `calllogs`
- **Redis v4.7:** In-memory cache
  - Session storage
  - Game state storage (TTL 2h)
  - Connection tracking

#### Security & Authentication
- **jsonwebtoken v9.0:** JWT authentication
- **bcryptjs v2.4:** Password hashing
- **helmet v8.1:** Security headers (CSP, XSS protection)
- **express-rate-limit v8.2:** DDoS protection
- **express-validator v7.3:** Input validation

#### DevOps & Utilities
- **dotenv v16.3:** Environment variables
- **cors v2.8:** Cross-Origin Resource Sharing
- **nodemon v3.0:** Development hot-reload
- **PM2:** Production process manager

### 8.2. Frontend Stack

#### Core Technologies
- **HTML5:** Semantic markup
- **CSS3:** Styling với Flexbox/Grid
- **Vanilla JavaScript (ES6+):** No framework

#### Client Libraries
- **Socket.IO Client v4.6:** Real-time communication
- **WebRTC API:** Native browser API (no library)

#### Assets
- **Custom fonts:** Local font files
- **Character images:** PNG sprites
- **Ship images:** Custom SVG/PNG

### 8.3. Infrastructure

#### Development
- **Local:** Windows + Node.js
- **HTTPS:** Self-signed certificates (cert.pem, key.pem)

#### Production
- **Server:** AWS EC2 (Ubuntu)
- **Reverse Proxy:** Nginx (SSL termination)
- **Domain:** battleshipgame.fun
- **Process Manager:** PM2
- **Redis:** Local Redis server
- **MongoDB:** Cloud (MongoDB Atlas)

---

## 9. DATA SỬ DỤNG GÌ

### 9.1. Database Schema (MongoDB)

#### Collection: `users`
```javascript
{
  _id: ObjectId,
  username: String (unique, index),
  email: String (unique, sparse index),
  password: String (bcrypt hashed),
  isGuest: Boolean (default: false),
  guestId: String (optional),
  guestDisplayName: String (optional),
  guestCreatedAt: Date (TTL index: 24h),
  createdAt: Date,
  stats: {
    gamesPlayed: Number,
    wins: Number,
    losses: Number
  }
}
```

#### Collection: `games`
```javascript
{
  _id: ObjectId,
  roomId: String (unique),
  roomCode: String (6 chars),
  player1: {
    userId: ObjectId,
    username: String,
    board: Array[10][10],
    ships: Array,
    hits: Number,
    misses: Number
  },
  player2: { /* same as player1 */ },
  currentTurn: String (userId),
  status: String (waiting|playing|finished),
  winner: ObjectId (optional),
  startedAt: Date,
  finishedAt: Date,
  createdAt: Date
}
```

#### Collection: `chatmessages`
```javascript
{
  _id: ObjectId,
  roomId: String (index),
  userId: ObjectId,
  username: String,
  message: String (sanitized),
  timestamp: Date,
  createdAt: Date (TTL index: 7 days)
}
```

#### Collection: `calllogs`
```javascript
{
  _id: ObjectId,
  roomId: String,
  callerId: ObjectId,
  callerUsername: String,
  calleeId: ObjectId,
  calleeUsername: String,
  status: String (pending|accepted|rejected|ended),
  startedAt: Date,
  endedAt: Date,
  duration: Number (seconds),
  createdAt: Date (TTL index: 30 days)
}
```

### 9.2. Redis Data Structures

#### Game State Cache
```redis
Key: battleship:game:{roomId}
Type: String (JSON serialized)
TTL: 7200 seconds (2 hours)
Value: {
  roomId, player1, player2, currentTurn, 
  status, board, ships, moves, ...
}
```

#### User Connection Status
```redis
Key: user:{userId}:connected
Type: String ("true" | "false")
TTL: 300 seconds (5 minutes)
Value: "true"
```

#### Room Code Mapping
```redis
Key: battleship:room:code:{roomCode}
Type: String (roomId)
TTL: 7200 seconds
Value: "room_1234567890"
```

### 9.3. In-Memory Data (Server)

#### Rooms Map
```javascript
rooms = Map<roomId, {
  id: string,
  code: string (6 chars),
  isPrivate: boolean,
  status: 'waiting' | 'lobby' | 'playing' | 'finished',
  player1: { userId, username, socketId, ready, characterId, ... },
  player2: { /* same */ },
  createdAt: Date,
  lobbyCountdown: number
}>
```

#### Games Map
```javascript
games = Map<roomId, {
  roomId: string,
  roomCode: string,
  player1: {
    userId, username, socketId,
    board: Array[10][10],
    ships: Array<Ship>,
    deploymentReady: boolean,
    hits: number, misses: number
  },
  player2: { /* same */ },
  currentTurn: userId,
  status: string,
  phase: 'deployment' | 'battle',
  deploymentTimer: { ... },
  turnTimer: { ... }
}>
```

#### Matchmaking Queue
```javascript
matchmakingQueue = Array<{
  socketId: string,
  userId: string,
  username: string,
  isGuest: boolean,
  guestDisplayName?: string,
  queuedAt: Date
}>
```

### 9.4. Client-Side Storage (Browser)

#### LocalStorage
```javascript
{
  'token': 'JWT_TOKEN_STRING',
  'userId': 'user_id_string',
  'username': 'username_string',
  'isGuest': 'true' | 'false',
  'guestId': 'guest_id_string' (if guest),
  'guestDisplayName': 'display_name' (if guest)
}
```

#### SessionStorage
- Không sử dụng trong project này

#### Cookies
- Có thể dùng để lưu JWT token (nếu backend set)
- Hiện tại chủ yếu dùng localStorage

---

## 10. NGÔN NGỮ LẬP TRÌNH & MÔI TRƯỜNG

### 10.1. Ngôn Ngữ Lập Trình

#### Backend: JavaScript (Node.js)
- **Version:** ES6+ (ECMAScript 2015+)
- **Runtime:** Node.js v18.x
- **Features:**
  - `async/await` - Asynchronous programming
  - Arrow functions - `() => {}`
  - Template literals - `` `Hello ${name}` ``
  - Destructuring - `const { username, email } = req.body`
  - Spread operator - `{ ...game, newField }`
  - Classes - `class GameHandler { ... }`
  - Modules - `require()` / `module.exports` (CommonJS)

#### Frontend: JavaScript (Vanilla)
- **Version:** ES6+ (Modern browsers)
- **Features:**
  - `fetch()` API - HTTP requests
  - Promises & async/await
  - DOM manipulation - `querySelector()`, `addEventListener()`
  - WebSocket API - Socket.IO client
  - WebRTC API - `RTCPeerConnection`
  - LocalStorage API
  - Canvas API (nếu có drawing)

### 10.2. Môi Trường Chạy

#### Development Environment
```
OS: Windows 10/11
Runtime: Node.js v18.17.0
Package Manager: npm v9.x
Editor: VS Code
Terminal: PowerShell / CMD
Database: MongoDB Atlas (cloud)
Cache: Redis (local - Windows port)
Browser: Chrome/Edge/Firefox (modern)
```

#### Production Environment
```
OS: Ubuntu 22.04 LTS (AWS EC2)
Runtime: Node.js v18.x
Process Manager: PM2 v5.x
Reverse Proxy: Nginx v1.18+
SSL: Let's Encrypt / Cloudflare
Database: MongoDB Atlas (cloud)
Cache: Redis v6.x (local)
Domain: battleshipgame.fun
```

### 10.3. Cấu Hình Hệ Thống

#### package.json Scripts
```json
{
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js",
    "create-admin": "node server/scripts/createAdmin.js"
  }
}
```

#### PM2 Production
```bash
pm2 start server/server.js --name battleship
pm2 startup  # Auto-start on reboot
pm2 save     # Save process list
```

#### Environment Variables (.env)
```properties
PORT=3000
NODE_ENV=production
JWT_SECRET=battleship_secret_key_2024
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://localhost:6379
GUEST_TTL_HOURS=24
```

---

## 11. GIAO DIỆN DÙNG CÁI GÌ

### 11.1. Frontend Technology Stack

#### Pure HTML/CSS/JavaScript (No Framework)
- **Không dùng:** React, Vue, Angular, jQuery
- **Lý do:** 
  - Project nhỏ, không cần framework phức tạp
  - Tối ưu performance (no framework overhead)
  - Học tập vanilla JS fundamentals

### 11.2. Cấu Trúc Giao Diện

#### HTML Pages
```
client/
├── index.html           # Login/Register page
├── hub.html             # Main hub (Quick Play / Private Room)
├── lobby.html           # Pre-game lobby (character selection)
├── game.html            # Main game screen (deployment + battle)
└── admin.html           # Admin dashboard
```

#### CSS Architecture
```
client/css/
├── style.css            # Global styles + Login page
├── hub.css              # Hub page styles
├── lobby.css            # Lobby page styles
├── game.css             # Game page styles (8000+ lines!)
├── battle.css           # Battle-specific styles
└── admin.css            # Admin dashboard styles
```

#### JavaScript Modules
```
client/js/
├── auth.js              # Login/Register logic
├── authTabs.js          # Tab switching
├── hub.js               # Hub page logic
├── lobby.js             # Lobby page logic
├── game.js              # Game page logic (2500+ lines!)
├── battle.js            # Battle phase logic
├── chat.js              # Chat functionality
├── webrtc.js            # WebRTC call logic
├── characters.js        # Character data
├── characterSelection.js # Character picker
├── shipDock.js          # Ship deployment UI
└── shared/
    ├── socket-shared.js # Shared Socket.IO logic
    └── state.js         # Shared state management
```

### 11.3. UI Design Pattern

#### Single Page Application (SPA)
- Mỗi HTML page là 1 "screen"
- Navigation: `window.location.href = '/hub.html'`
- No server-side rendering (SSR)

#### Component-Based (Manual)
```javascript
// Example: Create notification component
function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.className = `notification notification--${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}
```

### 11.4. CSS Methodology

#### BEM-like Naming Convention
```css
/* Block__Element--Modifier */
.hub__container { }
.hub__button { }
.hub__button--primary { }
.hub__button--disabled { }
```

#### Layout Techniques
- **Flexbox:** Chính (navbar, cards, buttons)
- **Grid:** Ít (10x10 board cells)
- **Absolute Positioning:** Overlays, modals

#### Responsive Design
```css
/* Mobile-first approach */
@media (max-width: 768px) {
    .hub__container {
        flex-direction: column;
    }
}
```

### 11.5. UI Components

#### Key UI Elements

1. **Login/Register Form**
   - Tabs switching
   - Input validation
   - Error messages
   - Guest login button

2. **Hub Page**
   - Quick Play button (matchmaking)
   - Create Private Room
   - Join Private Room (room code input)
   - Profile display
   - Logout button
   - Copyright badge (fixed bottom-right)

3. **Lobby Page**
   - Player cards (host + guest)
   - Character selection carousel
   - Ready checkbox
   - Countdown timer (60s)
   - Chat box (real-time)

4. **Game Page**
   - Split screen (your board + opponent board)
   - Deployment phase:
     - Ship dock (drag ships)
     - Rotation controls
     - Deploy button
     - Timer (120s)
   - Battle phase:
     - Turn indicator
     - Attack grid (clickable cells)
     - Hit/Miss/Sunk markers
     - Timer (30s per turn)
     - Chat box
     - Voice call controls
   - Game over modal

5. **Admin Dashboard**
   - User management table
   - Game statistics
   - System logs
   - Ban/Unban controls

### 11.6. Styling Features

#### Visual Effects
- **Glassmorphism:** `backdrop-filter: blur(10px)`
- **Gradient backgrounds:** Linear/radial gradients
- **Animations:** CSS transitions, keyframes
- **Hover effects:** Scale, translate, glow
- **Shadows:** Box-shadow for depth

#### Color Palette
```css
:root {
    --primary: #5FA8C5;      /* Blue */
    --secondary: #2C5F7C;    /* Dark Blue */
    --accent: #FF6B6B;       /* Red (errors) */
    --success: #51CF66;      /* Green */
    --dark: #1A1A2E;         /* Background */
    --light: #EAEAEA;        /* Text */
}
```

#### Typography
- **Font:** Custom fonts trong `/public/fonts/`
- **Sizes:** 12px - 48px (responsive)
- **Weights:** 400 (regular), 600 (semibold), 700 (bold)

---

## 12. SOCKET GÌ?

### 12.1. Định Nghĩa Socket

#### Network Socket (Khái Niệm Chung)
**Socket** là endpoint của kết nối mạng 2 chiều (bidirectional).  
**Định nghĩa:** Cặp (IP Address, Port Number) xác định 1 socket.

```
Socket = IP Address : Port Number
Example: 192.168.1.100:3000
```

#### Trong Lập Trình Mạng
- **Server Socket:** Lắng nghe (listen) trên port, chấp nhận (accept) connections
- **Client Socket:** Kết nối (connect) tới server socket

### 12.2. Socket Trong Project Battleship

#### 1. TCP Socket (HTTP/HTTPS)
```javascript
// Server tạo HTTP server (TCP socket)
const server = http.createServer(app);
server.listen(3000, () => {
    console.log('Server listening on port 3000');
});

// Mỗi client request tạo 1 TCP socket connection
```

**Ứng dụng:** REST API (login, register, profile)

#### 2. WebSocket (Socket.IO)
```javascript
// Server: Socket.IO server
const io = new Server(server, {
    cors: { origin: "*" }
});

// Client: Socket.IO client
const socket = io('https://battleshipgame.fun', {
    auth: { token: 'JWT_TOKEN' }
});
```

**Đặc điểm:**
- **Protocol:** ws:// (HTTP) hoặc wss:// (HTTPS)
- **Full-duplex:** Server và client đều có thể gửi message bất cứ lúc nào
- **Persistent:** Connection giữ mở, không cần mở lại mỗi request
- **Low latency:** Thích hợp cho real-time game

**Ứng dụng:** Game logic, lobby, chat, notifications

#### 3. WebRTC Data Channel (UDP)
```javascript
// WebRTC peer connection (UDP socket cho media)
const peerConnection = new RTCPeerConnection(configuration);
peerConnection.addTrack(audioTrack);
```

**Đặc điểm:**
- **Protocol:** UDP (không có TCP header overhead)
- **Peer-to-Peer:** Trực tiếp giữa 2 clients (không qua server)
- **Unreliable:** Packet có thể drop
- **Low latency:** < 100ms (voice call chất lượng cao)

**Ứng dụng:** Voice/video call trong game

### 12.3. Socket.IO Events (Chi Tiết)

#### Authentication Events
```javascript
// Client → Server
socket.emit('connect', { auth: { token } });

// Server → Client
socket.emit('connected', { userId, username, socketId });
socket.emit('error', { message: 'Authentication failed' });
```

#### Matchmaking Events
```javascript
// Queue
socket.emit('queue:join');
socket.emit('queue:leave');
socket.on('queue:waiting', { position, queueSize });
socket.on('queue:cancelled');
socket.on('match:found', { roomId, roomCode, opponent });

// Private Room
socket.emit('room:createPrivate');
socket.emit('room:joinPrivate', { roomCode });
socket.emit('room:leave');
socket.on('room:created', { roomId, roomCode });
socket.on('room:joined', { roomId, players });
socket.on('room:updated', { room });
socket.on('room:error', { message });
```

#### Lobby Events
```javascript
socket.emit('lobby:playerReady', { ready: true });
socket.emit('lobby:characterChanged', { characterId });
socket.on('lobby:countdown', { timeLeft });
socket.on('lobby:bothReady');
socket.on('lobby:cancelled');
```

#### Game Events
```javascript
// Deployment
socket.emit('deploy_fleet', { ships: [...] });
socket.on('deployment_confirmed');
socket.on('deployment_timer_update', { timeLeft });
socket.on('deployment_complete');

// Battle
socket.emit('attack', { row, col, roomId });
socket.on('attack_result', { row, col, isHit, shipSunk, ... });
socket.on('turn_changed', { currentTurn });
socket.on('turn_continue');
socket.on('battle_timer_update', { timeLeft });
socket.on('turn_timeout');
socket.on('game_over', { winner, reason });

// Reconnect
socket.emit('rejoin_game', { roomId });
socket.on('rejoin_game_success', { game });
socket.on('player:disconnected', { userId });
socket.on('player:reconnected', { userId });
```

#### Chat Events
```javascript
socket.emit('chat_message', { roomId, message });
socket.emit('get_chat_history', { roomId, limit, before });
socket.emit('player_typing', { roomId });
socket.on('chat_message', { userId, username, message, timestamp });
socket.on('chat_history', { messages: [...] });
socket.on('player_typing', { username });
```

#### WebRTC Signaling Events
```javascript
// Call Control
socket.emit('call_request', { roomId });
socket.emit('call_accepted', { roomId, callId });
socket.emit('call_rejected', { roomId, callId });
socket.emit('call_ended', { roomId, callId });
socket.on('call_incoming', { callId, callerId, callerUsername });
socket.on('call_accepted', { callId });
socket.on('call_ended', { callId, reason });

// WebRTC Signaling
socket.emit('webrtc_offer', { roomId, offer });
socket.emit('webrtc_answer', { roomId, answer });
socket.emit('webrtc_ice_candidate', { roomId, candidate });
socket.on('webrtc_offer', { offer, from });
socket.on('webrtc_answer', { answer, from });
socket.on('webrtc_ice_candidate', { candidate, from });
```

### 12.4. Socket Lifecycle

#### Client Connection Lifecycle
```
1. [Client] TCP handshake → [Server]
2. [Client] HTTP Upgrade request → [Server]
3. [Server] Upgrade to WebSocket → [Client]
4. [Client] Socket.IO auth handshake → [Server]
5. [Server] JWT verification → Success/Fail
6. [Server] emit('connected') → [Client]
7. [Client/Server] Bidirectional events...
8. [Client] disconnect() → [Server]
```

#### Server Socket Management
```javascript
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Track socket
    playerSockets.set(socket.userId, socket.id);
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        playerSockets.delete(socket.userId);
    });
});
```

---

## 13. HẠN CHẾ LÀ GÌ

### 13.1. Hạn Chế Về Kiến Trúc

#### 1. Single Process Architecture
- **Vấn đề:** Chạy 1 Node.js process duy nhất
- **Hậu quả:**
  - Server crash = toàn bộ users bị disconnect
  - Không tận dụng multi-core CPU
  - Khó scale lên 10,000+ concurrent users
- **Giải pháp:** PM2 cluster mode + Redis adapter

#### 2. In-Memory State Storage
- **Vấn đề:** `rooms`, `games`, `matchmakingQueue` lưu trong RAM
- **Hậu quả:**
  - Server restart = mất tất cả game đang chơi
  - Không thể scale ngang (horizontal scaling)
  - Memory leak nếu không cleanup
- **Giải pháp:** Redis cho game state, MongoDB cho persistent storage

#### 3. Không Có Database Connection Pool Management
- **Vấn đề:** Mongoose mặc định connection pooling (default 5)
- **Hậu quả:**
  - Có thể chậm khi traffic cao
  - Không tối ưu cho production
- **Giải pháp:** Config `poolSize: 50` trong MongoDB connection

### 13.2. Hạn Chế Về Network

#### 1. Không Có TURN Server
- **Vấn đề:** Chỉ có STUN, không có TURN relay
- **Hậu quả:**
  - WebRTC call thất bại nếu cả 2 users đằng sau Symmetric NAT
  - Tỉ lệ thành công call chỉ ~70-80%
- **Giải pháp:** Deploy TURN server (coturn) hoặc dùng Twilio/Agora

#### 2. No Load Balancing
- **Vấn đề:** Single server, không có load balancer
- **Hậu quả:**
  - Single point of failure
  - Không thể distribute load khi traffic tăng
- **Giải pháp:** Nginx load balancer + multiple Node.js instances

#### 3. Không Có CDN
- **Vấn đề:** Static assets (CSS, JS, images) serve từ server
- **Hậu quả:**
  - Chậm cho users xa server
  - Tốn bandwidth server
- **Giải pháp:** CloudFlare CDN hoặc AWS CloudFront

### 13.3. Hạn Chế Về Bảo Mật

#### 1. JWT Không Có Refresh Token
- **Vấn đề:** Chỉ có access token (7 days expiry)
- **Hậu quả:**
  - Token bị lộ → hacker có access 7 ngày
  - Không thể revoke token trước expiry
- **Giải pháp:** Implement refresh token + token blacklist trong Redis

#### 2. Không Có Rate Limiting Cho Socket Events
- **Vấn đề:** Rate limit chỉ cho HTTP API, không có cho Socket.IO
- **Hậu quả:**
  - Spam attack: 1 user gửi 1000 `attack` events/giây
  - Có thể làm crash server
- **Giải pháp:** Socket.IO rate limiter middleware

#### 3. Không Có Input Validation Sâu
- **Vấn đề:** Validation chỉ cơ bản (type, length)
- **Hậu quả:**
  - SQL/NoSQL injection (nếu query không cẩn thận)
  - XSS trong chat (đã có sanitize nhưng chưa đủ)
- **Giải pháp:** Joi/Yup schema validation, DOMPurify cho chat

#### 4. CORS Mở Hoàn Toàn
- **Vấn đề:** `cors: { origin: "*" }`
- **Hậu quả:**
  - Bất kỳ domain nào cũng có thể gọi API
  - Mở cửa cho CSRF attacks
- **Giải pháp:** Restrict CORS: `origin: ['https://battleshipgame.fun']`

### 13.4. Hạn Chế Về Game Logic

#### 1. No Cheat Prevention
- **Vấn đề:** Client gửi `attack` event, server validate nhưng...
- **Hậu quả:**
  - Người chơi có thể modify client code
  - Gửi attack liên tục không chờ turn
  - Gửi invalid coordinates nhiều lần
- **Giải pháp:** 
  - Rate limit per socket
  - Strict turn validation
  - Penalty system (ban sau X invalid moves)

#### 2. No Anti-AFK System
- **Vấn đề:** User join game rồi idle
- **Hậu quả:**
  - Opponent phải chờ timeout (2 phút deployment + 30s/turn * N)
  - Trải nghiệm tệ
- **Giải pháp:** Kick after 30s không activity + give opponent win

#### 3. Không Có Matchmaking Rating (MMR)
- **Vấn đề:** Quick play random match, không theo skill
- **Hậu quả:**
  - Pro player vs newbie = không balanced
  - Newbie bị discouraged
- **Giải pháp:** ELO rating system + match theo rating range

### 13.5. Hạn Chế Về User Experience

#### 1. No Spectator Mode
- **Vấn đề:** Chỉ 2 người chơi, không có audience
- **Hậu quả:**
  - Không thể xem bạn bè chơi
  - Mất cơ hội viral (streaming)
- **Giải pháp:** Spectator room với read-only socket events

#### 2. Không Có Game History
- **Vấn đề:** Game kết thúc = mất state
- **Hậu quả:**
  - Không replay matches
  - Không có statistics chi tiết
- **Giải pháp:** Save game moves to MongoDB + replay UI

#### 3. No Mobile Optimization
- **Vấn đề:** Responsive CSS có nhưng chưa tối ưu touch
- **Hậu quả:**
  - Khó kéo thả ships trên mobile
  - Game board nhỏ trên màn hình nhỏ
- **Giải pháp:** Touch event handlers + mobile-first redesign

#### 4. Chat Không Có Emoji/Stickers
- **Vấn đề:** Chỉ có plain text
- **Hậu quả:**
  - Chat nhàm chán
  - Không thể express emotions
- **Giải pháp:** Emoji picker + giphy integration

### 13.6. Hạn Chế Về Performance

#### 1. No Image Optimization
- **Vấn đề:** Images có thể chưa được optimize
- **Hậu quả:**
  - Slow page load
  - Tốn bandwidth
- **Giải pháp:** Sharp (đã có trong devDeps) + WebP format

#### 2. No Code Splitting
- **Vấn đề:** `game.js` có 2500+ lines → load toàn bộ
- **Hậu quả:**
  - Initial load chậm
  - Parse time dài
- **Giải pháp:** Tách thành modules + dynamic import

#### 3. Không Có Service Worker
- **Vấn đề:** No offline support, no caching
- **Hậu quả:**
  - Mỗi lần refresh phải tải lại tất cả
  - Không chơi offline (dù không cần)
- **Giải pháp:** PWA với Service Worker + cache static assets

### 13.7. Hạn Chế Về Monitoring

#### 1. No Logging System
- **Vấn đề:** Chỉ có `console.log()`, không có structured logging
- **Hậu quả:**
  - Khó debug production issues
  - Không có audit trail
- **Giải pháp:** Winston/Pino logger + ELK stack

#### 2. No Error Tracking
- **Vấn đề:** Lỗi xảy ra → console.error → mất
- **Hậu quả:**
  - Không biết users gặp lỗi gì
  - Không thể reproduce bugs
- **Giải pháp:** Sentry.io hoặc Bugsnag

#### 3. No Analytics
- **Vấn đề:** Không track user behavior
- **Hậu quả:**
  - Không biết feature nào users thích
  - Không biết churn rate
- **Giải pháp:** Google Analytics + custom events

### 13.8. Hạn Chế Về Deployment

#### 1. No CI/CD Pipeline
- **Vấn đề:** Deploy thủ công (git pull + pm2 restart)
- **Hậu quả:**
  - Dễ sai sót
  - Downtime khi deploy
- **Giải pháp:** GitHub Actions + blue-green deployment

#### 2. No Database Backup
- **Vấn đề:** MongoDB Atlas có backup nhưng không config
- **Hậu quả:**
  - Mất data = mất tất cả users
- **Giải pháp:** Automated daily backups + test restore

#### 3. No Health Check Endpoint
- **Vấn đề:** Không có `/health` endpoint
- **Hậu quả:**
  - Không biết server alive hay không
  - Load balancer không thể check
- **Giải pháp:** 
```javascript
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});
```

---

## 14. TỔNG KẾT & KHUYẾN NGHỊ

### 14.1. Điểm Mạnh
✅ **Architecture tốt:** Client-Server, real-time với Socket.IO  
✅ **Security cơ bản đầy đủ:** JWT, bcrypt, helmet, rate limit  
✅ **Game logic solid:** Server-authoritative, cheat prevention cơ bản  
✅ **WebRTC implementation:** P2P call hoạt động tốt (với STUN)  
✅ **Code organization:** Chia modules rõ ràng, dễ maintain  

### 14.2. Điểm Cần Cải Thiện (Priority)

#### Cao (Ảnh Hưởng Production)
1. **Redis adapter cho Socket.IO** - Để scale ngang
2. **TURN server** - Tăng call success rate lên 95%+
3. **Error tracking** - Sentry.io để catch bugs
4. **Database backup** - Automated MongoDB backups

#### Trung Bình (Ảnh Hưởng UX)
1. **Matchmaking rating** - ELO system
2. **Game history** - Replay + statistics
3. **Anti-cheat** - Rate limit socket events
4. **Mobile optimization** - Touch-friendly UI

#### Thấp (Nice to Have)
1. **Spectator mode**
2. **Chat emoji/stickers**
3. **PWA với offline support**
4. **CI/CD pipeline**

### 14.3. Roadmap Phát Triển

#### Phase 1: Stability (1-2 tháng)
- [ ] Redis adapter
- [ ] Error tracking (Sentry)
- [ ] Health checks
- [ ] Database backups

#### Phase 2: Performance (2-3 tháng)
- [ ] Code splitting
- [ ] Image optimization (WebP)
- [ ] CDN integration
- [ ] Database indexing optimization

#### Phase 3: Features (3-6 tháng)
- [ ] ELO matchmaking
- [ ] Game history & replay
- [ ] Spectator mode
- [ ] Tournament system

#### Phase 4: Scale (6-12 tháng)
- [ ] TURN server
- [ ] Load balancing
- [ ] Microservices (optional)
- [ ] Mobile app (React Native)

---

## PHỤ LỤC

### A. Event Flow Diagram (Tóm Tắt)
```
Login → Hub → [Quick Play | Private Room] → Lobby → 
Deployment → Battle → Game Over → Return to Hub
```

### B. Tech Stack Summary
```
Frontend: HTML5 + CSS3 + Vanilla JS
Backend: Node.js + Express + Socket.IO
Database: MongoDB (Mongoose) + Redis
Auth: JWT + bcrypt
Security: Helmet + Rate Limit + CORS
Real-time: Socket.IO (WebSocket over TCP)
P2P: WebRTC (media over UDP, signaling over TCP)
Deploy: AWS EC2 + PM2 + Nginx
```

### C. Port Usage
```
3000: Node.js server (HTTP/WebSocket)
27017: MongoDB (cloud)
6379: Redis (local)
80: Nginx (HTTP)
443: Nginx (HTTPS)
```

### D. Useful Commands
```bash
# Development
npm run dev          # Start with nodemon
npm start            # Production start

# PM2
pm2 start server.js  # Start process
pm2 logs battleship  # View logs
pm2 restart all      # Restart all
pm2 monit            # Monitor

# Redis
redis-cli            # Connect to Redis
KEYS battleship:*    # List game keys
GET battleship:game:room_123  # Get game state
FLUSHALL             # Clear all (danger!)

# MongoDB
mongosh "mongodb+srv://..."  # Connect
use battleship       # Switch DB
db.users.find()      # Query users
```

---

**Kết Luận:**  
Dự án Battleship là một ứng dụng real-time game hoàn chỉnh với kiến trúc Client-Server, sử dụng Socket.IO (TCP WebSocket) cho game logic và WebRTC (UDP) cho voice call. Code tổ chức tốt, có security cơ bản, nhưng còn nhiều điểm cần cải thiện để production-ready và scale lên user base lớn hơn.

**Học Hỏi:**  
Project này là case study tuyệt vời để học:
- TCP/UDP socket programming
- WebSocket real-time communication
- WebRTC P2P media streaming
- JWT authentication
- Server-authoritative game logic
- MongoDB + Redis architecture
- Node.js event-driven programming

---

**© 2025 Battleship - Developed by Nhóm 3**  
**GitHub:** https://github.com/nviethung23  
**Domain:** battleshipgame.fun
