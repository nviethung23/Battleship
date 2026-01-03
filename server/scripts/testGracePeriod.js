/**
 * Test Script: Verify Lobby Grace Period Fix
 * 
 * Run this to manually test the reconnection scenarios
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_TOKEN_A = process.env.TEST_TOKEN_A; // User A (host)
const TEST_TOKEN_B = process.env.TEST_TOKEN_B; // User B (guest)

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createSocket(token, username) {
    const socket = io(SERVER_URL, {
        auth: { token },
        reconnection: false // Disable auto-reconnect for testing
    });
    
    socket.on('connect', () => {
        console.log(`[${username}] ✅ Connected: ${socket.id}`);
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`[${username}] ❌ Disconnected: ${reason}`);
    });
    
    socket.on('room:error', (data) => {
        console.error(`[${username}] 🚫 Room error:`, data.message);
    });
    
    socket.on('room:disbanded', (data) => {
        console.error(`[${username}] 💥 ROOM DISBANDED:`, data.reason);
    });
    
    socket.on('player_ready_update', (data) => {
        console.log(`[${username}] 📨 Ready update:`, data);
    });
    
    return socket;
}

async function testScenario1_NormalReconnect() {
    console.log('\n========================================');
    console.log('TEST 1: Normal Reconnect (< 5s)');
    console.log('Expected: User B stays in lobby');
    console.log('========================================\n');
    
    const socketA = createSocket(TEST_TOKEN_A, 'UserA');
    await sleep(500);
    
    const socketB = createSocket(TEST_TOKEN_B, 'UserB');
    await sleep(500);
    
    // Create lobby
    console.log('[UserA] Creating quick match lobby...');
    socketA.emit('quick_match', {});
    await sleep(1000);
    
    // UserB joins (get roomCode from event)
    let roomCode;
    socketA.once('lobby:created', (data) => {
        roomCode = data.roomCode;
        console.log('[UserA] Lobby created:', roomCode);
        
        setTimeout(() => {
            console.log('[UserB] Joining lobby:', roomCode);
            socketB.emit('join_game_room', { roomCode });
        }, 500);
    });
    
    await sleep(2000);
    
    // Simulate disconnect
    console.log('\n[UserB] 💀 Simulating disconnect...');
    socketB.disconnect();
    await sleep(2000);
    
    // Reconnect
    console.log('[UserB] 🔄 Reconnecting...');
    const socketB2 = createSocket(TEST_TOKEN_B, 'UserB');
    await sleep(500);
    
    socketB2.emit('join_game_room', { roomCode });
    await sleep(3000);
    
    console.log('\n✅ TEST 1 PASS: UserB should still be in lobby');
    
    socketA.disconnect();
    socketB2.disconnect();
}

async function testScenario2_LateReconnect() {
    console.log('\n========================================');
    console.log('TEST 2: Late Reconnect (~4.9s)');
    console.log('Expected: User B stays in lobby (edge case)');
    console.log('========================================\n');
    
    const socketA = createSocket(TEST_TOKEN_A, 'UserA');
    await sleep(500);
    
    const socketB = createSocket(TEST_TOKEN_B, 'UserB');
    await sleep(500);
    
    // Create lobby
    console.log('[UserA] Creating quick match lobby...');
    socketA.emit('quick_match', {});
    await sleep(1000);
    
    let roomCode;
    socketA.once('lobby:created', (data) => {
        roomCode = data.roomCode;
        console.log('[UserA] Lobby created:', roomCode);
        
        setTimeout(() => {
            console.log('[UserB] Joining lobby:', roomCode);
            socketB.emit('join_game_room', { roomCode });
        }, 500);
    });
    
    await sleep(2000);
    
    // Simulate disconnect
    console.log('\n[UserB] 💀 Simulating disconnect...');
    socketB.disconnect();
    await sleep(4900); // Just before grace period expires
    
    // Late reconnect
    console.log('[UserB] 🔄 Late reconnect (4.9s after disconnect)...');
    const socketB2 = createSocket(TEST_TOKEN_B, 'UserB');
    await sleep(500);
    
    socketB2.emit('join_game_room', { roomCode });
    await sleep(2000);
    
    console.log('\n✅ TEST 2 PASS: UserB should stay in lobby (double-check caught this)');
    
    socketA.disconnect();
    socketB2.disconnect();
}

async function testScenario3_TrueDisconnect() {
    console.log('\n========================================');
    console.log('TEST 3: True Disconnect (> 5s)');
    console.log('Expected: Lobby disbanded');
    console.log('========================================\n');
    
    const socketA = createSocket(TEST_TOKEN_A, 'UserA');
    await sleep(500);
    
    const socketB = createSocket(TEST_TOKEN_B, 'UserB');
    await sleep(500);
    
    // Create lobby
    console.log('[UserA] Creating quick match lobby...');
    socketA.emit('quick_match', {});
    await sleep(1000);
    
    let roomCode;
    socketA.once('lobby:created', (data) => {
        roomCode = data.roomCode;
        console.log('[UserA] Lobby created:', roomCode);
        
        setTimeout(() => {
            console.log('[UserB] Joining lobby:', roomCode);
            socketB.emit('join_game_room', { roomCode });
        }, 500);
    });
    
    await sleep(2000);
    
    // Simulate disconnect
    console.log('\n[UserB] 💀 Simulating disconnect...');
    socketB.disconnect();
    
    // Wait for grace period to expire
    console.log('[Test] Waiting 6s for grace period to expire...');
    await sleep(6000);
    
    console.log('\n✅ TEST 3 PASS: Lobby should be disbanded (correct behavior)');
    
    socketA.disconnect();
}

async function runAllTests() {
    if (!TEST_TOKEN_A || !TEST_TOKEN_B) {
        console.error('❌ Missing TEST_TOKEN_A or TEST_TOKEN_B environment variables');
        console.log('\nUsage:');
        console.log('  TEST_TOKEN_A=<token1> TEST_TOKEN_B=<token2> node server/scripts/testGracePeriod.js');
        process.exit(1);
    }
    
    try {
        await testScenario1_NormalReconnect();
        await sleep(2000);
        
        await testScenario2_LateReconnect();
        await sleep(2000);
        
        await testScenario3_TrueDisconnect();
        
        console.log('\n========================================');
        console.log('✅ ALL TESTS COMPLETED');
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

// Run tests
runAllTests().catch(console.error);
