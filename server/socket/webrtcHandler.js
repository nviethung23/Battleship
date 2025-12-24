const CallLog = require('../models/CallLog');

// Store active calls in memory for quick lookup
const activeCalls = new Map();

class WebRTCHandler {
    constructor(io, gameHandler = null) {
        this.io = io;
        this.gameHandler = gameHandler;
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

    // WebRTC signaling - forward offer
    sendOffer(socket, data) {
        const { roomId, offer } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        console.log('[WebRTC] Forwarding offer to room:', actualRoomId);
        socket.to(actualRoomId).emit('webrtc_offer', {
            offer,
            from: socket.id
        });
    }

    // WebRTC signaling - forward answer
    sendAnswer(socket, data) {
        const { roomId, answer } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        console.log('[WebRTC] Forwarding answer to room:', actualRoomId);
        socket.to(actualRoomId).emit('webrtc_answer', {
            answer,
            from: socket.id
        });
    }

    // WebRTC signaling - forward ICE candidate
    sendIceCandidate(socket, data) {
        const { roomId, candidate } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        socket.to(actualRoomId).emit('webrtc_ice_candidate', {
            candidate,
            from: socket.id
        });
    }

    // Call request - initiate a call
    async callRequest(socket, data) {
        const { roomId, username, userId, receiverId, receiverUsername, callType = 'video' } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        
        console.log('[WebRTC] Call request from', username, 'to room:', actualRoomId);
        
        try {
            // Create call log in database
            const callLog = new CallLog({
                roomId: actualRoomId,
                callerId: userId || socket.userId,
                callerUsername: username,
                receiverId: receiverId || 'unknown',
                receiverUsername: receiverUsername || 'Opponent',
                callType,
                status: 'initiated',
                startedAt: new Date()
            });

            await callLog.save();
            console.log('[WebRTC] Call initiated:', callLog._id);

            // Store in active calls
            activeCalls.set(actualRoomId, {
                callId: callLog._id,
                callerId: userId || socket.userId,
                callerSocketId: socket.id,
                startedAt: Date.now()
            });

            // Notify other player
            socket.to(actualRoomId).emit('call_request', {
                callId: callLog._id,
                from: username,
                fromUserId: userId || socket.userId,
                fromSocketId: socket.id,
                callType
            });

        } catch (error) {
            console.error('[WebRTC] Error creating call:', error);
            socket.to(actualRoomId).emit('call_request', {
                from: username,
                fromSocketId: socket.id,
                callType
            });
        }
    }

    // Call accepted
    async callAccepted(socket, data) {
        const { roomId, callId } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        
        console.log('[WebRTC] Call accepted, notifying room:', actualRoomId);
        
        try {
            // Update call log
            if (callId) {
                await CallLog.findByIdAndUpdate(callId, {
                    status: 'accepted',
                    answeredAt: new Date()
                });
                console.log('[WebRTC] Call accepted in DB:', callId);
            }

            // Update active call
            const activeCall = activeCalls.get(actualRoomId);
            if (activeCall) {
                activeCall.answeredAt = Date.now();
            }

        } catch (error) {
            console.error('[WebRTC] Error updating call status:', error);
        }

        // CRITICAL: Emit to actual roomId so caller receives the event
        socket.to(actualRoomId).emit('call_accepted', {
            from: socket.id
        });
    }

    // Call rejected
    async callRejected(socket, data) {
        const { roomId, callId } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        
        console.log('[WebRTC] Call rejected, notifying room:', actualRoomId);
        
        try {
            // Update call log
            if (callId) {
                await CallLog.findByIdAndUpdate(callId, {
                    status: 'rejected',
                    endedAt: new Date()
                });
                console.log('[WebRTC] Call rejected:', callId);
            }

            // Remove from active calls
            activeCalls.delete(actualRoomId);

        } catch (error) {
            console.error('[WebRTC] Error updating call status:', error);
        }

        socket.to(actualRoomId).emit('call_rejected', {
            from: socket.id
        });
    }

    // End call
    async endCall(socket, data) {
        const { roomId, callId } = data;
        const actualRoomId = this.getActualRoomId(roomId);
        
        try {
            const activeCall = activeCalls.get(actualRoomId);
            let duration = 0;

            if (activeCall && activeCall.answeredAt) {
                duration = Math.floor((Date.now() - activeCall.answeredAt) / 1000);
            }

            // Update call log
            const updateCallId = callId || activeCall?.callId;
            if (updateCallId) {
                await CallLog.findByIdAndUpdate(updateCallId, {
                    status: 'ended',
                    endedAt: new Date(),
                    duration
                });
                console.log('[WebRTC] Call ended:', updateCallId, 'Duration:', duration, 'seconds');
            }

            // Remove from active calls
            activeCalls.delete(actualRoomId);

        } catch (error) {
            console.error('[WebRTC] Error ending call:', error);
        }

        socket.to(actualRoomId).emit('call_ended', {
            from: socket.id
        });
    }

    // Handle disconnect - mark call as ended if active
    async handleDisconnect(socket, roomId) {
        const activeCall = activeCalls.get(roomId);
        
        if (activeCall) {
            try {
                let duration = 0;
                if (activeCall.answeredAt) {
                    duration = Math.floor((Date.now() - activeCall.answeredAt) / 1000);
                }

                await CallLog.findByIdAndUpdate(activeCall.callId, {
                    status: 'ended',
                    endedAt: new Date(),
                    duration
                });

                activeCalls.delete(roomId);
                console.log('[WebRTC] Call ended due to disconnect:', activeCall.callId);

            } catch (error) {
                console.error('[WebRTC] Error handling disconnect:', error);
            }
        }
    }

    // Get call history for a room
    async getCallHistory(socket, data) {
        const { roomId, limit = 10 } = data;

        try {
            const calls = await CallLog.find({ roomId })
                .sort({ startedAt: -1 })
                .limit(limit)
                .lean();

            socket.emit('call_history', {
                roomId,
                calls: calls.map(call => ({
                    callId: call._id,
                    callerUsername: call.callerUsername,
                    receiverUsername: call.receiverUsername,
                    callType: call.callType,
                    status: call.status,
                    startedAt: call.startedAt,
                    duration: call.duration
                }))
            });

        } catch (error) {
            console.error('[WebRTC] Error getting call history:', error);
            socket.emit('call_history', { roomId, calls: [] });
        }
    }
}

module.exports = WebRTCHandler;

