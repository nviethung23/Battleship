const { getRedisClient, isRedisReady } = require('../config/redis');

/**
 * Redis-based Socket State Manager
 * Manages socket lifecycle, prevents race conditions, and handles reconnections
 */
class SocketStateManager {
    constructor() {
        // Fallback to in-memory if Redis not available
        this.memoryStore = {
            sessions: new Map(), // userId -> session data
            sockets: new Map()    // socketId -> userId
        };
    }

    /**
     * Register a new socket connection
     * CRITICAL: This is called on EVERY socket connect/reconnect
     * Sets user:{userId}:connected = true and clears disconnect state
     * 
     * @param {string} userId 
     * @param {string} socketId 
     * @param {string} roomId - Optional room ID
     * @returns {Promise<boolean>} true if registered, false if duplicate
     */
    async registerSocket(userId, socketId, roomId = null) {
        const timestamp = Date.now();
        const sessionData = {
            socketId,
            roomId,
            timestamp,
            status: roomId ? 'in_room' : 'connected'
        };

        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                
                // CRITICAL: Mark user as connected (overwrites any previous socketId)
                await redis.set(`user:${userId}:socket`, socketId);
                await redis.set(`user:${userId}:connected`, 'true');
                
                // CRITICAL: Clear disconnect timestamp (user has reconnected)
                await redis.del(`user:${userId}:disconnectAt`);
                
                // ✅ NEW: Store reconnect timestamp for rapid reconnect detection
                await redis.set(`user:${userId}:lastReconnectAt`, timestamp.toString());
                await redis.expire(`user:${userId}:lastReconnectAt`, 60); // 1 min TTL
                
                // Store session data with 5 minute TTL
                await redis.setEx(
                    `session:${userId}`, 
                    300, // 5 minutes
                    JSON.stringify(sessionData)
                );
                
                // Store reverse mapping
                await redis.setEx(
                    `socket:${socketId}`,
                    300,
                    userId
                );
                
                console.log(`[SocketState] Registered socket ${socketId} for user ${userId} (connected=true, disconnectAt=deleted)`);
                return true;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
                // Fall through to memory store
            }
        }

        // Fallback to memory
        this.memoryStore.sessions.set(userId, sessionData);
        this.memoryStore.sockets.set(socketId, userId);
        return true;
    }

    /**
     * Get current session for a user
     * @param {string} userId 
     * @returns {Promise<Object|null>}
     */
    async getSession(userId) {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                const data = await redis.get(`session:${userId}`);
                return data ? JSON.parse(data) : null;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }

        return this.memoryStore.sessions.get(userId) || null;
    }

    /**
     * Get userId for a socket
     * @param {string} socketId 
     * @returns {Promise<string|null>}
     */
    async getUserIdBySocket(socketId) {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                return await redis.get(`socket:${socketId}`);
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }

        return this.memoryStore.sockets.get(socketId) || null;
    }

    /**
     * Check if a socket is the current active socket for a user
     * @param {string} userId 
     * @param {string} socketId 
     * @returns {Promise<Object>} { isCurrent, hasNewSocket, newSocketId }
     */
    async checkSocketStatus(userId, socketId) {
        const session = await this.getSession(userId);
        
        if (!session) {
            return { 
                isCurrent: false, 
                hasNewSocket: false, 
                newSocketId: null 
            };
        }

        const isCurrent = session.socketId === socketId;
        const hasNewSocket = !isCurrent && session.socketId !== socketId;

        return {
            isCurrent,
            hasNewSocket,
            newSocketId: hasNewSocket ? session.socketId : null,
            session
        };
    }

    /**
     * Update room status for a user
     * @param {string} userId 
     * @param {string} roomId 
     * @param {string} status - 'waiting', 'character_selection', 'preparing', 'deploying', 'playing'
     */
    async updateRoomStatus(userId, roomId, status) {
        const session = await this.getSession(userId);
        if (!session) return;

        session.roomId = roomId;
        session.status = status;
        session.timestamp = Date.now();

        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                await redis.setEx(
                    `session:${userId}`,
                    300,
                    JSON.stringify(session)
                );
                console.log(`[SocketState] Updated ${userId} to ${status} in room ${roomId}`);
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        } else {
            this.memoryStore.sessions.set(userId, session);
        }
    }

    /**
     * Mark socket as disconnected and start grace period
     * Uses Redis keys as single source of truth:
     * - user:{userId}:socket -> current socketId
     * - user:{userId}:connected -> boolean
     * - user:{userId}:disconnectAt -> timestamp
     * 
     * @param {string} userId 
     * @param {string} socketId 
     * @param {number} gracePeriodMs - Grace period in milliseconds
     * @returns {Promise<boolean>} true if grace period started, false if user already reconnected
     */
    async markDisconnected(userId, socketId, gracePeriodMs = 10000) {
        const status = await this.checkSocketStatus(userId, socketId);
        
        // If user already has a new socket, don't start grace period
        if (status.hasNewSocket) {
            console.log(`[SocketState] User ${userId} already reconnected with socket ${status.newSocketId}`);
            return false;
        }

        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                
                // ✅ CRITICAL FIX: Only mark disconnected if socketId matches Redis socketId
                const currentSocketId = await redis.get(`user:${userId}:socket`);
                
                if (currentSocketId && currentSocketId !== socketId) {
                    console.log(`[SocketState] ⚠️ Disconnect ignored for ${userId} - socketId mismatch (current: ${currentSocketId}, disconnecting: ${socketId})`);
                    return false;
                }
                
                console.log(`[SocketState] ✅ SocketId matches (first check), proceeding...`);
                
                // 🔥 CRITICAL: Double-check socketId RIGHT BEFORE writing (prevent TOCTOU race)
                // Race window: New socket might register BETWEEN check and write
                const finalSocketId = await redis.get(`user:${userId}:socket`);
                
                if (finalSocketId && finalSocketId !== socketId) {
                    console.log(`[SocketState] ⚠️ RACE DETECTED! SocketId changed during disconnect (was: ${currentSocketId}, now: ${finalSocketId}) - ABORT`);
                    return false;
                }
                
                console.log(`[SocketState] ✅ SocketId still matches (double-check passed), marking ${userId} as disconnected`);
                
                // CRITICAL: Use dedicated Redis keys for disconnect state
                await redis.set(`user:${userId}:connected`, 'false');
                await redis.set(`user:${userId}:disconnectAt`, Date.now().toString());
                await redis.expire(`user:${userId}:disconnectAt`, Math.ceil(gracePeriodMs / 1000) + 10);
                
                // Also update session for backward compatibility
                const session = await this.getSession(userId);
                if (session) {
                    session.disconnected = true;
                    session.disconnectTime = Date.now();
                    session.gracePeriodMs = gracePeriodMs;
                    
                    const ttl = Math.ceil(gracePeriodMs / 1000) + 10;
                    await redis.setEx(
                        `session:${userId}`,
                        ttl,
                        JSON.stringify(session)
                    );
                }
                
                console.log(`[SocketState] Marked ${userId} as disconnected, grace period ${gracePeriodMs}ms`);
                return true;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }
        
        // Fallback to memory
        const session = await this.getSession(userId);
        if (!session) return false;
        
        session.disconnected = true;
        session.disconnectTime = Date.now();
        session.gracePeriodMs = gracePeriodMs;
        this.memoryStore.sessions.set(userId, session);
        return true;
    }

    /**
     * Check if socket disconnect should be ignored (rapid reconnection)
     * @param {string} userId 
     * @param {string} socketId 
     * @returns {Promise<boolean>} true if should ignore disconnect
     */
    async shouldIgnoreDisconnect(userId, socketId) {
        const status = await this.checkSocketStatus(userId, socketId);
        
        // Ignore if user already has a different active socket
        if (status.hasNewSocket) {
            const timeDiff = Date.now() - status.session.timestamp;
            // If new socket was created within 2 seconds, this is a rapid reconnection
            if (timeDiff < 2000) {
                console.log(`[SocketState] Ignoring disconnect for ${userId}, reconnected ${timeDiff}ms ago`);
                return true;
            }
        }

        return false;
    }

    /**
     * Clear socket session on final cleanup
     * @param {string} userId 
     * @param {string} socketId 
     */
    async clearSession(userId, socketId) {
        // Only clear if this is the current socket
        const status = await this.checkSocketStatus(userId, socketId);
        if (!status.isCurrent) {
            console.log(`[SocketState] Not clearing session for ${userId}, socket ${socketId} is not current`);
            return;
        }

        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                await redis.del(`session:${userId}`);
                await redis.del(`socket:${socketId}`);
                // CRITICAL: Also clear disconnect state
                await redis.del(`user:${userId}:connected`);
                await redis.del(`user:${userId}:disconnectAt`);
                console.log(`[SocketState] Cleared session for ${userId}`);
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        } else {
            this.memoryStore.sessions.delete(userId);
            this.memoryStore.sockets.delete(socketId);
        }
    }

    /**
     * CRITICAL: Check if user is still disconnected (Redis single source of truth)
     * This is the ONLY method that should decide if grace period expired.
     * 
     * @param {string} userId 
     * @param {number} gracePeriodMs - Grace period in milliseconds
     * @returns {Promise<Object>} { isStillDisconnected, hasReconnected, gracePeriodExpired }
     */
    async checkGracePeriodStatus(userId, gracePeriodMs) {
        if (!isRedisReady()) {
            console.warn('[GracePeriod] Redis not ready, cannot check grace period');
            return {
                isStillDisconnected: false,
                hasReconnected: true,
                gracePeriodExpired: false
            };
        }

        try {
            const redis = getRedisClient();
            
            // ✅ CRITICAL: Check connection status FIRST (highest priority)
            const connected = await redis.get(`user:${userId}:connected`);
            
            console.log(`[GracePeriod] Redis check for ${userId}:`, {
                connected,
                timestamp: Date.now()
            });
            
            if (connected === 'true') {
                console.log(`[GracePeriod] ✅ User ${userId} is CONNECTED (reconnected)`);
                return {
                    isStillDisconnected: false,
                    hasReconnected: true,
                    gracePeriodExpired: false
                };
            }
            
            // Check disconnect timestamp
            const disconnectAtStr = await redis.get(`user:${userId}:disconnectAt`);
            
            if (!disconnectAtStr) {
                // No disconnect record = user reconnected and cleaned up
                console.log(`[GracePeriod] ✅ No disconnectAt record for ${userId} (reconnected)`);
                return {
                    isStillDisconnected: false,
                    hasReconnected: true,
                    gracePeriodExpired: false
                };
            }
            
            // Calculate elapsed time
            const disconnectAt = parseInt(disconnectAtStr, 10);
            const elapsed = Date.now() - disconnectAt;
            const expired = elapsed >= gracePeriodMs;
            
            console.log(`[GracePeriod] User ${userId} still disconnected:`, {
                disconnectAt,
                elapsed,
                gracePeriodMs,
                expired
            });
            
            return {
                isStillDisconnected: true,
                hasReconnected: false,
                gracePeriodExpired: expired
            };
            
        } catch (err) {
            console.error('[GracePeriod] Redis error:', err.message);
            // On error, assume user reconnected (safe default)
            return {
                isStillDisconnected: false,
                hasReconnected: true,
                gracePeriodExpired: false
            };
        }
    }
    
    /**
     * CRITICAL: Mark user as reconnected (clears disconnect state)
     * Call this when user successfully reconnects
     * 
     * @param {string} userId 
     * @param {string} socketId 
     */
    async markReconnected(userId, socketId) {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                
                // Set connected state
                await redis.set(`user:${userId}:connected`, 'true');
                // Delete disconnect timestamp
                await redis.del(`user:${userId}:disconnectAt`);
                
                console.log(`[SocketState] User ${userId} marked as reconnected with socket ${socketId}`);
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }
        
        // Also update memory store
        const session = this.memoryStore.sessions.get(userId);
        if (session) {
            session.disconnected = false;
            delete session.disconnectTime;
        }
    }

    /**
     * Get all active sessions (for debugging)
     */
    async getAllSessions() {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                const keys = await redis.keys('session:*');
                const sessions = {};
                for (const key of keys) {
                    const userId = key.replace('session:', '');
                    const data = await redis.get(key);
                    sessions[userId] = JSON.parse(data);
                }
                return sessions;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }

        return Object.fromEntries(this.memoryStore.sessions);
    }

    /**
     * Get Redis client instance for direct Redis access
     * ⚠️ Use with caution - prefer using socketStateManager methods
     * @returns {Object|null} Redis client or null if not configured
     */
    getRedisClient() {
        return getRedisClient();
    }

    /**
     * Mark user as intentionally leaving (clicked "Leave Room" button)
     * This prevents disconnect grace period from triggering
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async setIntentionalLeave(userId) {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                // Set flag with 30 second TTL (enough time for disconnect event to fire)
                await redis.setEx(`user:${userId}:intentionalLeave`, 30, 'true');
                console.log(`[SocketState] Marked ${userId} as intentional leave`);
                return true;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }
        
        // Fallback to memory
        this.memoryStore.sessions.set(`${userId}:intentionalLeave`, { timestamp: Date.now() });
        return true;
    }

    /**
     * Check if user is intentionally leaving
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async isIntentionalLeave(userId) {
        if (isRedisReady()) {
            try {
                const redis = getRedisClient();
                const flag = await redis.get(`user:${userId}:intentionalLeave`);
                if (flag === 'true') {
                    // Clear flag after checking
                    await redis.del(`user:${userId}:intentionalLeave`);
                    console.log(`[SocketState] Found and cleared intentional leave flag for ${userId}`);
                    return true;
                }
                return false;
            } catch (err) {
                console.error('[SocketState] Redis error:', err.message);
            }
        }
        
        // Fallback to memory
        const flag = this.memoryStore.sessions.get(`${userId}:intentionalLeave`);
        if (flag) {
            this.memoryStore.sessions.delete(`${userId}:intentionalLeave`);
            return true;
        }
        return false;
    }
}

module.exports = new SocketStateManager();
