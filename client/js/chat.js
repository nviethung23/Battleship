// Chat functionality for Battle Screen

let typingTimeout = null;
let chatPopupOpen = false;
let unreadCount = 0;

// Helper to get socket instance
function getSocket() {
    return window.socket || (typeof SocketShared !== 'undefined' ? SocketShared.getSocket() : null);
}

document.addEventListener('DOMContentLoaded', () => {
    initChatUI();
    initChatSocketListeners();
});

function initChatUI() {
    // Chat bubble toggle
    const chatBubble = document.getElementById('chatBubble');
    const chatPopup = document.getElementById('chatPopup');
    const closeChatPopup = document.getElementById('closeChatPopup');

    if (chatBubble && chatPopup) {
        chatBubble.addEventListener('click', () => {
            toggleChatPopup();
        });
    }

    if (closeChatPopup) {
        closeChatPopup.addEventListener('click', () => {
            closeChatPopupPanel();
        });
    }

    // Battle chat input
    const battleChatInput = document.getElementById('battleChatInput');
    const battleChatSend = document.getElementById('battleChatSend');

    if (battleChatInput && battleChatSend) {
        // Send message on button click
        battleChatSend.addEventListener('click', () => {
            sendBattleChatMessage();
        });

        // Send message on Enter key
        battleChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendBattleChatMessage();
            }
        });

        // Typing indicator
        battleChatInput.addEventListener('input', () => {
            sendTypingIndicator();

            // Clear previous timeout
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Hide typing indicator after 2 seconds of no input
            typingTimeout = setTimeout(() => {
                // Typing stopped
            }, 2000);
        });
    }

    // Legacy chat elements (if exists)
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');

    if (chatInput && sendChatBtn) {
        sendChatBtn.addEventListener('click', () => {
            sendMessage();
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

function initChatSocketListeners() {
    // Wait for socket to be available (exported from game.js as window.socket)
    const checkSocket = setInterval(() => {
        if (window.socket) {
            clearInterval(checkSocket);
            setupChatSocketEvents();
        }
    }, 100);
}

function setupChatSocketEvents() {
    const socket = getSocket();
    if (!socket) {
        console.warn('[Chat] Socket not available for event listeners');
        return;
    }
    
    console.log('[Chat] ✅ Setting up chat socket events');
    
    // Receive chat messages
    socket.on('chat_message', (data) => {
        console.log('[Chat] 📩 Received message:', data);
        addBattleChatMessage(data);
    });

    // Receive chat history
    socket.on('chat_history', (data) => {
        console.log('[Chat] 📚 Received history:', data);
        loadChatHistory(data);
    });

    // Typing indicator
    socket.on('player_typing', (data) => {
        showTypingIndicator(data.username);
    });
}

function toggleChatPopup() {
    const chatPopup = document.getElementById('chatPopup');
    
    if (!chatPopup) return;

    if (chatPopupOpen) {
        closeChatPopupPanel();
    } else {
        openChatPopupPanel();
    }
}

function openChatPopupPanel() {
    const chatPopup = document.getElementById('chatPopup');
    const chatBadge = document.getElementById('chatBadge');
    
    if (chatPopup) {
        chatPopup.style.display = 'flex';
        chatPopupOpen = true;

        // Reset unread count
        unreadCount = 0;
        if (chatBadge) {
            chatBadge.style.display = 'none';
            chatBadge.textContent = '0';
        }

        // Focus on input
        const input = document.getElementById('battleChatInput');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }

        // Load chat history if we have a room
        loadChatHistoryFromServer();

        if (typeof window.resumeCallVideoPlayback === 'function') {
            window.resumeCallVideoPlayback();
        }
    }
}

function closeChatPopupPanel() {
    const chatPopup = document.getElementById('chatPopup');
    
    if (chatPopup) {
        chatPopup.style.display = 'none';
        chatPopupOpen = false;
    }
}

function loadChatHistoryFromServer() {
    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    if (socket && roomId) {
        socket.emit('get_chat_history', {
            roomId: roomId,
            limit: 50
        });
    }
}

function loadChatHistory(data) {
    const chatMessages = document.getElementById('battleChatMessages');
    
    if (!chatMessages || !data.messages) return;

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Add each message
    data.messages.forEach(msg => {
        addBattleChatMessage(msg, false);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendBattleChatMessage() {
    const chatInput = document.getElementById('battleChatInput');
    const message = chatInput?.value?.trim();

    if (!message) return;

    const roomId = getCurrentRoomId();
    const userId = getCurrentUserId();
    const username = getCurrentUsername();
    const socket = getSocket();

    console.log('[Chat] 📤 Sending message:', {
        roomId,
        userId,
        username,
        message,
        hasSocket: !!socket
    });

    if (!socket || !roomId) {
        console.warn('[Chat] Cannot send message: no socket or room');
        return;
    }

    socket.emit('chat_message', {
        roomId: roomId,
        userId: userId,
        username: username,
        message: message,
        timestamp: Date.now()
    });

    chatInput.value = '';
}

function addBattleChatMessage(data, scrollToBottom = true) {
    const chatMessages = document.getElementById('battleChatMessages');
    
    console.log('[Chat] 📝 Adding message to DOM:', data);
    console.log('[Chat] chatMessages element:', chatMessages);
    
    if (!chatMessages) {
        console.warn('[Chat] ❌ battleChatMessages element not found!');
        return;
    }

    const messageDiv = document.createElement('div');
    const currentUserId = getCurrentUserId();
    const isOwnMessage = data.userId === currentUserId;
    const isSystem = data.messageType === 'system' || data.userId === 'system';

    if (isSystem) {
        messageDiv.className = 'chat-message system';
        messageDiv.innerHTML = `
            <div class="system-text">${escapeHtml(data.message)}</div>
        `;
    } else {
        messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`;

        const time = new Date(data.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            ${!isOwnMessage ? `<div class="username">${escapeHtml(data.username)}</div>` : ''}
            <div class="text">${escapeHtml(data.message)}</div>
            <div class="time">${time}</div>
        `;
    }

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    if (scrollToBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Update unread count if popup is closed
    if (!chatPopupOpen && !isOwnMessage) {
        unreadCount++;
        updateChatBadge();
    }
}

function updateChatBadge() {
    const chatBadge = document.getElementById('chatBadge');
    
    if (chatBadge) {
        if (unreadCount > 0) {
            chatBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            chatBadge.style.display = 'flex';
        } else {
            chatBadge.style.display = 'none';
        }
    }
}

function showTypingIndicator(username) {
    // Could show a typing indicator in the chat
    console.log(`${username} is typing...`);
    
    // Optional: Show in chat area
    const chatMessages = document.getElementById('battleChatMessages');
    if (chatMessages) {
        // Remove existing typing indicator
        const existing = chatMessages.querySelector('.typing-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = 'chat-message typing-indicator';
        indicator.innerHTML = `<div class="typing-text">${escapeHtml(username)} đang nhập...</div>`;
        chatMessages.appendChild(indicator);

        // Remove after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }
}

function sendTypingIndicator() {
    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    if (socket && roomId) {
        socket.emit('player_typing', {
            roomId: roomId
        });
    }
}

// Legacy support functions
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput?.value?.trim();

    if (!message) return;

    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    if (!socket || !roomId) {
        showNotification('Chưa kết nối đến phòng', 'error');
        return;
    }

    socket.emit('chat_message', {
        roomId: roomId,
        message: message,
        timestamp: Date.now()
    });

    chatInput.value = '';
}

function addChatMessage(data) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const currentUserId = getCurrentUserId();
    const isOwnMessage = data.userId === currentUserId;
    messageDiv.classList.add(isOwnMessage ? 'own' : 'other');

    const time = new Date(data.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        ${!isOwnMessage ? `<div class="username">${escapeHtml(data.username)}</div>` : ''}
        <div class="text">${escapeHtml(data.message)}</div>
        <div class="time">${time}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper functions
function getCurrentRoomId() {
    // First try actual roomId from server (for chat/webrtc to work properly)
    if (window.actualRoomId) {
        return window.actualRoomId;
    }
    // Fallback to BattleshipState
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getRoomCode) {
        return BattleshipState.getRoomCode();
    }
    // Fallback to global
    if (typeof currentRoomId !== 'undefined') {
        return currentRoomId;
    }
    return null;
}

function getCurrentUserId() {
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getUserId) {
        return BattleshipState.getUserId();
    }
    return localStorage.getItem('userId');
}

function getCurrentUsername() {
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getUsername) {
        return BattleshipState.getUsername();
    }
    return localStorage.getItem('username') || localStorage.getItem('guestDisplayName') || 'Player';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type) {
    if (typeof SocketShared !== 'undefined' && SocketShared.showNotification) {
        SocketShared.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

