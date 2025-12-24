// Socket.IO connection
let socket = null;
let currentUserId = null;
let currentUsername = null;
let currentRoomId = null;

function initSocket() {
    const token = localStorage.getItem('token');
    currentUserId = localStorage.getItem('userId');
    currentUsername = localStorage.getItem('username');

    console.log('[Socket Init] Checking authentication...');
    console.log('[Socket Init] Token:', token ? 'exists' : 'missing');
    console.log('[Socket Init] UserId:', currentUserId);
    console.log('[Socket Init] Username:', currentUsername);

    if (!token || !currentUserId || !currentUsername) {
        console.error('[Socket Init] Missing credentials, redirecting to login');
        console.error('[Socket Init] Token:', !!token, 'UserId:', !!currentUserId, 'Username:', !!currentUsername);
        window.location.href = '/';
        return;
    }

    // Connect to server
    socket = io({
        auth: {
            token: token
        }
    });

    console.log('=== SOCKET.IO INITIALIZING ===');
    console.log('Socket ID:', socket.id);
    console.log('User ID:', currentUserId);
    console.log('Username:', currentUsername);

    // Connection events
    socket.on('connect', () => {
        console.log('✅ Connected to server. Socket ID:', socket.id);
    });

    socket.on('connected', (data) => {
        console.log('Authenticated:', data);
        
        // Hiển thị tên đẹp cho guest
        const isGuest = localStorage.getItem('isGuest') === 'true';
        const displayName = isGuest 
            ? localStorage.getItem('guestDisplayName') || data.username
            : data.username;
            
        // Update header username (legacy)
        const headerUsername = document.getElementById('username');
        if (headerUsername) {
            headerUsername.textContent = displayName;
        }
        
        // Update hub sidebar username (new)
        const hubUsername = document.getElementById('hubUsername');
        if (hubUsername) {
            hubUsername.textContent = displayName;
        }
        
        // Update hub status
        const hubStatus = document.getElementById('hubStatus');
        if (hubStatus) {
            hubStatus.textContent = isGuest ? 'Guest' : 'Online';
        }
        
        // Update user ID chip
        const chipUserId = document.getElementById('chipUserId');
        if (chipUserId) {
            const userId = data.userId || localStorage.getItem('userId');
            const shortId = userId ? userId.substring(0, 8) : '----';
            chipUserId.textContent = `ID: ${shortId}`;
        }
        
        // Check if user is admin
        checkAdminRole();
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Mất kết nối với server', 'error');
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showNotification(data.message || 'Có lỗi xảy ra', 'error');
    });

    // Room events
    socket.on('room_created', (data) => {
        currentRoomId = data.roomId;
        // Hiển thị thông báo và chờ đối thủ join
        showNotification('Đã tạo phòng! Đang chờ đối thủ...', 'success');
        // Nếu đã có 2 người (trường hợp hiếm), chuyển thẳng sang character selection
        if (data.room && data.room.player2) {
            if (typeof showCharacterSelectionScreen === 'function') {
                showCharacterSelectionScreen(data.room);
            }
        }
    });

    // ============ NEW: PRIVATE ROOM & QUEUE EVENTS ============
    
    // Private room created
    socket.on('room:created', (data) => {
        currentRoomId = data.roomId;
        console.log('[Private Room] Created:', data);
        
        if (data.isPrivate && data.roomCode) {
            // Show room code display
            document.getElementById('roomCodeValue').textContent = data.roomCode;
            document.getElementById('roomCodeDisplay').style.display = 'block';
            document.getElementById('roomCodeInput').value = ''; // Clear input
            showNotification(`Phòng riêng đã tạo! Mã: ${data.roomCode}`, 'success');
        } else {
            showNotification('Đã tạo phòng! Đang chờ đối thủ...', 'success');
        }
    });

    // Room error
    socket.on('room:error', (data) => {
        console.error('[Room Error]:', data.message);
        showNotification(data.message || 'Có lỗi xảy ra', 'error');
    });

    // Queue waiting
    socket.on('queue:waiting', (data) => {
        console.log('[Queue] Waiting... position:', data.position);
        document.getElementById('queueOverlay').style.display = 'flex';
    });

    // Queue cancelled
    socket.on('queue:cancelled', () => {
        console.log('[Queue] Cancelled');
        document.getElementById('queueOverlay').style.display = 'none';
        showNotification('Đã huỷ tìm trận', 'info');
    });

    // Queue error
    socket.on('queue:error', (data) => {
        console.error('[Queue Error]:', data.message);
        document.getElementById('queueOverlay').style.display = 'none';
        showNotification(data.message || 'Có lỗi xảy ra', 'error');
    });

    // Match found (from queue)
    socket.on('match:found', (data) => {
        console.log('[Queue] Match found!', data);
        currentRoomId = data.room.id;
        
        // Hide queue overlay
        document.getElementById('queueOverlay').style.display = 'none';
        
        // Hide room code display if visible
        document.getElementById('roomCodeDisplay').style.display = 'none';
        
        showNotification('Đã tìm thấy đối thủ! Bắt đầu chọn nhân vật...', 'success');
        
        // Go to character selection
        if (typeof showCharacterSelectionScreen === 'function') {
            const roomDataWithTime = {
                ...data.room,
                characterSelectionStartTime: data.characterSelectionStartTime || Date.now()
            };
            
            setTimeout(() => {
                showCharacterSelectionScreen(roomDataWithTime);
            }, 500);
        }
    });

    socket.on('room_list', (data) => {
        updateRoomList(data.rooms);
    });

    socket.on('player_joined', (data) => {
        currentRoomId = data.room.id;
        console.log('=== PLAYER_JOINED EVENT ===');
        console.log('Room data:', data.room);
        console.log('Player1:', data.room.player1);
        console.log('Player2:', data.room.player2);
        console.log('Character selection start time:', data.characterSelectionStartTime);
        
        // Cả 2 người chơi đều nhận event này khi có người join
        const currentUserId = localStorage.getItem('userId');
        console.log('Current userId:', currentUserId);
        
        const isMeJoining = data.room.player2 && data.room.player2.userId === currentUserId;
        console.log('Is me joining?', isMeJoining);
        
        // Hide UI elements
        if (typeof hideRoomList === 'function') {
            console.log('Hiding room list panel...');
            hideRoomList();
        }
        
        // Hide room code display if visible
        document.getElementById('roomCodeDisplay').style.display = 'none';
        
        // Hide queue overlay if visible
        document.getElementById('queueOverlay').style.display = 'none';
        
        if (isMeJoining) {
            // Tôi là người vừa join
            showNotification('Đã tham gia phòng! Bắt đầu chọn nhân vật...', 'success');
        } else {
            // Đối thủ vừa join phòng của tôi
            showNotification('Đối thủ đã tham gia! Bắt đầu chọn nhân vật...', 'success');
        }
        
        // Chuyển sang màn hình chọn nhân vật ngay lập tức (đã có đủ 2 người)
        if (data.room && data.room.player1 && data.room.player2) {
            console.log('Both players present, checking for showCharacterSelectionScreen...');
            console.log('showCharacterSelectionScreen type:', typeof showCharacterSelectionScreen);
            
            if (typeof showCharacterSelectionScreen === 'function') {
                console.log('Calling showCharacterSelectionScreen in 500ms...');
                
                // Thêm characterSelectionStartTime vào room data để đồng bộ timer
                const roomDataWithTime = {
                    ...data.room,
                    characterSelectionStartTime: data.characterSelectionStartTime || Date.now()
                };
                
                // Đợi 500ms để người dùng đọc thông báo
                setTimeout(() => {
                    console.log('Now calling showCharacterSelectionScreen...');
                    showCharacterSelectionScreen(roomDataWithTime);
                }, 500);
            } else {
                console.error('❌ showCharacterSelectionScreen function not found!');
                console.error('Available functions:', Object.keys(window));
            }
        } else {
            console.error('❌ Room data incomplete!');
            console.error('Player1:', data.room.player1);
            console.error('Player2:', data.room.player2);
        }
    });
    
    // Character selection events
    socket.on('character_selected', (data) => {
        if (typeof handleOpponentCharacterSelected === 'function') {
            handleOpponentCharacterSelected(data);
        }
    });
    
    socket.on('character_locked', (data) => {
        if (typeof handleOpponentCharacterLocked === 'function') {
            handleOpponentCharacterLocked(data);
        }
    });
    
    socket.on('character_selection_complete', (data) => {
        console.log('=== CHARACTER_SELECTION_COMPLETE ===');
        console.log('Data:', data);
        // Cả 2 đã chọn xong → vào placement screen
        if (typeof showPlacementScreen === 'function') {
            console.log('Calling showPlacementScreen...');
            showPlacementScreen();
        } else {
            console.error('❌ showPlacementScreen function not found!');
        }
    });

    socket.on('player_ready_update', (data) => {
        console.log('=== PLAYER_READY_UPDATE ===');
        console.log('Player1 ready:', data.player1Ready);
        console.log('Player2 ready:', data.player2Ready);
        updatePlayerReadyStatus(data);
    });

    socket.on('game_started', (data) => {
        console.log('=== GAME_STARTED EVENT RECEIVED ===');
        console.log('Game data:', data);
        console.log('Current turn:', data.currentTurn);
        console.log('Player1:', data.player1);
        console.log('Player2:', data.player2);
        console.log('typeof startGameScreen:', typeof startGameScreen);
        
        if (typeof startGameScreen === 'function') {
            console.log('✅ Calling startGameScreen...');
            try {
                startGameScreen(data);
                console.log('✅ startGameScreen called successfully');
            } catch (error) {
                console.error('❌ Error calling startGameScreen:', error);
            }
        } else {
            console.error('❌ startGameScreen function not found!');
            console.error('Available functions:', Object.keys(window));
        }
    });

    socket.on('attack_result', (data) => {
        handleAttackResult(data);
    });

    socket.on('turn_changed', (data) => {
        console.log('🔄 TURN_CHANGED - Đổi lượt sang:', data.currentPlayer, 'userId:', data.currentTurn);
        // Chuyển lượt → Show transition
        updateTurn(data, true);
    });

    socket.on('turn_continue', (data) => {
        console.log('✅ TURN_CONTINUE - Lượt vẫn là:', data.currentPlayer, 'userId:', data.currentTurn);
        // Bắn trúng, được bắn tiếp - lượt KHÔNG đổi, KHÔNG show transition
        updateTurn(data, false);
    });

    socket.on('turn_timeout', (data) => {
        showNotification(`${data.timeoutPlayer} đã hết thời gian!`, 'warning');
    });

    socket.on('game_over', (data) => {
        showGameOver(data);
    });

    socket.on('player_disconnected', (data) => {
        showNotification(data.message, 'error');
        setTimeout(() => {
            backToLobby();
        }, 3000);
    });

    // Chat events
    socket.on('chat_message', (data) => {
        addChatMessage(data);
    });

    socket.on('player_typing', (data) => {
        showTypingIndicator(data.username);
    });

    // WebRTC events
    socket.on('webrtc_offer', (data) => {
        handleWebRTCOffer(data);
    });

    socket.on('webrtc_answer', (data) => {
        handleWebRTCAnswer(data);
    });

    socket.on('webrtc_ice_candidate', (data) => {
        handleWebRTCIceCandidate(data);
    });

    socket.on('call_request', (data) => {
        handleCallRequest(data);
    });

    socket.on('call_accepted', (data) => {
        handleCallAccepted(data);
    });

    socket.on('call_rejected', (data) => {
        handleCallRejected(data);
    });

    socket.on('call_ended', (data) => {
        handleCallEnded(data);
    });
}

