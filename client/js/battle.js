// battle.js - Battle screen logic (integrated into game.html)
// Called by game.js when game starts

console.log('[Battle] battle.js loaded');

// ========== INITIALIZATION ==========
// Export initBattle function to be called by game.js
window.initBattle = function(gameData) {
    console.log('[Battle] 🎮 initBattle() called with data:', gameData);
    
    // Get character info from localStorage
    const myCharData = JSON.parse(localStorage.getItem('myCharacterData') || '{}');
    const oppCharData = JSON.parse(localStorage.getItem('opponentCharacterData') || '{}');
    const myShipsData = JSON.parse(sessionStorage.getItem('myShipsPlacement') || 'null');
    
    console.log('[Battle] My character:', myCharData);
    console.log('[Battle] Opponent character:', oppCharData);
    console.log('[Battle] My ships placement:', myShipsData);
    
    // Render UI
    renderBattleUI(myCharData, oppCharData, gameData);
    
    // Setup socket handlers for battle events
    setupBattleSocketHandlers();
    
    // Initialize timer (will be synced with server)
    console.log('[Battle] ✅ Battle initialized');
};

function renderBattleUI(myChar, oppChar, gameData) {
    console.log('[Battle] 🎨 Rendering battle UI...');
    
    // Update player names in header
    const player1Name = document.getElementById('battlePlayer1');
    const player2Name = document.getElementById('battlePlayer2');
    
    if (player1Name && myChar.name) player1Name.textContent = myChar.name;
    if (player2Name && oppChar.name) player2Name.textContent = oppChar.name;
    
    // Update board titles
    const leftTitle = document.getElementById('battleLeftTitle');
    const rightTitle = document.getElementById('battleRightTitle');
    
    if (leftTitle) leftTitle.textContent = 'YOUR FLEET';
    if (rightTitle) rightTitle.textContent = 'ATTACK!';
    
    // Render boards
    renderMyMiniBoard();
    renderOpponentBoard();
    
    // Setup chat
    setupBattleChat();
    
    console.log('[Battle] ✅ UI rendered');
}

function renderMyMiniBoard() {
    console.log('[Battle] 🎨 Rendering my mini board...');
    const el = document.getElementById('battleMyBoard');
    if (!el) {
        console.error('[Battle] ❌ battleMyBoard element not found!');
        return;
    }
    
    el.innerHTML = '';
    
    // Get ships placement from sessionStorage
    const myShipsData = JSON.parse(sessionStorage.getItem('myShipsPlacement') || 'null');
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Check if this cell has a ship
            if (myShipsData && Array.isArray(myShipsData)) {
                const hasShip = myShipsData.some(ship => 
                    ship.positions && ship.positions.some(pos => 
                        pos.row === r && pos.col === c
                    )
                );
                if (hasShip) {
                    cell.classList.add('ship-cell');
                }
            }
            
            el.appendChild(cell);
        }
    }
    console.log('[Battle] ✅ Mini board rendered');
}

function renderOpponentBoard() {
    console.log('[Battle] 🎨 Rendering opponent board...');
    const el = document.getElementById('battleEnemyBoard');
    if (!el) {
        console.error('[Battle] ❌ battleEnemyBoard element not found!');
        return;
    }
    
    el.innerHTML = '';
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell attack-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.addEventListener('click', () => handleAttack(r, c));
            
            el.appendChild(cell);
        }
    }
    console.log('[Battle] ✅ Opponent board rendered');
}

function handleAttack(row, col) {
    console.log(`[Battle] 🎯 Attack at (${row}, ${col})`);
    
    // Check if it's my turn
    if (!window.BattleshipState || !window.BattleshipState.isMyTurn) {
        console.warn('[Battle] ⚠️ Not your turn!');
        showNotification('Chưa đến lượt của bạn!', 'warning');
        return;
    }
    
    // Send attack via socket
    if (window.socket) {
        console.log('[Battle] 📡 Sending attack to server...');
        window.socket.emit('attack', { row, col });
    } else {
        console.error('[Battle] ❌ Socket not available!');
    }
}

function setupBattleSocketHandlers() {
    // NOTE: Socket handlers are registered in game.js to avoid duplicates
    // game.js will call window functions when events are received
    console.log('[Battle] 📡 Socket handlers managed by game.js');
}

// ========== BATTLE EVENT HANDLERS (called by game.js) ==========
window.handleBattleAttackResult = function(data) {
    console.log('[Battle] 💥 Attack result:', data);
    updateOpponentBoardCell(data.row, data.col, data.hit);
    if (data.hit) {
        showNotification('Trúng mục tiêu! 🎯', 'success');
    } else {
        showNotification('Trượt! 💦', 'info');
    }
};

window.handleBattleUnderAttack = function(data) {
    console.log('[Battle] 🎯 Under attack:', data);
    updateMyBoardCell(data.row, data.col, data.hit);
};

window.handleBattleTurnChanged = function(data) {
    console.log('[Battle] 🔄 Turn changed:', data);
    updateTurnNotification(data.isMyTurn);
};

function updateMyBoardCell(row, col, isHit) {
    const cell = document.querySelector(`#battleMyBoard .cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add(isHit ? 'hit' : 'miss');
    }
}

function updateOpponentBoardCell(row, col, isHit) {
    const cell = document.querySelector(`#battleEnemyBoard .cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add(isHit ? 'hit' : 'miss');
        cell.style.pointerEvents = 'none';
    }
}

