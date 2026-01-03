# ✅ AWS EC2 DEPLOYMENT CHECKLIST

## 📋 PRE-DEPLOYMENT (Local Testing)

### ✅ COMPLETED FIXES:
1. ✅ Path 1 fix - `join_game_room` registerSocket first
2. ✅ Path 2 fix - `requestRoomInfo` registerSocket 
3. ✅ Race condition fix - socketId validation in `markDisconnected()`
4. ✅ TOCTOU fix - double-check socketId before Redis write
5. ✅ Deploying forfeit fix - Redis checks before forfeit
6. ✅ Grace timer fix - multi-layer validation
7. ✅ Reconnecting overlay - Fixed event listeners

### ⚠️ PENDING LOCAL TESTS:
- [ ] Test reconnect during `deploying` phase
- [ ] Test reconnect during `playing` phase  
- [ ] Test reconnect during `lobby` phase
- [ ] Test grace period (10s battle, 5s lobby)
- [ ] Test reconnecting overlay shows up
- [ ] Test opponent sees "waiting for reconnect" message
- [ ] Test multiple rapid reconnects

---

## 🚀 AWS EC2 DEPLOYMENT STEPS

### PHASE 1: Backup Current Production

```bash
# SSH vào EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Backup current code
cd /home/ubuntu/battleship
git stash
git branch backup-before-redis-$(date +%Y%m%d-%H%M%S)
git log -1 > /tmp/last-commit-before-redis.txt
```

### PHASE 2: Install Redis on EC2

```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf
# Tìm dòng: supervised no
# Đổi thành: supervised systemd

# Start Redis
sudo systemctl restart redis.service
sudo systemctl enable redis.service

# Verify Redis
redis-cli ping  # Should return PONG
```

### PHASE 3: Update Environment Variables

```bash
cd /home/ubuntu/battleship

# Create/update .env file
nano .env
```

Add these variables:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # Leave empty for local Redis
REDIS_ENABLED=true

# Existing variables (don't change)
MONGODB_URI=your-mongodb-uri
SESSION_SECRET=your-secret
PORT=3000
```

### PHASE 4: Deploy New Code

```bash
# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Check for syntax errors
node -c server/server.js
node -c server/utils/socketStateManager.js
node -c server/socket/gameHandler.js
```

### PHASE 5: Test Redis Connection

```bash
# Quick Redis test
node -e "const redis = require('redis'); const client = redis.createClient(); client.on('error', err => console.log('Redis Error', err)); client.on('connect', () => { console.log('✅ Redis Connected!'); client.quit(); });"
```

### PHASE 6: Restart Server

```bash
# If using PM2
pm2 restart battleship
pm2 logs battleship --lines 100

# If using systemd service
sudo systemctl restart battleship
sudo journalctl -u battleship -f -n 100

# If running directly
# Stop current process (Ctrl+C)
npm start
```

### PHASE 7: Monitor Logs

```bash
# Watch for these critical logs:
# ✅ [Redis] Connected to Redis
# ✅ [SocketState] Redis-backed mode enabled
# ✅ [SocketState] Registered socket XXX for user YYY
# ⚠️ Look for any Redis connection errors

# Monitor in real-time
pm2 logs battleship --raw | grep -E "Redis|SocketState|Disconnect|Grace"
```

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Quick Reconnect (< 1s)
1. Start game with 2 players
2. Player 1 refresh page quickly
3. **Expected**: No disconnect notification, seamless reconnect
4. **Check logs**: `[SocketState] Ignoring disconnect - rapid reconnection`

### Test 2: Grace Period Reconnect (5-8s)
1. Start game with 2 players (deploying or playing phase)
2. Player 1 close browser
3. Wait 5-8 seconds
4. Player 1 reconnect
5. **Expected**: 
   - Opponent sees "Waiting for reconnect..." overlay with countdown
   - Player 1 rejoins successfully
   - Game continues
6. **Check logs**: `[Disconnect] ✅ User RECONNECTED - cancelling timeout`

### Test 3: Grace Period Expired (> 10s)
1. Start game with 2 players (deploying or playing phase)
2. Player 1 close browser
3. Wait > 10 seconds
4. **Expected**: 
   - Opponent wins by forfeit
   - Game over screen shows
5. **Check logs**: `[Disconnect] ❌ User did not reconnect, opponent wins`

### Test 4: TOCTOU Race Condition
1. Start game with 2 players
2. Player 1 rapid refresh (F5 spam 3-4 times in 1 second)
3. **Expected**: 
   - No false disconnect
   - Player stays in game
   - No forfeit
4. **Check logs**: `[SocketState] ⚠️ RACE DETECTED! SocketId changed - ABORT`

### Test 5: Deploying Phase Reconnect
1. Player 1 and Player 2 in deploying phase
2. Player 1 refresh page during ship placement
3. Wait 2-3 seconds, reconnect
4. **Expected**:
   - Player 1 returns to ship placement screen
   - Ships already placed are still there
   - Can continue deploying
5. **Check logs**: `[GameHandler] ✅ Socket XXX joined room YYY`

---

## 🐛 ROLLBACK PLAN (If Something Goes Wrong)

### Emergency Rollback:

```bash
# Stop server
pm2 stop battleship
# OR
sudo systemctl stop battleship

