# Network Study Notes (Battleship)

## Scope
- Focus: HTTP API, Socket.IO real-time flow, WebRTC signaling/media, auth, TCP/UDP basics.
- This repo uses both REST endpoints and Socket.IO events in the same server.

## Architecture overview
- Express serves static pages + REST API. See `server/server.js`.
- Socket.IO handles realtime lobby/game/chat. See `server/server.js` and `server/socket/gameHandler.js`.
- WebRTC handles P2P media; signaling uses Socket.IO. See `server/socket/webrtcHandler.js` and `client/js/webrtc.js`.
- MongoDB stores users, chat history, call logs. See `server/config/mongodb.js`, `server/models/*`.

## HTTP API + auth (TCP)
- REST endpoints: `/api/register`, `/api/login`, `/api/guest-login`, `/api/profile`. See `server/server.js`.
- JWT auth for HTTP (Authorization: Bearer TOKEN). See `server/middleware/auth.js`.
- Validation + sanitize input to reduce XSS: `server/middleware/validation.js`.
- Rate limiting: auth and API limiters in `server/server.js`.
- Security headers: `helmet` CSP allows `ws:` and `wss:` in connect-src.

## Socket.IO auth + lifecycle (TCP -> WebSocket)
- Socket.IO is initialized in `server/server.js` with CORS allow-all.
- Auth middleware reads `socket.handshake.auth.token` and verifies JWT. See `server/server.js`.
- Connection flow:
  - Server emits `connected` with user info.
  - Client uses `SocketShared.init()` to connect and handle `connected`. See `client/js/shared/socket-shared.js`.
- Socket.IO runs over WebSocket (TCP) after handshake; can fallback to long-polling.

## Rooms, lobby, matchmaking, game state
- In-memory state (lost on server restart):
  - `rooms` Map, `games` Map, `playerSockets` Map, `matchmakingQueue` array. See `server/socket/gameHandler.js`.
- Queue flow (quick play):
  - Client emits `queue:join` and server matches two players.
  - Server emits `queue:waiting` or `match:found`. See `server/socket/gameHandler.js` and `client/js/hub.js`.
- Private rooms:
  - `room:createPrivate`, `room:joinPrivate`, `room:requestInfo`. See `server/server.js`, `server/socket/gameHandler.js`, `client/js/hub.js`, `client/js/lobby.js`.
- Lobby readiness:
  - `lobby:playerReady`, `lobby:characterChanged` events. See `client/js/lobby.js` and `server/server.js`.
- Join game room:
  - Client emits `join_game_room` with roomCode; server maps code to actual roomId. See `client/js/game.js` and `server/socket/gameHandler.js`.

## Server-authoritative game logic
- Server validates coordinates and turns in `attack()`. See `server/socket/gameHandler.js`.
- Core rules live in `server/utils/gameLogic.js`.
- Result events:
  - `attack_result`, `turn_changed`, `turn_continue`, `game_over`. See `server/socket/gameHandler.js` and `client/js/game.js`.

## Timers + sync
- Lobby countdown: `startLobbyCountdown()` (60s). See `server/socket/gameHandler.js`.
- Deployment timer + turn timer are server-driven and broadcast to clients.
- Events: `deployment_timer_update`, `battle_timer_update`, `battle_timer_warning`, `turn_timeout`. See `server/socket/gameHandler.js` and `client/js/game.js`.

## Reconnect logic
- Server keeps `playerSockets` and updates socketId on reconnect. See `server/socket/gameHandler.js`.
- Events: `rejoin_game`, `rejoin_game_success`, `rejoin_game_failed`, `player_reconnecting`, `player_reconnected`.
- This is classic state-recovery pattern for realtime games.

## Chat flow
- Chat message sanitize + save to DB in `server/socket/chatHandler.js`.
- Events: `chat_message`, `get_chat_history`, `player_typing`.
- Client: `client/js/chat.js`, `client/js/game.js`, `client/js/battle.js`.

## WebRTC (media over UDP, signaling over TCP)
- Signaling via Socket.IO events: `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`.
- Call control: `call_request`, `call_accepted`, `call_rejected`, `call_ended`.
- STUN servers are configured in `client/js/webrtc.js`.
- Note: no TURN server config; media may fail behind strict NAT.
- Call logs stored in MongoDB: `server/models/CallLog.js` and `server/socket/webrtcHandler.js`.

