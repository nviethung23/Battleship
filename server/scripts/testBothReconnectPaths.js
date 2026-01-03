/**
 * Test Script - Monitor Redis State During Reconnect
 * 
 * This script monitors Redis keys to verify Path 2 fix
 * Run while manually testing reconnect in browser
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

function prompt(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function checkRedisKey(key) {
    return new Promise((resolve) => {
        exec(`redis-cli GET "${key}"`, (error, stdout, stderr) => {
            if (error) {
                resolve({ error: error.message });
            } else {
                resolve({ value: stdout.trim() });
            }
        });
    });
}

async function monitorUserState(userId) {
    log(`\n========================================`);
    log(`Checking Redis State for: ${userId}`);
    log(`========================================\n`);

    const connected = await checkRedisKey(`user:${userId}:connected`);
    const socket = await checkRedisKey(`user:${userId}:socket`);
    const disconnectAt = await checkRedisKey(`user:${userId}:disconnectAt`);

    console.log('Connected:', connected.value || connected.error);
    console.log('Socket ID:', socket.value || socket.error);
    console.log('Disconnect At:', disconnectAt.value || '(nil)');
    console.log('');

    // Interpret results
    if (connected.value === '"true"') {
        log('✅ User is CONNECTED');
    } else if (connected.value === '"false"') {
        log('❌ User is DISCONNECTED');
    } else {
        log('⚠️  Connection state unknown');
    }

    if (disconnectAt.value && disconnectAt.value !== '(nil)') {
        const timestamp = parseInt(disconnectAt.value.replace(/"/g, ''));
        const elapsed = Date.now() - timestamp;
        log(`⏰ Disconnected ${elapsed}ms ago`);
    }

    console.log('\n');
}

async function runMonitoring() {
    console.clear();
    log('🔍 Redis State Monitor for Path 2 Fix Testing\n');

    log('This script monitors Redis keys during manual reconnect testing.');
    log('Open browser, login, join room, then test reconnect.\n');

    const userId = await prompt('Enter userId to monitor (e.g., admin): ');

    if (!userId) {
        log('❌ No userId provided');
        rl.close();
        process.exit(1);
    }

    log(`\n✅ Monitoring Redis state for user: ${userId}`);
    log('Press Ctrl+C to stop\n');

    // Initial check
    await monitorUserState(userId);

    // Auto-refresh every 2 seconds
    const intervalId = setInterval(async () => {
        await monitorUserState(userId);
    }, 2000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        clearInterval(intervalId);
        log('\n👋 Monitoring stopped');
        rl.close();
        process.exit(0);
    });
}

// ========================================
// MANUAL TESTING INSTRUCTIONS
// ========================================

console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   PATH 2 FIX - MANUAL TEST GUIDE                   ║
╚═══════════════════════════════════════════════════════════════════╝

📋 TESTING STEPS:

1. Start this monitor:
   node server/scripts/testBothReconnectPaths.js

2. Start server in another terminal:
   npm start

3. Open browser → Login → Join room → Go to game.html

4. Test Path 2 reconnect in BROWSER CONSOLE:
   
   socket.disconnect();
   setTimeout(() => {
       socket.connect();
       socket.once('connect', () => {
           const data = JSON.parse(localStorage.getItem('gameRoomData'));
           socket.emit('lobby:requestRoomInfo', {
               roomCode: data.roomCode || data.roomId,
               userId: BattleshipState.getUserId(),
               username: BattleshipState.getUsername()
           });
       });
   }, 1000);

5. Watch this monitor - should see:
   ✅ Connected: "true"
   ✅ Disconnect At: (nil)

6. Check server logs for:
   ✅ [PATH 2] Registering socket BEFORE room join
   ✅ [SocketState] Registered socket

7. Wait 10 seconds - should NOT see disconnect timeout

──────────────────────────────────────────────────────────────────────

🔍 WHAT TO LOOK FOR:

SUCCESS (Fix Working):
  ✅ Connected: "true" (after reconnect)
  ✅ Disconnect At: (nil)
  ✅ Server log shows [PATH 2]
  ✅ No player_disconnect_timeout event

FAILURE (Bug Still Exists):
  ❌ Connected: "false" (after reconnect)
  ❌ Disconnect At: <timestamp>
  ❌ No [PATH 2] log
  ❌ player_disconnect_timeout event fires

──────────────────────────────────────────────────────────────────────

Press Enter to start monitoring...
`);

runMonitoring();