# Restore backup branch
git checkout backup-before-redis-YYYYMMDD-HHMMSS

# Disable Redis
export REDIS_ENABLED=false
# OR edit .env: REDIS_ENABLED=false

# Restart with old code
pm2 restart battleship
```

### Disable Redis Without Rollback:

Edit `.env`:
```env
REDIS_ENABLED=false
```

Server will fallback to memory-only mode (old behavior).

---

## 📊 MONITORING

### Key Metrics to Watch:

1. **Redis Memory Usage**:
   ```bash
   redis-cli INFO memory
   ```

2. **Active Sessions**:
   ```bash
   redis-cli KEYS "session:*" | wc -l
   redis-cli KEYS "user:*:connected" | wc -l
   ```

3. **Server Memory**:
   ```bash
   pm2 monit
   # OR
   htop
   ```

4. **Error Logs**:
   ```bash
   pm2 logs battleship --err
   # OR
   sudo journalctl -u battleship -p err
   ```

---

## 🔥 CRITICAL REDIS COMMANDS (Emergency Use)

```bash
# View all user sessions
redis-cli KEYS "session:*"

# Check specific user connection status
redis-cli GET "user:USER_ID_HERE:connected"
redis-cli GET "user:USER_ID_HERE:socket"

# Clear stuck session (if user can't reconnect)
redis-cli DEL "session:USER_ID_HERE"
redis-cli DEL "user:USER_ID_HERE:connected"
redis-cli DEL "user:USER_ID_HERE:socket"
redis-cli DEL "user:USER_ID_HERE:room"

# Clear ALL sessions (nuclear option - kicks everyone)
redis-cli FLUSHDB
```

---

## ✅ DEPLOYMENT SUCCESS CRITERIA

- [ ] Server starts without errors
- [ ] Redis connection established
- [ ] No existing games disrupted
- [ ] New games work normally
- [ ] Reconnect during grace period works
- [ ] Reconnecting overlay displays properly
- [ ] No false forfeits
- [ ] Grace period timers accurate (10s/5s)
- [ ] Redis memory usage stable (< 100MB)
- [ ] No memory leaks after 1 hour

---

## 📝 FILES CHANGED (For Git Commit)

### Modified:
- `server/server.js` - Redis integration
- `server/socket/gameHandler.js` - Race condition fixes, grace period logic
- `server/config/redis.js` - NEW Redis config
- `server/utils/socketStateManager.js` - NEW Redis state manager
- `client/js/game.js` - Fixed event listeners for reconnect overlay
- `package.json` - Added redis dependency

### Documentation:
- `AWS_DEPLOYMENT_CHECKLIST.md` - This file
- `SEV1_FIX_SUMMARY.md` - Bug fix summary
- `file md/PATH2_FIX_COMPLETE.md` - Technical details

---

## 🎯 NEXT STEPS AFTER SUCCESSFUL DEPLOYMENT

1. Monitor for 24 hours
2. Collect user feedback
3. Check Redis memory usage trends
4. Optimize Redis key expiration if needed
5. Consider Redis persistence (RDB/AOF) for production
6. Set up Redis backup strategy
7. Configure Redis maxmemory policy

---

## 🆘 SUPPORT CONTACTS

**If deployment fails:**
1. Check logs first: `pm2 logs battleship --lines 200`
2. Test Redis: `redis-cli ping`
3. Rollback if critical: See "ROLLBACK PLAN" above
4. Report issues with full logs

**Expected Redis memory usage:**
- Per session: ~2KB
- Per user: ~0.5KB
- 100 concurrent users: ~250KB
- 1000 concurrent users: ~2.5MB

---

## 📅 DEPLOYMENT TIMESTAMP

- **Prepared**: January 4, 2026
- **Deployed**: ________________
- **Deployed By**: ________________
- **EC2 Instance**: ________________
- **Redis Version**: ________________
- **Node.js Version**: ________________