## TCP vs UDP notes (study points)
- HTTP + Socket.IO (WebSocket) run on TCP: reliable, ordered, but higher latency under loss.
- WebRTC media uses UDP: lower latency, can drop packets; requires ICE (STUN/TURN) to traverse NAT.
- Socket.IO is not a raw WebSocket API; it adds reconnection, heartbeats, rooms, and event semantics.

## Security + transport
- HTTPS fallback: if certs missing, server uses HTTP. See `server/server.js`.
- CSP allows `ws:`/`wss:`; connect-src is important for Socket.IO.
- Open CORS: `origin: *` in Socket.IO config.
- JWT in socket handshake and REST API; check token storage in `client/js/shared/state.js`.

## Deployment notes (battleshipgame.fun)
- If the domain shows `https://`, then browser uses HTTPS for HTTP requests.
- Socket.IO will use `wss://` when the page is HTTPS, and `ws://` when HTTP.
- Node server can still run HTTP behind a reverse proxy (SSL terminates at proxy).
- Check with browser URL bar or server startup logs to confirm.

### Nginx Reverse Proxy Configuration
**Location:** `/etc/nginx/sites-available/battleship`
**Active:** Symlinked to `/etc/nginx/sites-enabled/battleship`

**Architecture:**
```
[Client Browser] ──HTTPS──→ [Nginx :443] ──HTTP──→ [Node.js :3000]
                                ↓
                          [Let's Encrypt SSL]
```

**Key Features:**
1. **SSL Termination:** Nginx handles HTTPS, forwards HTTP to Node.js
2. **Reverse Proxy:** All requests to `battleshipgame.fun` → `localhost:3000`
3. **WebSocket Support:** Special config for Socket.IO (`/socket.io/` path)
4. **HTTP → HTTPS Redirect:** Port 80 auto redirects to 443

**Configuration Breakdown:**
```nginx
# HTTPS Server Block (Port 443)
server {
  server_name battleshipgame.fun www.battleshipgame.fun;
  
  # Main proxy - Forward all HTTP requests to Node.js
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;               # Preserve original hostname
    proxy_set_header X-Real-IP $remote_addr;   # Client's real IP
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme; # https
  }
  
  # WebSocket proxy - Critical for Socket.IO real-time
  location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;                    # Required for WebSocket
    proxy_set_header Upgrade $http_upgrade;    # WebSocket upgrade header
    proxy_set_header Connection "upgrade";     # Maintain persistent connection
    proxy_set_header Host $host;
  }
  
  # SSL Configuration (Managed by Certbot)
  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/battleshipgame.fun/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/battleshipgame.fun/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP Server Block (Port 80) - Redirect to HTTPS
server {
  listen 80;
  server_name battleshipgame.fun www.battleshipgame.fun;
  
  # Force HTTPS redirect
  if ($host = www.battleshipgame.fun) {
    return 301 https://$host$request_uri;
  }
  if ($host = battleshipgame.fun) {
    return 301 https://$host$request_uri;
  }
  
  return 404;
}
```

**Why This Configuration?**
- **Security:** SSL/TLS encryption for all traffic
- **Performance:** Nginx handles static files better than Node.js
- **Scalability:** Can add load balancing, caching later
- **WebSocket:** `Upgrade` header essential for Socket.IO to work
- **SEO:** Single HTTPS version (no mixed HTTP/HTTPS)

**Headers Explanation:**
- `X-Real-IP`: Node.js can see client's actual IP (not Nginx's 127.0.0.1)
- `X-Forwarded-For`: Track full proxy chain
- `X-Forwarded-Proto`: Node.js knows original protocol was HTTPS
- `Host`: Preserve domain name (important for virtual hosts)

**Common Issues:**
1. **502 Bad Gateway:** Node.js not running on port 3000
2. **WebSocket fails:** Missing `Upgrade` header or wrong path
3. **Mixed content:** Node.js tries to load HTTP assets on HTTPS page
4. **Certificate error:** Let's Encrypt not renewed (auto-renews every 90 days)

**Testing Commands:**
```bash
# Check nginx config syntax
sudo nginx -t

# Reload nginx (no downtime)
sudo systemctl reload nginx

# View active config
sudo nginx -T | grep -A 20 "battleshipgame.fun"

# Check SSL certificate expiry
sudo certbot certificates

# Test WebSocket connection
wscat -c wss://battleshipgame.fun/socket.io/?EIO=4&transport=websocket
```