function updateTurnNotification(isMyTurn) {
    const transition = document.getElementById('turnTransitionBattle');
    const title = document.getElementById('transitionTitleBattle');
    
    if (transition && title) {
        title.textContent = isMyTurn ? 'YOUR TURN' : 'ENEMY TURN';
        transition.style.display = 'flex';
        
        setTimeout(() => {
            transition.style.display = 'none';
        }, 2000);
    }
    
    // Update global state for attack validation
    if (window.BattleshipState) {
        window.BattleshipState.isMyTurn = isMyTurn;
    }
}

window.handleBattleGameOver = function(data) {
    console.log('[Battle] 🏆 Game over:', data);
    const isWinner = data.winner === localStorage.getItem('userId');
    showNotification(isWinner ? '🎉 Chúc mừng! Bạn đã thắng!' : '😢 Bạn đã thua!', isWinner ? 'success' : 'error');
};

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
    } else if (window.SocketShared && window.SocketShared.showNotification) {
        window.SocketShared.showNotification(message, type);
    } else {
        console.log(`[Battle] ${type.toUpperCase()}: ${message}`);
    }
}

// ========== CHAT FUNCTIONS ==========
window.addBattleChatMessage = function(data) {
    console.log('[Battle] 💬 Adding chat message:', data);
    const messagesContainer = document.getElementById('battleChatMessages');
    if (!messagesContainer) {
        console.error('[Battle] ❌ battleChatMessages element not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const currentUserId = localStorage.getItem('userId');
    const isMyMessage = data.userId === currentUserId;
    
    messageDiv.style.cssText = `
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        ${isMyMessage ? 'margin-left: auto; background: #4a9eff; color: white; text-align: right;' : 'margin-right: auto; background: #2a2a3e; color: white;'}
    `;
    
    const username = isMyMessage ? 'Bạn' : data.username;
    messageDiv.innerHTML = `
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 2px;">${username}</div>
        <div style="font-size: 14px;">${data.message}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

window.showBattleTypingIndicator = function(username) {
    console.log('[Battle] ⌨️ Typing indicator:', username);
    const messagesContainer = document.getElementById('battleChatMessages');
    if (!messagesContainer) return;
    
    // Remove old typing indicator
    const oldIndicator = messagesContainer.querySelector('.typing-indicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    // Add new typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.style.cssText = 'font-size: 12px; color: #888; font-style: italic; margin: 8px 0;';
    typingDiv.textContent = `${username} đang nhập...`;
    messagesContainer.appendChild(typingDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (typingDiv.parentNode) {
            typingDiv.remove();
        }
    }, 3000);
};

// Setup chat input when battle screen loads
function setupBattleChat() {
    console.log('[Battle] 💬 Setting up chat...');
    
    const chatInput = document.getElementById('battleChatInput');
    const chatSend = document.getElementById('battleChatSend');
    
    if (!chatInput || !chatSend) {
        console.error('[Battle] ❌ Chat elements not found!');
        return;
    }
    
    // Send message on button click
    chatSend.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        console.log('[Battle] 📤 Sending chat message:', message);
        
        if (window.socket) {
            const roomCode = sessionStorage.getItem('bs_roomCode');
            window.socket.emit('chat_message', {
                roomId: roomCode,
                message: message,
                timestamp: Date.now()
            });
            chatInput.value = '';
        } else {
            console.error('[Battle] ❌ Socket not available!');
        }
    });
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            chatSend.click();
        }
    });
    
    // Send typing indicator
    let typingTimeout;
    chatInput.addEventListener('input', () => {
        if (window.socket) {
            const roomCode = sessionStorage.getItem('bs_roomCode');
            window.socket.emit('player_typing', { roomId: roomCode });
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                // Stop typing indicator after 3 seconds
            }, 3000);
        }
    });
    
    console.log('[Battle] ✅ Chat setup complete');
}

// ========== WEBRTC PLACEHOLDER FUNCTIONS ==========
// These will be called by game.js when WebRTC events are received
window.handleWebRTCOffer = function(data) {
    console.log('[Battle] 📞 WebRTC offer received - forwarding to webrtc.js');
    // webrtc.js should handle this
};

window.handleWebRTCAnswer = function(data) {
    console.log('[Battle] 📞 WebRTC answer received - forwarding to webrtc.js');
    // webrtc.js should handle this
};

window.handleWebRTCIceCandidate = function(data) {
    console.log('[Battle] 📞 ICE candidate received - forwarding to webrtc.js');
    // webrtc.js should handle this
};

window.handleCallRequest = function(data) {
    console.log('[Battle] 📞 Call request received');
    showNotification(`${data.from} đang gọi video...`, 'info');
    // Show call UI
};

window.handleCallAccepted = function(data) {
    console.log('[Battle] 📞 Call accepted');
    showNotification('Cuộc gọi được chấp nhận!', 'success');
};

window.handleCallRejected = function(data) {
    console.log('[Battle] 📞 Call rejected');
    showNotification('Cuộc gọi bị từ chối', 'warning');
};

window.handleCallEnded = function(data) {
    console.log('[Battle] 📞 Call ended');
    showNotification('Cuộc gọi đã kết thúc', 'info');
};
