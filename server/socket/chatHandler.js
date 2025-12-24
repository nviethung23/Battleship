const { sanitizeChatMessage, sanitizeString } = require('../middleware/validation');
const ChatMessage = require('../models/ChatMessage');

class ChatHandler {
    constructor(io, gameHandler = null) {
        this.io = io;
        this.gameHandler = gameHandler; // Reference to get actual roomId
    }
    
    // Set game handler reference (called after both are created)
    setGameHandler(gameHandler) {
        this.gameHandler = gameHandler;
    }
    
    // Get actual roomId from room code
    getActualRoomId(roomIdOrCode) {
        if (!this.gameHandler || !roomIdOrCode) return roomIdOrCode;
        
        // Try to find actual roomId using gameHandler's helper
        const result = this.gameHandler.findRoomByCodeOrId(roomIdOrCode);
        if (result) {
            return result.roomId;
        }
        return roomIdOrCode;
    }

    // Send chat message and save to database
    async sendMessage(socket, data) {
        const { roomId, userId, username, message, timestamp, isGuest, gameId } = data;
        
        // Convert room code to actual roomId
        const actualRoomId = this.getActualRoomId(roomId);

        console.log('[ChatHandler] 📨 sendMessage called:', { 
            roomId, 
            actualRoomId,
            userId, 
            message: message?.substring(0, 50) 
        });

        if (!message || message.trim() === '') {
            return socket.emit('error', { message: 'Message cannot be empty' });
        }

        // Sanitize message to prevent XSS
        const sanitizedMessage = sanitizeChatMessage(message);
        const sanitizedUsername = sanitizeString(username);

        if (sanitizedMessage.length === 0) {
            return socket.emit('error', { message: 'Invalid message' });
        }

        const messageData = {
            userId,
            username: sanitizedUsername,
            message: sanitizedMessage,
            timestamp: timestamp || Date.now(),
            isGuest: isGuest || false
        };

        try {
            // Save to database (use original roomId for DB consistency)
            const chatMessage = new ChatMessage({
                roomId: actualRoomId, // Use actual roomId for DB
                gameId: gameId || null,
                userId,
                username: sanitizedUsername,
                isGuest: isGuest || false,
                message: sanitizedMessage,
                messageType: 'text',
                timestamp: messageData.timestamp
            });

            await chatMessage.save();
            console.log('[ChatHandler] Message saved to DB:', chatMessage._id);

            // Add message ID to response
            messageData.messageId = chatMessage._id;

        } catch (error) {
            console.error('[ChatHandler] Error saving message:', error);
            // Still broadcast even if save fails
        }

        // Broadcast to actual room (socket room uses actualRoomId)
        console.log('[ChatHandler] 📢 Broadcasting to room:', actualRoomId);
        this.io.to(actualRoomId).emit('chat_message', messageData);
    }

    // Load chat history for a room
    async getChatHistory(socket, data) {
        const { roomId, limit = 50, before } = data;

        try {
            let query = { roomId };
            
            // If 'before' timestamp is provided, get messages before that time
            if (before) {
                query.timestamp = { $lt: new Date(before) };
            }

            const messages = await ChatMessage.find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();

            // Reverse to get chronological order
            const chatHistory = messages.reverse().map(msg => ({
                messageId: msg._id,
                userId: msg.userId,
                username: msg.username,
                message: msg.message,
                messageType: msg.messageType,
                timestamp: msg.timestamp,
                isGuest: msg.isGuest
            }));

            socket.emit('chat_history', {
                roomId,
                messages: chatHistory,
                hasMore: messages.length === limit
            });

            console.log(`[ChatHandler] Sent ${chatHistory.length} messages history for room ${roomId}`);

        } catch (error) {
            console.error('[ChatHandler] Error loading chat history:', error);
            socket.emit('chat_history', {
                roomId,
                messages: [],
                error: 'Failed to load chat history'
            });
        }
    }

    // Send system message (e.g., player joined, game started)
    async sendSystemMessage(roomId, message, gameId = null) {
        const messageData = {
            userId: 'system',
            username: 'System',
            message: message,
            messageType: 'system',
            timestamp: Date.now(),
            isGuest: false
        };

        try {
            // Save to database
            const chatMessage = new ChatMessage({
                roomId,
                gameId,
                userId: 'system',
                username: 'System',
                isGuest: false,
                message: message,
                messageType: 'system',
                timestamp: messageData.timestamp
            });

            await chatMessage.save();
            messageData.messageId = chatMessage._id;

        } catch (error) {
            console.error('[ChatHandler] Error saving system message:', error);
        }

        // Broadcast to room
        this.io.to(roomId).emit('chat_message', messageData);
    }

    // Player typing indicator
    playerTyping(socket, data) {
        const { roomId, username } = data;
        socket.to(roomId).emit('player_typing', { username });
    }

    // Delete old messages for a room (cleanup)
    async clearRoomMessages(roomId) {
        try {
            const result = await ChatMessage.deleteMany({ roomId });
            console.log(`[ChatHandler] Cleared ${result.deletedCount} messages for room ${roomId}`);
        } catch (error) {
            console.error('[ChatHandler] Error clearing room messages:', error);
        }
    }
}

module.exports = ChatHandler;

