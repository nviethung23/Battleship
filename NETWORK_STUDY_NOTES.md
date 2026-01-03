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

## Game state storage (deploy)
- Current: in-memory maps/arrays in `server/socket/gameHandler.js` (lost on restart).
- Recommended for deploy:
  - Redis: fast in-memory, supports TTL and persistence, good for realtime state.
  - Database (Mongo/Postgres): durable snapshots and match history, slower than Redis.
  - Hybrid: Redis for live game state + DB for history and audit.
- If you scale multiple server instances:
  - Use Redis for shared state and a Socket.IO adapter (redis adapter) for room sync.

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