// Socket functions
function createRoom() {
    socket.emit('create_room', {});
}

function joinRoom(roomId) {
    socket.emit('join_room', { roomId });
    currentRoomId = roomId;
    // Hide room list panel when joining a room
    if (typeof hideRoomList === 'function') {
        hideRoomList();
    }
}

function getRoomList() {
    socket.emit('get_room_list');
}

function sendPlayerReady(ships, board) {
    if (!socket) {
        console.error('[Socket] Socket not initialized! Cannot send player ready.');
        SocketShared.showNotification('Lỗi kết nối! Vui lòng tải lại trang.', 'error');
        return;
    }
    
    console.log('[Socket] Sending player ready:', { roomId: currentRoomId, ships, board });
    
    socket.emit('player_ready', {
        roomId: currentRoomId,
        ships: ships,
        board: board
    });
}

function sendAttack(row, col) {
    socket.emit('attack', {
        roomId: currentRoomId,
        row: row,
        col: col
    });
}

function sendChatMessage(message) {
    socket.emit('chat_message', {
        roomId: currentRoomId,
        message: message,
        timestamp: Date.now()
    });
}

function sendTypingIndicator() {
    socket.emit('player_typing', {
        roomId: currentRoomId
    });
}

// Notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Check if user is admin and show admin button
function checkAdminRole() {
    const token = localStorage.getItem('token');
    const adminBtn = document.getElementById('adminBtn');
    
    if (!token || !adminBtn) return;
    
    try {
        // Decode token to get role
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
            adminBtn.style.display = 'inline-block';
        } else {
            adminBtn.style.display = 'none';
        }
    } catch (e) {
        console.error('Error decoding token:', e);
        adminBtn.style.display = 'none';
    }
}

// Check admin role on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAdminRole);
} else {
    checkAdminRole();
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

