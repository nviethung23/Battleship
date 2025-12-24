/**
 * Shared Socket.IO Logic for Battleship Game
 * Used by hub.js and lobby.js to avoid duplication
 */

let sharedSocket = null;

const SocketShared = {
    // Initialize socket connection
    init(onConnected) {
        const token = BattleshipState.getToken();
        const userId = BattleshipState.getUserId();
        const username = BattleshipState.getUsername();

        console.log('[SocketShared] Initializing socket...');
        console.log('[SocketShared] Token:', token ? 'exists' : 'missing');
        console.log('[SocketShared] UserId:', userId);
        console.log('[SocketShared] Username:', username);

        if (!token || !userId || !username) {
            console.error('[SocketShared] Missing credentials, redirecting to login');
            window.location.href = '/';
            return null;
        }

        // Connect to server
        sharedSocket = io({
            auth: { token }
        });

        // Connection events
        sharedSocket.on('connect', () => {
            console.log('✅ [SocketShared] Connected. Socket ID:', sharedSocket.id);
        });

        sharedSocket.on('connected', (data) => {
            console.log('[SocketShared] Authenticated:', data);
            if (onConnected) {
                onConnected(data);
            }
        });

        sharedSocket.on('disconnect', () => {
            console.log('[SocketShared] Disconnected from server');
            this.showNotification('Mất kết nối với server', 'error');
        });

        sharedSocket.on('error', (data) => {
            console.error('[SocketShared] Socket error:', data);
            this.showNotification(data.message || 'Có lỗi xảy ra', 'error');
        });

        return sharedSocket;
    },

    // Get socket instance
    getSocket() {
        return sharedSocket;
    },

    // Emit event
    emit(event, data) {
        if (sharedSocket) {
            sharedSocket.emit(event, data);
        } else {
            console.error('[SocketShared] Socket not initialized');
        }
    },

    // Listen to event
    on(event, handler) {
        if (sharedSocket) {
            sharedSocket.on(event, handler);
        } else {
            console.error('[SocketShared] Socket not initialized');
        }
    },

    // Remove event listener
    off(event, handler) {
        if (sharedSocket) {
            if (handler) {
                sharedSocket.off(event, handler);
            } else {
                sharedSocket.off(event);
            }
        }
    },

    // Disconnect socket
    disconnect() {
        if (sharedSocket) {
            sharedSocket.disconnect();
            sharedSocket = null;
        }
    },

    // Show notification helper
    showNotification(message, type = 'info') {
        console.log(`[Notification ${type}]`, message);
        
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
            font-family: 'Be Vietnam Pro', sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
};

// Add animation styles
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
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
}

console.log('[SocketShared] Module loaded');