**File Structure:**
```
/etc/nginx/
├── nginx.conf                    # Main config
├── sites-available/
│   ├── default                   # Template (NOT USED)
│   └── battleship                # Our config ✅
└── sites-enabled/
    └── battleship → ../sites-available/battleship  # Symlink (ACTIVE)
```

**Important Notes:**
- `sites-available/default` is just a template, NOT active
- Only files in `sites-enabled/` are loaded by Nginx
- Symlink = shortcut, allows easy enable/disable configs
- Multiple sites can coexist (e.g., battleship, api.battleship.com)

**Reverse Proxy vs Direct Node.js:**
| Aspect | Direct Node.js :443 | Nginx Reverse Proxy |
|--------|---------------------|---------------------|
| **Security** | Node.js handles SSL | Nginx handles SSL ✅ |
| **Performance** | Slower for static files | Fast static serving ✅ |
| **Features** | Basic | Rate limiting, caching, gzip ✅ |
| **Crash recovery** | All connections lost | Nginx queues requests ✅ |
| **Port 80/443** | Needs root or capabilities | Nginx runs as root ✅ |

**Current Setup Evaluation:**
- ✅ SSL/HTTPS with auto-renewal (Let's Encrypt)
- ✅ HTTP → HTTPS redirect
- ✅ WebSocket/Socket.IO support
- ✅ Proper headers for Node.js
- ⚠️ Could add: Gzip compression, rate limiting, caching
- ⚠️ Could add: Fail2ban for brute-force protection
- ⚠️ Could add: Multiple backend servers (load balancing)

## Game state storage (deploy)
- Current: in-memory maps/arrays in `server/socket/gameHandler.js` (lost on restart).
- Recommended for deploy:
  - Redis: fast in-memory, supports TTL and persistence, good for realtime state.
  - Database (Mongo/Postgres): durable snapshots and match history, slower than Redis.
  - Hybrid: Redis for live game state + DB for history and audit.
- If you scale multiple server instances:
  - Use Redis for shared state and a Socket.IO adapter (redis adapter) for room sync.

## SSL/TLS Deep Dive (HTTPS Security)

### What is SSL/TLS?
- **SSL (Secure Sockets Layer):** Old protocol (deprecated)
- **TLS (Transport Layer Security):** Modern version (TLS 1.2, TLS 1.3)
- **Purpose:** Encrypt data between client and server

### How HTTPS Works (TLS Handshake)
```
1. [Client] → ClientHello → [Server]
   (Supported ciphers, TLS version)

2. [Client] ← ServerHello + Certificate ← [Server]
   (Chosen cipher, server's public key)

3. [Client] → Verify Certificate (check CA signature)
   → Generate session key (using server's public key)
   → Send encrypted session key → [Server]

4. [Server] → Decrypt session key (using private key)

5. ✅ Symmetric encryption established (both use session key)
   [Client] ←═══ Encrypted Data ═══→ [Server]
```

### Certificate Authority (CA) Chain
```
[Root CA] (DigiCert, IdenTrust)
    ↓
[Intermediate CA] (Let's Encrypt Authority X3)
    ↓
[Your Certificate] (battleshipgame.fun)
    ↓
[Browser Trusts] ✅
```

### Let's Encrypt (Free SSL)
- **Automatic:** Certbot tool auto-generates and renews
- **Renewal:** Every 90 days (auto-renews at 60 days)
- **Challenge:** Proves you own the domain (HTTP-01 or DNS-01)
- **Files Generated:**
  - `fullchain.pem` - Certificate + Intermediate CA
  - `privkey.pem` - Private key (KEEP SECRET!)
  - `chain.pem` - Intermediate CA only
  - `cert.pem` - Your certificate only

### SSL Configuration Analysis
```nginx
# TLS Version (in /etc/letsencrypt/options-ssl-nginx.conf)
ssl_protocols TLSv1.2 TLSv1.3;  # Modern, secure

# Session Cache (performance optimization)
ssl_session_cache shared:le_nginx_SSL:10m;  # 10MB cache
ssl_session_timeout 1440m;                   # 24 hours

# Session Tickets (resumption)
ssl_session_tickets off;  # Disabled for better security

# Cipher Preference
ssl_prefer_server_ciphers off;  # Let client choose (modern browsers)
```

### SSL Grading (SSL Labs Test)
**Test site:** https://www.ssllabs.com/ssltest/

**Current config likely scores:** A or A+
- ✅ TLS 1.2 & 1.3 only (no old SSL)
- ✅ Strong ciphers
- ✅ Forward secrecy (DHE/ECDHE)
- ✅ HTTP Strict Transport Security (if added)

### Common SSL Concepts

#### 1. Public Key vs Private Key
- **Public Key:** Share with everyone (in certificate)
- **Private Key:** Keep SECRET on server
- **Asymmetric Encryption:** 
  - Encrypt with public → Only private can decrypt
  - Sign with private → Anyone can verify with public

#### 2. Certificate vs Certificate Chain
- **Certificate:** Just your domain's cert
- **Chain:** Your cert + Intermediate CA (browsers need full chain)
- **Fullchain:** Certificate + Chain (what Nginx uses)

#### 3. Self-Signed vs CA-Signed
- **Self-Signed:** You sign your own cert
  - FREE but browsers show warning ⚠️
  - Good for dev/testing
- **CA-Signed:** Trusted authority signs (Let's Encrypt, DigiCert)
  - Browsers trust automatically ✅
  - Required for production

### Security Best Practices
```nginx
# Add these to Nginx for better security:

# HSTS (force HTTPS for 1 year)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# XSS protection
add_header X-Content-Type-Options "nosniff" always;

# CSP (already have in Node.js helmet, but can add here too)
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss://battleshipgame.fun" always;
```

### Monitoring SSL
```bash
# Check certificate expiry
echo | openssl s_client -connect battleshipgame.fun:443 2>/dev/null | openssl x509 -noout -dates

# Check which TLS versions are supported
nmap --script ssl-enum-ciphers -p 443 battleshipgame.fun

# Certbot renewal (automatic via cron)
sudo certbot renew --dry-run  # Test renewal

# Force renewal
sudo certbot renew --force-renewal
```

### Why SSL Matters for This Project
1. **Authentication:** Proves server is real battleshipgame.fun (not phishing)
2. **Encryption:** Password, JWT token, chat messages encrypted
3. **Integrity:** Man-in-the-middle can't modify packets
4. **SEO:** Google ranks HTTPS sites higher
5. **WebRTC:** Browsers require HTTPS for getUserMedia (camera/mic access)
6. **Modern APIs:** Service Workers, Geolocation require HTTPS

## Network programming deep dive (clearer summary)
- HTTP endpoints are request/response and run on TCP (reliable, ordered).
- Socket.IO starts with HTTP polling then upgrades to WebSocket (still TCP).
- WebRTC media is UDP (lower latency, packets can drop), signaling is Socket.IO (TCP).
- Server is authoritative: it validates moves and sends official game state.
- Rooms = logical channels; `io.to(roomId).emit(...)` broadcasts to a room.
- Reconnect uses maps (userId -> socketId) and rejoin events to recover state.

## Event flow reference (samples)
| Flow | Client emit | Server emit | Purpose |
| --- | --- | --- | --- |
| Quick play | `queue:join` | `queue:waiting`, `match:found` | Join matchmaking and receive match |
| Lobby ready | `lobby:playerReady` | `room:updated`, `lobby:bothReady` | Sync ready state |
| Game | `attack` | `attack_result`, `turn_changed` | Server validates move and updates turn |
| Chat | `chat_message` | `chat_message` | Broadcast sanitized chat |
| WebRTC | `webrtc_offer/answer/ice` | same events | Signaling for P2P call |

## Code references (snippets)
### Socket.IO auth (server)
```js
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });
});
```

### Socket init (client)
```js
sharedSocket = io({
  auth: { token }
});
```

### Attack validation (server authoritative)
```js
if (typeof row !== 'number' || typeof col !== 'number') {
  return socket.emit('error', { message: 'Invalid coordinates' });
}
if (row < 0 || row >= 10 || col < 0 || col >= 10) {
  return socket.emit('error', { message: 'Coordinates out of bounds' });
}
```

### Chat sanitize + persist
```js
const sanitizedMessage = sanitizeChatMessage(message);
const chatMessage = new ChatMessage({
  roomId: actualRoomId,
  userId,
  username: sanitizedUsername,
  message: sanitizedMessage
});
```

### WebRTC signaling + STUN (client)
```js
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

## Mini walkthrough (text sequence)
1) HTTP login -> JWT returned.
2) Client connects Socket.IO with JWT in handshake.
3) Server validates JWT, joins rooms, emits lobby/game events.
4) Game moves validated on server, results broadcast to room.
5) WebRTC call: offer/answer/ice over Socket.IO, media over UDP.

## Things to notice / potential issues
- In-memory rooms/games means server restart wipes matches.
- Event mismatch: client emits `leave_room` in `client/js/characterSelection.js`, but server listens for `room:leave`.
- Deprecated client socket file: `client/js/socket.js` (commented in `client/game.html`).
- Queue cancel uses both `queue:cancelled` and `queue:left` for backward compatibility.

## Suggested review checklist for exam
- Explain Socket.IO handshake + JWT auth with `socket.handshake.auth.token`.
- Explain room-based broadcast vs direct socket emit.
- Explain server-authoritative game state and turn validation.
- Explain WebRTC signaling vs media transport (TCP vs UDP).
- Explain why sanitize input on chat + rate limit on auth.
- Explain how reconnect works (maps, socketId update, rejoin event).

## Team assignment (5 people)
| Member | Focus | Learn | Files |
| --- | --- | --- | --- |
| Member 1 | HTTP + Auth | REST, JWT, validation, rate limit, CSP | `server/server.js`, `server/middleware/auth.js`, `server/middleware/validation.js` |
| Member 2 | Socket.IO core + Lobby/Room | handshake auth, rooms, queue, lobby flow | `server/server.js`, `server/socket/gameHandler.js`, `client/js/hub.js`, `client/js/lobby.js`, `client/js/shared/socket-shared.js` |
| Member 3 | Game logic + sync | server-authoritative rules, turn/timers, reconnect | `server/utils/gameLogic.js`, `server/socket/gameHandler.js`, `client/js/game.js`, `client/js/battle.js` |
| Member 4 | Chat + DB | sanitize, store/load chat, history flow | `server/socket/chatHandler.js`, `server/models/ChatMessage.js`, `server/config/mongodb.js`, `client/js/chat.js` |
| Member 5 | WebRTC | signaling, ICE/STUN, UDP vs TCP | `server/socket/webrtcHandler.js`, `server/models/CallLog.js`, `client/js/webrtc.js` |

## Checklist (per member)
### Member 1 (HTTP + Auth)
- [ ] Map REST endpoints and request/response fields.
- [ ] Explain JWT flow for login and profile.
- [ ] Explain validation + sanitize rules and why they matter.
- [ ] Note rate-limit settings and CSP connect-src.

### Member 2 (Socket.IO core + Lobby/Room)
- [ ] Draw event flow: hub -> queue -> match -> lobby.
- [ ] Explain roomId vs roomCode mapping.
- [ ] Identify all emits and listens used in hub/lobby.

### Member 3 (Game logic + sync)
- [ ] Explain attack validation and turn switching.
- [ ] Explain timers and server-driven sync events.
- [ ] Explain reconnect/rejoin flow and playerSockets map.

### Member 4 (Chat + DB)
- [ ] Explain chat_message flow and DB save.
- [ ] Explain get_chat_history and pagination (limit/before).
- [ ] Note sanitizeChatMessage and security risks.

### Member 5 (WebRTC)
- [ ] Explain signaling events and roles (offer/answer/ICE).
- [ ] Explain UDP media vs TCP signaling.
- [ ] Note STUN only (no TURN) and NAT limitations.

## Team delivery checklist
- [ ] Each member prepares 3-5 slides summary for their area.
- [ ] One combined event map diagram for end-to-end flow.
- [ ] Demo plan: login -> hub -> lobby -> game -> chat -> call.

---

## 🎓 KIẾN THỨC QUAN TRỌNG CHO THI

### 1. TCP vs UDP - So Sánh Chi Tiết

| Đặc điểm | TCP | UDP |
|----------|-----|-----|
| **Loại kết nối** | Connection-oriented | Connectionless |
| **Độ tin cậy** | 100% (retransmit nếu mất) | Best-effort (chấp nhận mất) |
| **Thứ tự** | Đảm bảo thứ tự gói tin | Không đảm bảo |
| **Tốc độ** | Chậm hơn (overhead lớn) | Nhanh (overhead nhỏ) |
| **Header size** | 20-60 bytes | 8 bytes |
| **Error checking** | Extensive | Basic checksum |
| **Flow control** | Có (window size) | Không |
| **Congestion control** | Có | Không |
| **Ứng dụng** | HTTP, HTTPS, Email, FTP, SSH | Video call, Gaming, DNS, VoIP |

**Trong project:**
- **TCP:** HTTP API, Socket.IO (WebSocket), WebRTC Signaling
- **UDP:** WebRTC Media Streams (audio/video)

### 2. HTTP Methods & Status Codes

**Methods sử dụng:**
- `POST /api/register` - Tạo tài khoản mới
- `POST /api/login` - Xác thực user
- `POST /api/guest-login` - Tạo guest account
- `GET /api/profile` - Lấy thông tin user

**Status Codes:**
- `200 OK` - Request thành công
- `201 Created` - Resource được tạo (register)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Valid token nhưng không có quyền
- `404 Not Found` - Resource không tồn tại
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### 3. WebSocket Lifecycle

```
1. HTTP Handshake (TCP 3-way handshake trước)
   [Client] → GET /socket.io/?EIO=4&transport=polling → [Server]
              Upgrade: websocket
              Connection: Upgrade
   
   [Client] ← 101 Switching Protocols ← [Server]
              Upgrade: websocket
              Connection: Upgrade

2. WebSocket Established (Persistent TCP connection)
   [Client] ←═══ Bidirectional Messages ═══→ [Server]

3. Socket.IO Handshake
   [Client] ← { "sid": "abc123", "upgrades": ["websocket"] } ←

4. Application Events
   [Client] → emit('queue:join') → [Server]
   [Client] ← on('match:found') ← [Server]

5. Disconnect
   [Client] → Close Frame → [Server]
   or
   [Server] → Close Frame → [Client]
```

### 4. WebRTC NAT Traversal (Quan Trọng!)

**Vấn đề:**
```
[Client A]          [NAT/Router]        [Internet]
192.168.1.100 ───→ 203.0.113.50:12345 ───→ ???
                   (Public IP)

Client B không biết cách kết nối trực tiếp tới A
```

**Giải pháp: ICE (Interactive Connectivity Establishment)**

**1. STUN (Session Traversal Utilities for NAT)**
```
[Client] → STUN Request → [STUN Server (stun.l.google.com)]
         ← Your public IP: 203.0.113.50:12345 ←

→ Client biết địa chỉ public của mình
→ Gửi địa chỉ này cho peer (qua signaling)
```

**2. TURN (Traversal Using Relays around NAT)**
```
[Client A] ───→ [TURN Server] ←─── [Client B]
               (Relay server)

→ Khi STUN fail (Symmetric NAT)
→ Media đi qua TURN (không phải P2P thực sự)
→ TỐN BĂNG THÔNG + TIỀN
```

**3. ICE Candidates (Priority Order)**
```
1. Host candidate: 192.168.1.100:50000 (Local IP)
2. Srflx candidate: 203.0.113.50:12345 (STUN - Public IP)
3. Relay candidate: 198.51.100.10:3478 (TURN - Relay)

ICE thử kết nối theo thứ tự:
Host → Srflx → Relay
(Fastest → Slowest)
```

**Trong project:**
- ✅ Có STUN: Google STUN servers
- ❌ Không có TURN: Call fail rate 20-30% (Symmetric NAT)

### 5. Server-Authoritative Pattern (Anti-Cheat)

**Client-Authoritative (Không tốt):**
```
[Client] → "Tôi bắn trúng 10 ô!" → [Server]
         ← "OK, bạn thắng" ←

❌ Client có thể cheat, gửi data giả
```

**Server-Authoritative (Đúng):**
```
[Client] → "Tôi bắn ô (5,3)" → [Server]
                               ↓
                        [Validate coordinates]
                        [Check turn]
                        [Check board state]
                        [Calculate result]
                               ↓
[Client] ← "Kết quả: HIT, ship sunk: destroyer" ←

✅ Server quyết định tất cả
✅ Client chỉ hiển thị
```

**Validation Steps:**
1. Check coordinates hợp lệ (0-9)
2. Check đúng turn của player
3. Check ô chưa bắn trước đó
4. Check board state từ server
5. Emit kết quả cho cả 2 players

### 6. JWT Authentication Flow

```
1. Register/Login
   [Client] → { username, password } → [Server]
                                      ↓
                              [Hash password: bcrypt]
                              [Save to MongoDB]
                              [Generate JWT]
                                      ↓
   [Client] ← { token: "eyJhbGc..." } ←

2. Store Token
   localStorage.setItem('token', token)

3. Subsequent Requests
   HTTP:
   [Client] → Authorization: Bearer eyJhbGc... → [Server]
                                                ↓
                                        [Verify signature]
                                        [Check expiry]
                                        [Extract userId]
                                                ↓
   [Client] ← { user: { id, username } } ←

   Socket.IO:
   [Client] → io({ auth: { token } }) → [Server]
                                       ↓
                                [Same verification]
                                       ↓
   [Client] ← connected event ←

4. Token Expiry (7 days)
   [Server] → 401 Unauthorized ←
   → Client redirect to login page
```

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  ← Header (algorithm)
.
eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiYWxpY2UifQ  ← Payload (data)
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  ← Signature (verify)
```

### 7. Redis vs MongoDB - Khi Nào Dùng Gì?

| Use Case | Redis | MongoDB |
|----------|-------|---------|
| **Game state (live)** | ✅ In-memory, TTL 2h | ❌ Quá chậm |
| **User profile** | ❌ Mất khi restart | ✅ Persistent |
| **Chat history** | ❌ No query, no TTL index | ✅ TTL, pagination |
| **Leaderboard** | ✅ Sorted Sets (ZADD) | ⚠️ Slow aggregation |
| **Session tracking** | ✅ Fast, TTL auto-expire | ❌ Manual cleanup |
| **Analytics** | ❌ No complex query | ✅ Aggregation pipeline |

**Best Practice:** Hybrid
- Redis: Hot data (active games, online users)
- MongoDB: Cold data (history, profiles, stats)

### 8. Socket.IO Events Reference (40+ Events)

**Queue & Matchmaking:**
- `queue:join` - Join matchmaking queue
- `queue:waiting` - Waiting for opponent
- `queue:cancelled` - Match cancelled
- `match:found` - Opponent found

**Lobby:**
- `lobby:playerReady` - Player ready state
- `lobby:bothReady` - Both players ready
- `lobby:countdown` - Countdown to game start
- `lobby:characterChanged` - Character selection changed

**Game:**
- `deploy_fleet` - Submit ship positions
- `deployment_confirmed` - Server confirmed deployment
- `deployment_complete` - Both deployed, battle starts
- `attack` - Send attack coordinates
- `attack_result` - Hit/miss/sunk result
- `turn_changed` - Turn switched to other player
- `turn_continue` - Same player continues (after hit)
- `game_over` - Game ended with winner

**Timers:**
- `deployment_timer_update` - Deployment countdown (120s)
- `battle_timer_update` - Turn countdown (30s)
- `battle_timer_warning` - 10s warning
- `turn_timeout` - Player didn't attack in time

**Reconnect:**
- `rejoin_game` - Request rejoin after disconnect
- `rejoin_game_success` - Rejoin successful with full state
- `rejoin_game_failed` - Game not found or expired
- `player:reconnected` - Opponent reconnected
- `player:disconnected` - Opponent disconnected

**Chat:**
- `chat_message` - Send/receive message
- `get_chat_history` - Request old messages
- `chat_history` - Array of messages
- `player_typing` - Typing indicator

**WebRTC:**
- `call_request` - Initiate call
- `call_accepted` - Callee accepts
- `call_rejected` - Callee rejects
- `call_ended` - Either party ends call
- `webrtc_offer` - SDP offer (caller)
- `webrtc_answer` - SDP answer (callee)
- `webrtc_ice_candidate` - ICE candidate exchange

### 9. Rate Limiting Strategy

```javascript
// Auth endpoints: Strict (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                    // 50 requests
  message: 'Too many requests, try again later'
});

// API endpoints: Moderate
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,                   // 200 requests
});

// Socket.IO: No built-in rate limit (potential issue!)
// Could add:
socket.use((packet, next) => {
  const now = Date.now();
  if (!socket.lastEventTime) socket.lastEventTime = {};
  
  const eventName = packet[0];
  const lastTime = socket.lastEventTime[eventName] || 0;
  
  if (now - lastTime < 100) { // 100ms cooldown
    return next(new Error('Rate limit exceeded'));
  }
  
  socket.lastEventTime[eventName] = now;
  next();
});
```

### 10. Security Vulnerabilities & Mitigations

| Vulnerability | Attack | Mitigation (Current) |
|---------------|--------|---------------------|
| **XSS** | `<script>steal()</script>` in chat | ✅ Sanitize (replace `<>`) |
| **SQL Injection** | N/A (NoSQL) | ✅ Mongoose escapes |
| **NoSQL Injection** | `{ $gt: "" }` in username | ✅ express-validator |
| **CSRF** | Fake form submission | ⚠️ No CSRF token (but uses JWT) |
| **JWT Secret Leak** | Forge tokens | ⚠️ Secret in .env (must keep safe) |
| **DoS (Socket spam)** | Spam events | ❌ No Socket.IO rate limit |
| **Man-in-the-Middle** | Intercept packets | ✅ HTTPS/WSS encryption |
| **Brute Force** | Try many passwords | ✅ Rate limit (50/15min) |

---

## 📋 CHECKLIST ÔN THI

### Lý Thuyết Bắt Buộc
- [ ] Giải thích TCP 3-way handshake
- [ ] So sánh TCP vs UDP với ví dụ
- [ ] Giải thích WebSocket handshake
- [ ] Giải thích STUN/TURN/ICE
- [ ] Phân biệt Multicast vs Broadcast vs Unicast
- [ ] Giải thích JWT authentication flow
- [ ] Giải thích Server-authoritative pattern
- [ ] OSI 7 layers và protocol ở mỗi layer

### Kỹ Thuật Bắt Buộc
- [ ] Vẽ được architecture diagram (Client-Server-DB)
- [ ] Vẽ được sequence diagram (Login → Game → Call)
- [ ] Giải thích Nginx reverse proxy
- [ ] Giải thích SSL/TLS handshake
- [ ] List được 10 Socket.IO events quan trọng
- [ ] Giải thích reconnect mechanism
- [ ] Giải thích Redis vs MongoDB use cases

### Code Phải Hiểu
- [ ] JWT sign & verify code
- [ ] Socket.IO auth middleware
- [ ] Attack validation logic
- [ ] WebRTC peer connection setup
- [ ] Chat sanitization function
- [ ] Redis save/load game state

### Demo Phải Chạy Được
- [ ] Register → Login → Get JWT
- [ ] Quick play → Matchmaking → Lobby
- [ ] Deploy ships → Attack → Game over
- [ ] Chat message → Save DB → Load history
- [ ] Voice call → WebRTC connection

---

## 💡 TIPS TRÌNH BÀY

### Câu Hỏi Thường Gặp (Chuẩn Bị Sẵn)

**1. "Tại sao dùng Socket.IO thay vì WebSocket thuần?"**
→ Socket.IO có auto-reconnect, rooms, event abstraction, fallback to polling

**2. "Nếu server restart thì sao?"**
→ In-memory state mất → Cần Redis để persist
→ Players phải reconnect và rejoin game

**3. "WebRTC dùng UDP hay TCP?"**
→ Signaling (SDP/ICE) dùng TCP (qua Socket.IO)
→ Media (audio/video) dùng UDP (low latency, chấp nhận mất gói)

**4. "Làm sao chống cheat?"**
→ Server-authoritative: Server validate mọi move
→ Client không thể tự quyết định "tôi thắng"

**5. "JWT Secret bị lộ thì sao?"**
→ Hacker forge fake tokens → Access bất kỳ account
→ Phải đổi secret → All users phải login lại

**6. "HTTPS vs HTTP khác gì?"**
→ HTTPS = HTTP + TLS encryption
→ Bảo mật password, token, chat messages
→ Browsers yêu cầu HTTPS cho WebRTC getUserMedia

**7. "Multicast là gì?"**
→ 1-to-many: 1 sender → N receivers
→ Project dùng Socket.IO rooms (application-level multicast)
→ KHÔNG dùng IP multicast (224.x.x.x)

**8. "Rate limiting hoạt động thế nào?"**
→ Track số requests per IP per time window
→ Auth: 50 requests/15min
→ Vượt quá → 429 Too Many Requests

**9. "Redis dùng để làm gì?"**
→ Cache game state (in-memory, fast)
→ TTL 2 hours (auto-delete expired games)
→ User online status tracking

**10. "MongoDB TTL index là gì?"**
→ Tự động xóa documents sau thời gian định trước
→ Guest users: 24h, Chat: 7 days, Call logs: 30 days
→ Background process check mỗi 60 giây

### Điểm Cộng Khi Trình Bày
- ✅ Vẽ diagram trực tiếp (whiteboard hoặc draw.io)
- ✅ Demo live (show console logs)
- ✅ Giải thích "Tại sao?" không chỉ "Cái gì?"
- ✅ So sánh alternatives (vì sao chọn Socket.IO thay vì pure WebSocket?)
- ✅ Nói về limitations và cách improve

### Điểm Trừ Khi Trình Bày
- ❌ Đọc slide y chang
- ❌ Không giải thích được code của mình
- ❌ Không trả lời được câu hỏi cross-topic
- ❌ Demo fail và không có backup plan
- ❌ Nói "Tôi không biết" mà không thử suy luận

---

**Chúc bạn học tốt và thi đạt điểm cao! 🎉**

