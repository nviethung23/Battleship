const { GameLogic, SHIPS } = require('../utils/gameLogic');
const Database = require('../config/database');
const { saveGameState, loadGameStateByIdentifier, removeGameState } = require('../services/gameStateStore');
const socketStateManager = require('../utils/socketStateManager');

// Lưu trữ rooms và games đang chơi trong memory
const rooms = new Map();
const games = new Map();
const playerSockets = new Map(); // userId -> socketId (DEPRECATED - use socketStateManager)
const matchmakingQueue = []; // Queue for Quick Play: [{socketId, userId, username, isGuest, guestDisplayName, queuedAt}]

class GameHandler {
    constructor(io) {
        this.io = io;
    }

    // Generate 6-character room code (uppercase + digits)
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Check if code already exists
        for (const room of rooms.values()) {
            if (room.code === code) {
                return this.generateRoomCode(); // Recursive retry
            }
        }
        return code;
    }

    // Helper: Find room by code (6-char) OR by roomId (room_xxx)
    // Returns { room, roomId } or null
    findRoomByCodeOrId(identifier) {
        if (!identifier) return null;
        
        // First try direct lookup by roomId
        if (rooms.has(identifier)) {
            return { room: rooms.get(identifier), roomId: identifier };
        }
        
        // Then search by code
        for (const [rid, r] of rooms.entries()) {
            if (r.code === identifier) {
                return { room: r, roomId: rid };
            }
        }
        
        return null;
    }

    // Helper: Find game by code (6-char) OR by roomId (room_xxx)
    // Returns { game, roomId } or null
    findGameByCodeOrId(identifier) {
        if (!identifier) return null;
        
        // First try direct lookup by roomId in games
        if (games.has(identifier)) {
            return { game: games.get(identifier), roomId: identifier };
        }
        
        // Then find room by code to get actual roomId
        const roomResult = this.findRoomByCodeOrId(identifier);
        if (roomResult && games.has(roomResult.roomId)) {
            return { game: games.get(roomResult.roomId), roomId: roomResult.roomId };
        }
        
        return null;
    }

    buildRoomFromGame(game) {
        if (!game || !game.player1 || !game.player2) {
            return null;
        }

        const roomCode = game.roomCode && game.roomCode !== game.roomId ? game.roomCode : null;
        const isPrivate = Boolean(roomCode);

        return {
            id: game.roomId,
            code: roomCode,
            isPrivate,
            status: 'playing',
            player1: {
                userId: game.player1.userId,
                username: game.player1.username,
                socketId: game.player1.socketId || null,
                ready: true,
                lobbyReady: true,
                characterId: game.player1.characterId,
                characterLocked: true,
                isGuest: game.player1.isGuest || false,
                guestDisplayName: game.player1.guestDisplayName || null
            },
            player2: {
                userId: game.player2.userId,
                username: game.player2.username,
                socketId: game.player2.socketId || null,
                ready: true,
                lobbyReady: true,
                characterId: game.player2.characterId,
                characterLocked: true,
                isGuest: game.player2.isGuest || false,
                guestDisplayName: game.player2.guestDisplayName || null
            },
            createdAt: game.startTime || Date.now()
        };
    }

    async getGameByIdentifier(identifier) {
        const cached = this.findGameByCodeOrId(identifier);
        if (cached) {
            return cached;
        }

        const restored = await loadGameStateByIdentifier(identifier);
        if (!restored) {
            return null;
        }

        const { game, roomId } = restored;

        if (!games.has(roomId)) {
            games.set(roomId, game);
        }

        if (!rooms.has(roomId)) {
            const room = this.buildRoomFromGame(game);
            if (room) {
                rooms.set(roomId, room);
            }
        }

        return { game, roomId };
    }

    persistGameState(game) {
        if (!game) return;
        saveGameState(game).catch((error) => {
            console.warn('[GameState] Persist failed:', error.message || error);
        });
    }

    clearGameState(roomId, roomCode) {
        removeGameState(roomId, roomCode).catch((error) => {
            console.warn('[GameState] Clear failed:', error.message || error);
        });
    }

    // Sanitize room object to prevent circular references
    sanitizeRoom(room) {
        if (!room) return null;
        
        return {
            id: room.id,
            code: room.code,
            isPrivate: room.isPrivate,
            status: room.status,
            player1: room.player1 ? {
                userId: room.player1.userId,
                username: room.player1.username,
                ready: room.player1.ready,
                lobbyReady: room.player1.lobbyReady,
                characterId: room.player1.characterId,
                characterLocked: room.player1.characterLocked,
                isGuest: room.player1.isGuest,
                guestDisplayName: room.player1.guestDisplayName
            } : null,
            player2: room.player2 ? {
                userId: room.player2.userId,
                username: room.player2.username,
                ready: room.player2.ready,
                lobbyReady: room.player2.lobbyReady,
                characterId: room.player2.characterId,
                characterLocked: room.player2.characterLocked,
                isGuest: room.player2.isGuest,
                guestDisplayName: room.player2.guestDisplayName
            } : null,
            characterSelectionStartTime: room.characterSelectionStartTime,
            lobbyDeadlineAt: room.lobbyDeadlineAt,
            createdAt: room.createdAt,
            gameId: room.gameId
        };
    }

    // ============ HELPER FUNCTIONS FOR LOBBY LIFECYCLE ============
    
    // Start 60s countdown timer for lobby
    startLobbyCountdown(roomId, room) {
        // Clear existing timer if any
        this.clearLobbyCountdown(room);
        
        const LOBBY_TIMEOUT = 60000; // 60 seconds
        room.lobbyDeadlineAt = Date.now() + LOBBY_TIMEOUT;
        
        room.lobbyTimer = setTimeout(() => {
            console.log(`[Lobby] 60s timeout expired for room ${room.code || roomId}`);
            this.disbandRoom(roomId, 'Ready timeout (60s expired)');
        }, LOBBY_TIMEOUT);
        
        console.log(`[Lobby] Started 60s countdown for room ${room.code || roomId}`);
    }
    
    // Clear lobby countdown timer
    clearLobbyCountdown(room) {
        if (room.lobbyTimer) {
            clearTimeout(room.lobbyTimer);
            room.lobbyTimer = null;
            room.lobbyDeadlineAt = null;
        }
    }
    
    // Disband room completely (for public rooms or host leaving private)
    disbandRoom(roomId, reason) {
        const room = rooms.get(roomId);
        if (!room) return;
        
        console.log(`[Room] Disbanding room ${room.code || roomId}: ${reason}`);
        
        // Clear timers
        this.clearLobbyCountdown(room);
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        
        // Emit to all players in room
        this.io.to(roomId).emit('room:disbanded', {
            reason,
            code: 'ROOM_DISBANDED',
            roomId
        });
        
        // Clean up mappings
        if (room.player1) {
            const p1Socket = this.io.sockets.sockets.get(room.player1.socketId);
            if (p1Socket) p1Socket.leave(roomId);
            playerSockets.delete(room.player1.userId);
        }
        if (room.player2) {
            const p2Socket = this.io.sockets.sockets.get(room.player2.socketId);
            if (p2Socket) p2Socket.leave(roomId);
            playerSockets.delete(room.player2.userId);
        }
        
        // Delete room and game
        rooms.delete(roomId);
        this.clearGameState(roomId, room.code || null);
        if (games.has(roomId)) {
            games.delete(roomId);
        }
        const gameId = room.gameId;
        if (gameId) {
            games.delete(gameId);
        }
        
        this.broadcastRoomList();
    }
    
    // Reset private room to waiting state (when player2 leaves)
    resetPrivateToWaiting(roomId, room, reason) {
        console.log(`[Room] Resetting private room ${room.code} to waiting: ${reason}`);
        
        // Clear timers
        this.clearLobbyCountdown(room);
        if (room.disconnectTimer) {
            clearTimeout(room.disconnectTimer);
            room.disconnectTimer = null;
        }
        
        const leftPlayer = room.player2;
        
        // Reset room state
        room.player2 = null;
        room.status = 'waiting';
        room.characterSelectionStartTime = null;
        if (room.player1) {
            room.player1.ready = false;
            room.player1.lobbyReady = false;
        }
        
        // Clean up player2 socket
        if (leftPlayer) {
            const p2Socket = this.io.sockets.sockets.get(leftPlayer.socketId);
            if (p2Socket) p2Socket.leave(roomId);
            playerSockets.delete(leftPlayer.userId);
        }
        
        // Notify host with sanitized room
        this.io.to(roomId).emit('room:playerLeft', {
            leftUserId: leftPlayer ? leftPlayer.userId : null,
            room: this.sanitizeRoom(room)
        });
        this.io.to(roomId).emit('room:updated', { 
            room: this.sanitizeRoom(room) 
        });
        
        this.broadcastRoomList();
    }
    
    // Emit room:updated event
    emitRoomUpdated(roomId) {
        const room = rooms.get(roomId);
        if (room) {
            this.io.to(roomId).emit('room:updated', { 
                room: this.sanitizeRoom(room) 
            });
        }
    }
    
    // Leave room handler
    async leaveRoom(socket, data) {
        const { userId } = data;
        console.log(`[LeaveRoom] 🚪 Received leave_room from socket ${socket.id}, userId: ${userId}`);
        
        // Find room user is in
        let targetRoomId = null;
        let targetRoom = null;
        for (const [rid, room] of rooms.entries()) {
            if ((room.player1 && room.player1.userId === userId) || 
                (room.player2 && room.player2.userId === userId)) {
                targetRoomId = rid;
                targetRoom = room;
                break;
            }
        }
        
        if (!targetRoom) {
            return socket.emit('room:error', { 
                message: 'Not in any room',
                code: 'NOT_IN_ROOM'
            });
        }
        
        const isHost = targetRoom.player1 && targetRoom.player1.userId === userId;
        const isPrivate = targetRoom.isPrivate || false;
        const game = games.get(targetRoomId);
        
        // ============ PLAYER LEAVING DURING BATTLE OR DEPLOYMENT - opponent wins immediately ============
        if ((game && targetRoom.status === 'playing') || targetRoom.status === 'deploying') {
            const leavingPlayer = targetRoom.player1?.userId === userId ? targetRoom.player1 : targetRoom.player2;
            const winner = targetRoom.player1?.userId === userId ? targetRoom.player2 : targetRoom.player1;
            
            console.log(`[LeaveRoom] Player ${leavingPlayer?.username} LEFT during ${targetRoom.status} - ${winner?.username} WINS IMMEDIATELY!`);
            
            // ✅ CRITICAL: Mark in Redis that this is intentional leave to skip disconnect grace period
            // When user clicks "Leave Room" button, they forfeit immediately - no reconnecting overlay
            await socketStateManager.setIntentionalLeave(userId);
            
            // Stop all timers
            if (targetRoom.deploymentTimerInterval) {
                clearInterval(targetRoom.deploymentTimerInterval);
                targetRoom.deploymentTimerInterval = null;
            }
            if (targetRoom.battleDisconnectTimer) {
                clearTimeout(targetRoom.battleDisconnectTimer);
                targetRoom.battleDisconnectTimer = null;
            }
            if (targetRoom.disconnectTimer) {
                clearTimeout(targetRoom.disconnectTimer);
                targetRoom.disconnectTimer = null;
            }
            
            // End game with winner - this will emit game_over event
            if (winner) {
                if (game) {
                    // Battle phase - use existing endGame
                    this.endGame(targetRoomId, winner.userId);
                } else {
                    // Deployment phase - create game record and emit game_over
                    console.log(`[LeaveRoom] Creating game record for deployment leave`);
                    const reasonMessage = targetRoom.status === 'deploying' 
                        ? 'left during deployment'
                        : 'left the game';
                    await this.createGameAndEndWithWinner(targetRoomId, targetRoom, winner.userId, reasonMessage);
                }
            }
            
            console.log(`[LeaveRoom] ✅ User ${userId} left room ${targetRoom.code || targetRoomId} during ${targetRoom.status} - Opponent wins`);
            
            // Clear socket session
            await socketStateManager.clearSession(userId, socket.id);
            
            return;
        }
        
        // Normal leave (not during battle/deployment)
        if (isHost) {
            // Host leaving
            if (!targetRoom.player2) {
                // Only host in room - just delete room silently
                console.log(`[Room] Host ${userId} left empty room ${targetRoom.code || targetRoomId}`);
                rooms.delete(targetRoomId);
                socket.leave(targetRoomId);
                this.broadcastRoomList();
            } else {
                // Host leaving with player2 present - disband normally
                console.log(`[Room] Host left during ${targetRoom.status} - disbanding`);
                this.disbandRoom(targetRoomId, 'Host left');
            }
        } else if (isPrivate) {
            // Player2 leaving private room -> reset to waiting
            this.resetPrivateToWaiting(targetRoomId, targetRoom, 'Player 2 left');
        } else {
            // Player2 leaving public room
            console.log(`[Room] Player2 left during ${targetRoom.status} - disbanding`);
            this.disbandRoom(targetRoomId, 'Player left');
        }
        
        console.log(`[Room] User ${userId} left room ${targetRoom.code || targetRoomId}`);
    }

    // Tạo room mới (giữ nguyên logic cũ cho tương thích)
    createRoom(socket, data) {
        const { userId, username } = data;

        // Kiểm tra xem user có đang trong phòng nào không
        let oldRoomId = null;
        for (const [rid, r] of rooms.entries()) {
            if ((r.player1 && r.player1.userId === userId) || (r.player2 && r.player2.userId === userId)) {
                oldRoomId = rid;
                break;
            }
        }

        // Nếu đang trong phòng cũ, rời phòng đó trước
        if (oldRoomId) {
            const oldRoom = rooms.get(oldRoomId);
            socket.leave(oldRoomId);
            
            // Remove player from old room
            if (oldRoom.player1 && oldRoom.player1.userId === userId) {
                rooms.delete(oldRoomId); // Nếu là player1 (host), xóa phòng
            } else if (oldRoom.player2 && oldRoom.player2.userId === userId) {
                oldRoom.player2 = null; // Nếu là player2, chỉ xóa player2
                oldRoom.status = 'waiting';
            }
            
            console.log(`User ${username} left old room ${oldRoomId} to create new room`);
        }

        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            player1: { 
                userId, 
                username, 
                socketId: socket.id, 
                ready: false,
                characterId: null,
                characterLocked: false,
                isGuest: socket.isGuest || false,
                guestDisplayName: socket.guestName || null
            },
            player2: null,
            status: 'waiting', // waiting, character_selection, preparing, playing, finished
            createdAt: Date.now(),
            deploymentTimer: null, // Will start when both players are in
            deploymentEndTime: null,
            deploymentTimerInterval: null
        };

        rooms.set(roomId, room);
        playerSockets.set(userId, socket.id);
        
        socket.join(roomId);
        socket.emit('room_created', { roomId, room: this.sanitizeRoom(room) });
        
        // Broadcast room list update
        this.broadcastRoomList();
        
        console.log(`Room ${roomId} created by ${username}`);
    }

    // Join room
    joinRoom(socket, data) {
        const { roomId, userId, username } = data;
        
        // Validate roomId format
        if (!roomId || typeof roomId !== 'string' || roomId.length > 50) {
            return socket.emit('error', { message: 'Invalid room ID' });
        }
        
        const room = rooms.get(roomId);

        if (!room) {
            return socket.emit('error', { message: 'Room not found' });
        }

        if (room.player2) {
            return socket.emit('error', { message: 'Room is full' });
        }

        if (room.player1.userId === userId) {
            return socket.emit('error', { message: 'You are already in this room' });
        }

        // Kiểm tra xem user có đang trong phòng khác không
        let oldRoomId = null;
        for (const [rid, r] of rooms.entries()) {
            if (rid !== roomId && ((r.player1 && r.player1.userId === userId) || (r.player2 && r.player2.userId === userId))) {
                oldRoomId = rid;
                break;
            }
        }

        // Nếu đang trong phòng cũ, rời phòng đó trước
        if (oldRoomId) {
            const oldRoom = rooms.get(oldRoomId);
            socket.leave(oldRoomId);
            
            // Remove player from old room
            if (oldRoom.player1 && oldRoom.player1.userId === userId) {
                rooms.delete(oldRoomId); // Nếu là player1 (host), xóa phòng
            } else if (oldRoom.player2 && oldRoom.player2.userId === userId) {
                oldRoom.player2 = null; // Nếu là player2, chỉ xóa player2
                oldRoom.status = 'waiting';
            }
            
            console.log(`User ${username} left old room ${oldRoomId} to join room ${roomId}`);
        }

        room.player2 = { 
            userId, 
            username, 
            socketId: socket.id, 
            ready: false,
            characterId: null,
            characterLocked: false,
            isGuest: socket.isGuest || false,
            guestDisplayName: socket.guestName || null
        };
        room.status = 'character_selection';
        room.characterSelectionStartTime = Date.now(); // Thêm thời gian bắt đầu để đồng bộ timer
        
        playerSockets.set(userId, socket.id);
        socket.join(roomId);

        // Notify both players - go to character selection
        console.log(`Emitting player_joined to room ${roomId}, players:`, room.player1.username, room.player2.username);
        this.io.to(roomId).emit('player_joined', { 
            room: this.sanitizeRoom(room),
            characterSelectionStartTime: room.characterSelectionStartTime
        });
        this.broadcastRoomList();

        console.log(`${username} joined room ${roomId}`);
    }

    // Get available rooms
    getRoomList(socket) {
        const availableRooms = Array.from(rooms.values())
            .filter(room => room.status === 'waiting')
            .map(room => ({
                id: room.id,
                player1: room.player1.username,
                createdAt: room.createdAt
            }));

        socket.emit('room_list', { rooms: availableRooms });
    }

    // Character selected
    characterSelected(socket, data) {
        const { roomId, userId, characterId } = data;
        
        // Use helper to find room by code or roomId
        const result = this.findRoomByCodeOrId(roomId);

        if (!result) {
            return socket.emit('error', { message: 'Room not found' });
        }

        const { room, roomId: actualRoomId } = result;

        // Update character selection
        if (room.player1.userId === userId) {
            room.player1.characterId = characterId;
        } else if (room.player2 && room.player2.userId === userId) {
            room.player2.characterId = characterId;
        }

        // Broadcast to room
        this.io.to(actualRoomId).emit('character_selected', {
            userId,
            characterId,
            room: this.sanitizeRoom(room)
        });
    }

    // Character locked
    characterLocked(socket, data) {
        const { roomId, userId, characterId } = data;
        
        // Use helper to find room by code or roomId
        const result = this.findRoomByCodeOrId(roomId);

        if (!result) {
            return socket.emit('error', { message: 'Room not found' });
        }

        const { room, roomId: actualRoomId } = result;

        // Lock character
        if (room.player1.userId === userId) {
            room.player1.characterId = characterId;
            room.player1.characterLocked = true;
        } else if (room.player2 && room.player2.userId === userId) {
            room.player2.characterId = characterId;
            room.player2.characterLocked = true;
        }

        // Broadcast to room
        this.io.to(actualRoomId).emit('character_locked', {
            userId,
            characterId,
            room
        });

        // Check if both locked -> go to placement
        if (room.player1.characterLocked && room.player2 && room.player2.characterLocked) {
            room.status = 'preparing';
            this.io.to(actualRoomId).emit('character_selection_complete', { room });
        }
    }

    // Player ready (đã đặt tàu xong)
    playerReady(socket, data) {
        const { roomId, userId, ships, board } = data;
        
        console.log('[GameHandler] 🎯 playerReady called');
        console.log('[GameHandler] roomId (from client):', roomId);
        console.log('[GameHandler] userId:', userId);
        console.log('[GameHandler] ships:', ships ? ships.length : 'none');
        
        // Use helper to find room by code or roomId
        const result = this.findRoomByCodeOrId(roomId);

        if (!result) {
            console.error('[GameHandler] ❌ Room not found:', roomId);
            return socket.emit('error', { message: 'Room not found' });
        }
        
        const { room, roomId: actualRoomId } = result;
        console.log('[GameHandler] ✅ Room found. Actual roomId:', actualRoomId);
        console.log('[GameHandler] Room status:', room.status);
        console.log('[GameHandler] Current ready status:', {
            player1Ready: room.player1?.ready,
            player2Ready: room.player2?.ready
        });

        // ✅ CRITICAL: Validate room is in deploying phase
        if (room.status !== 'deploying') {
            console.error('[GameHandler] ❌ Room not in deploying phase:', room.status);
            return socket.emit('error', { 
                message: `Cannot deploy ships - game is in ${room.status} phase`,
                currentPhase: room.status
            });
        }
        
        // ✅ CRITICAL: Check if user is actually in this room
        const isPlayer1 = room.player1 && room.player1.userId === userId;
        const isPlayer2 = room.player2 && room.player2.userId === userId;
        
        if (!isPlayer1 && !isPlayer2) {
            console.error('[GameHandler] ❌ User not in room:', userId);
            return socket.emit('error', { message: 'You are not in this room' });
        }

        // Validate ships
        if (!GameLogic.isValidBoard(ships)) {
            console.error('[GameHandler] ❌ Invalid ship placement');
            return socket.emit('error', { message: 'Invalid ship placement' });
        }

        // Set player ready
        if (isPlayer1) {
            room.player1.ready = true;
            room.player1.ships = ships;
            room.player1.board = board;
            console.log('[GameHandler] 🔵 Player 1 marked as ready');
        } else if (isPlayer2) {
            room.player2.ready = true;
            room.player2.ships = ships;
            room.player2.board = board;
            console.log('[GameHandler] 🔴 Player 2 marked as ready');
        }

        // Check if both ready -> start game
        console.log(`[GameHandler] Checking ready status - Player1: ${room.player1.ready}, Player2: ${room.player2 ? room.player2.ready : false}`);
        
        console.log('[GameHandler] Updated room status:', {
            player1Ready: room.player1?.ready,
            player2Ready: room.player2?.ready
        });
        
        if (room.player1.ready && room.player2 && room.player2.ready) {
            console.log(`[GameHandler] ✅ Both players ready! Stopping deployment timer and starting game in room ${actualRoomId}...`);
            
            // Stop deployment timer since both are ready
            this.stopDeploymentTimer(room);
            
            this.startGame(actualRoomId);
        } else {
            console.log(`[GameHandler] ⏳ Waiting for other player. Emitting player_ready_update...`);
            console.log('[GameHandler] 📢 Emitting to room:', actualRoomId);
            console.log('[GameHandler] Emit data:', {
                player1Ready: room.player1.ready,
                player2Ready: room.player2 ? room.player2.ready : false
            });
            this.io.to(actualRoomId).emit('player_ready_update', {
                player1Ready: room.player1.ready,
                player2Ready: room.player2 ? room.player2.ready : false
            });
        }
    }

    // Start game
    startGame(roomId) {
        console.log(`=== START GAME - Room ${roomId} ===`);
        const room = rooms.get(roomId);
        
        if (!room) {
            console.error(`❌ Room ${roomId} not found!`);
            return;
        }
        
        room.status = 'playing';
        console.log(`Room status set to: playing`);
        room.player1.disconnectCount = room.player1.disconnectCount || 0;
        room.player2.disconnectCount = room.player2.disconnectCount || 0;

        // ✅ CRITICAL: Validate both players have ships before starting
        if (!room.player1.ships || !Array.isArray(room.player1.ships) || room.player1.ships.length === 0) {
            console.error(`❌ Player 1 has no ships! Cannot start game.`);
            this.io.to(roomId).emit('game:error', { message: 'Player 1 không có ships!' });
            return;
        }
        
        if (!room.player2 || !room.player2.ships || !Array.isArray(room.player2.ships) || room.player2.ships.length === 0) {
            console.error(`❌ Player 2 has no ships! Cannot start game.`);
            this.io.to(roomId).emit('game:error', { message: 'Player 2 không có ships!' });
            return;
        }
        
        console.log(`✅ Both players have ships - starting game...`);

        // Initialize game state
        // Pick a random player to start
        const startingPlayerId = Math.random() < 0.5 ? room.player1.userId : room.player2.userId;
        const baseTurnLimit = 60000;

        const game = {
            roomId,
            roomCode: room.code || roomId,
            player1: {
                ...room.player1,
                characterId: room.player1.characterId || 'character1', // Lưu characterId
                attackedCells: [],
                ships: room.player1.ships.map(s => ({ ...s, hits: 0 })),
                disconnectCount: room.player1.disconnectCount || 0,
                timeoutCount: 0,
                turnTimeLimit: baseTurnLimit
            },
            player2: {
                ...room.player2,
                characterId: room.player2.characterId || 'character1', // Lưu characterId
                attackedCells: [],
                ships: room.player2.ships.map(s => ({ ...s, hits: 0 })),
                disconnectCount: room.player2.disconnectCount || 0,
                timeoutCount: 0,
                turnTimeLimit: baseTurnLimit
            },
            currentTurn: startingPlayerId,
            startTime: Date.now(),
            turnStartTime: Date.now(),
            turnTimeLimit: baseTurnLimit // default, overridden per player
        };

        games.set(roomId, game);

        // Start turn timer
        this.startTurnTimer(roomId);
        this.persistGameState(game);

        // Notify both players
        const gameStartData = {
            currentTurn: game.currentTurn,
            player1: { 
                username: game.player1.username, 
                userId: game.player1.userId,
                characterId: game.player1.characterId
            },
            player2: { 
                username: game.player2.username, 
                userId: game.player2.userId,
                characterId: game.player2.characterId
            }
        };
        
        console.log(`📢 Emitting game_started to room ${roomId}:`, gameStartData);
        
        // Emit to room
        this.io.to(roomId).emit('game_started', gameStartData);
        
        // Also emit directly to each socket to ensure delivery
        const player1Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.userId === game.player1.userId);
        const player2Socket = Array.from(this.io.sockets.sockets.values()).find(s => s.userId === game.player2.userId);
        
        if (player1Socket) {
            console.log(`📤 Direct emit game_started to player1 socket ${player1Socket.id}`);
            player1Socket.emit('game_started', gameStartData);
        } else {
            console.log(`❌ Player1 socket not found!`);
        }
        
        if (player2Socket) {
            console.log(`📤 Direct emit game_started to player2 socket ${player2Socket.id}`);
            player2Socket.emit('game_started', gameStartData);
        } else {
            console.log(`❌ Player2 socket not found!`);
        }

        console.log(`✅ Game started in room ${roomId}`);
    }

    // ============ REJOIN GAME AFTER REFRESH ============
    async rejoinGame(socket, data) {
        const { roomId, userId } = data;
        
        console.log(`[Rejoin] Player ${userId} attempting to rejoin room ${roomId}`);
        
        // Use helper to find game by code or roomId
        const gameResult = await this.getGameByIdentifier(roomId);
        
        if (!gameResult) {
            console.log(`[Rejoin] ❌ Game not found for room ${roomId}`);
            return socket.emit('rejoin_game_failed', { 
                message: 'Game không tồn tại hoặc đã kết thúc' 
            });
        }
        
        const { game, roomId: actualRoomId } = gameResult;
        const room = rooms.get(actualRoomId) || null;
        
        // Check if user is part of this game
        const isPlayer1 = game.player1.userId === userId;
        const isPlayer2 = game.player2.userId === userId;
        
        if (!isPlayer1 && !isPlayer2) {
            console.log(`[Rejoin] ❌ User ${userId} is not part of game ${actualRoomId}`);
            return socket.emit('rejoin_game_failed', { 
                message: 'Bạn không phải thành viên của game này' 
            });
        }
        
        // Get player data
        const myPlayer = isPlayer1 ? game.player1 : game.player2;
        const opponent = isPlayer1 ? game.player2 : game.player1;
        
        // *** CLEAR DISCONNECT STATE ***
        if (myPlayer) {
            myPlayer.disconnected = false;
            myPlayer.disconnectedAt = null;
            myPlayer.socketId = socket.id; // Update socket ID
        }
        
        // Also update socket ID in room object
        if (room) {
            if (isPlayer1 && room.player1) {
                room.player1.socketId = socket.id;
            } else if (room.player2) {
                room.player2.socketId = socket.id;
            }
        }
        
        // Clear battle disconnect timer if exists
        if (room && room.battleDisconnectTimer) {
            clearTimeout(room.battleDisconnectTimer);
            room.battleDisconnectTimer = null;
            console.log(`[Rejoin] Cleared battle disconnect timer for room ${actualRoomId}`);
        }
        
        // Update playerSockets mapping
        playerSockets.set(userId, socket.id);
        this.persistGameState(game);
        
        // Re-join socket room
        socket.join(actualRoomId);
        console.log(`[Rejoin] ✅ Socket ${socket.id} rejoined room ${actualRoomId}`);

        if (!game.turnTimer) {
            this.startTurnTimer(actualRoomId);
        }
        
        // Prepare rejoin data
        const rejoinData = {
            roomId: actualRoomId,
            currentTurn: game.currentTurn,
            myBoard: myPlayer.board,
            myShips: myPlayer.ships,
            myAttacks: opponent.attackedCells || [], // Attacks I made (on opponent)
            enemyAttacks: myPlayer.attackedCells || [], // Attacks made on me
            opponent: {
                username: opponent.username,
                characterId: opponent.characterId
            }
        };
        
        console.log(`[Rejoin] Sending rejoin data:`, {
            currentTurn: rejoinData.currentTurn,
            myAttacksCount: rejoinData.myAttacks.length,
            enemyAttacksCount: rejoinData.enemyAttacks.length
        });
        
        socket.emit('rejoin_game_success', rejoinData);
        
        // Notify opponent that player reconnected (clear reconnecting state)
        socket.to(actualRoomId).emit('player_reconnected', {
            username: myPlayer.username,
            userId: userId
        });
        
        console.log(`[Rejoin] ✅ Player ${userId} successfully rejoined game`);
    }

    // Process attack
    async attack(socket, data) {
        const { roomId, userId, row, col } = data;
        
        // Validate coordinates
        if (typeof row !== 'number' || typeof col !== 'number') {
            return socket.emit('error', { message: 'Invalid coordinates' });
        }
        
        if (row < 0 || row >= 10 || col < 0 || col >= 10) {
            return socket.emit('error', { message: 'Coordinates out of bounds' });
        }
        
        // Use helper to find game by code or roomId
        const gameResult = await this.getGameByIdentifier(roomId);

        if (!gameResult) {
            return socket.emit('error', { message: 'Game not found' });
        }

        const { game, roomId: actualRoomId } = gameResult;

        // Check if it's player's turn
        if (game.currentTurn !== userId) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        // Determine attacker and defender
        const isPlayer1 = game.player1.userId === userId;
        const attacker = isPlayer1 ? game.player1 : game.player2;
        const defender = isPlayer1 ? game.player2 : game.player1;

        // Process attack
        const result = GameLogic.processAttack(
            defender.board,
            defender.ships,
            row,
            col,
            defender.attackedCells
        );

        if (!result.valid) {
            return socket.emit('error', { message: result.error });
        }

        // Update attacked cells
        defender.attackedCells.push({ row, col, hit: result.hit, shipName: result.shipName });

        // Send result to both players
        this.io.to(actualRoomId).emit('attack_result', {
            attacker: attacker.username,
            attackerId: attacker.userId,
            defender: defender.username,
            defenderId: defender.userId,
            row,
            col,
            hit: result.hit,
            sunk: result.sunk,
            shipSunk: result.shipSunk,
            shipName: result.shipName,
            shipCells: result.shipCells
        });

        // Check game over
        if (GameLogic.isGameOver(defender.ships)) {
            this.endGame(actualRoomId, attacker.userId);
            return;
        }

        // *** LOGIC MỚI: Chỉ chuyển lượt khi bắn TRƯỢT ***
        // Nếu bắn TRÚNG → giữ nguyên lượt, người chơi được bắn tiếp
        // Nếu bắn TRƯỢT → chuyển lượt cho đối thủ
        if (!result.hit) {
            // Bắn trượt → chuyển lượt
            console.log(`🔄 MISS! Chuyển lượt từ ${attacker.username} sang ${defender.username}`);
            game.currentTurn = defender.userId;
            game.turnStartTime = Date.now();
            
            this.io.to(actualRoomId).emit('turn_changed', {
                currentTurn: game.currentTurn,
                currentPlayer: defender.username
            });

            // Restart turn timer
            this.startTurnTimer(actualRoomId);
        } else {
            // Bắn trúng → giữ nguyên lượt, chỉ reset timer
            console.log(`✅ HIT! Giữ nguyên lượt của ${attacker.username} (userId: ${attacker.userId})`);
            game.turnStartTime = Date.now();
            
            // Thông báo vẫn là lượt của người bắn (không đổi lượt)
            this.io.to(actualRoomId).emit('turn_continue', {
                currentTurn: game.currentTurn,
                currentPlayer: attacker.username,
                message: 'Bắn trúng! Bạn được bắn tiếp!'
            });

            // Restart turn timer (vẫn là lượt của người này)
            this.startTurnTimer(actualRoomId);
        }
        this.persistGameState(game);
    }

    // Turn timer
    startTurnTimer(roomId) {
        const game = games.get(roomId);
        if (!game) return;

        // Clear existing timers
        if (game.turnTimer) {
            clearTimeout(game.turnTimer);
        }
        if (game.turnCountdownInterval) {
            clearInterval(game.turnCountdownInterval);
        }

        // Set turn start time and remaining time
        game.turnStartTime = Date.now();
        const currentPlayer = game.currentTurn === game.player1.userId ? game.player1 : game.player2;
        const turnLimit = currentPlayer?.turnTimeLimit || game.turnTimeLimit || 60000;
        game.turnTimeLimit = turnLimit;
        game.turnTimeRemaining = Math.floor(turnLimit / 1000);

        // Start countdown interval - emit every second
        game.turnCountdownInterval = setInterval(() => {
            game.turnTimeRemaining--;
            
            // Emit timer update to both players
            this.io.to(roomId).emit('battle_timer_update', {
                timeRemaining: game.turnTimeRemaining,
                currentTurn: game.currentTurn
            });

            // Warning at 10 seconds
            if (game.turnTimeRemaining === 10) {
                this.io.to(roomId).emit('battle_timer_warning', {
                    message: '⏰ Còn 10 giây!',
                    timeRemaining: 10
                });
            }

            // Stop interval when time is up (timeout will handle the switch)
            if (game.turnTimeRemaining <= 0) {
                clearInterval(game.turnCountdownInterval);
                game.turnCountdownInterval = null;
            }
        }, 1000);

        // Main timeout - switch turn after limit
        game.turnTimer = setTimeout(() => {
            // Clear the countdown interval
            if (game.turnCountdownInterval) {
                clearInterval(game.turnCountdownInterval);
                game.turnCountdownInterval = null;
            }

            // Auto switch turn if timeout
            const currentPlayer = game.currentTurn === game.player1.userId ? game.player1 : game.player2;
            const nextPlayer = game.currentTurn === game.player1.userId ? game.player2 : game.player1;

            currentPlayer.timeoutCount = (currentPlayer.timeoutCount || 0) + 1;
            if (currentPlayer.timeoutCount > 5) {
                currentPlayer.turnTimeLimit = 5000;
            }
            if (currentPlayer.timeoutCount > 10) {
                this.io.to(roomId).emit('player_disconnect_timeout', {
                    disconnectedPlayer: currentPlayer.username,
                    winner: nextPlayer?.username,
                    message: `${currentPlayer.username} forfeited after too many timeouts.`
                });
                this.endGame(roomId, nextPlayer.userId);
                return;
            }

            this.io.to(roomId).emit('turn_timeout', {
                timeoutPlayer: currentPlayer.username
            });

            game.currentTurn = nextPlayer.userId;

            this.io.to(roomId).emit('turn_changed', {
                currentTurn: game.currentTurn,
                currentPlayer: nextPlayer.username
            });

            this.startTurnTimer(roomId);
            this.persistGameState(game);
        }, turnLimit);
    }

    // End game
    endGame(roomId, winnerId) {
        const game = games.get(roomId);
        const room = rooms.get(roomId);

        if (!game || !room) return;

        // Clear timer
        if (game.turnTimer) {
            clearTimeout(game.turnTimer);
        }

        const winner = game.player1.userId === winnerId ? game.player1 : game.player2;
        const loser = game.player1.userId === winnerId ? game.player2 : game.player1;

        // Lấy thông tin đầy đủ của players từ room (có isGuest và displayName)
        const player1 = room.player1;
        const player2 = room.player2;

        // Save game to database với snapshot cho guest
        const gameRecord = {
            roomId,
            player1Id: game.player1.userId,
            player1Username: game.player1.username,
            player1IsGuest: player1.isGuest || false,
            player1DisplayName: player1.guestDisplayName || player1.displayName || null,
            player2Id: game.player2.userId,
            player2Username: game.player2.username,
            player2IsGuest: player2.isGuest || false,
            player2DisplayName: player2.guestDisplayName || player2.displayName || null,
            winnerId,
            winnerUsername: winner.username,
            duration: Date.now() - game.startTime,
            startTime: game.startTime,
            endedAt: new Date().toISOString()
        };

        Database.createGame(gameRecord).catch(err => {
            console.error('Error saving game to database:', err);
        });
        this.clearGameState(roomId, room.code || game.roomCode || null);

        // Helper to normalize characterId (index to string format)
        const normalizeCharacterId = (charId) => {
            if (typeof charId === 'number') {
                return `character${charId + 1}`;
            }
            if (typeof charId === 'string' && charId.startsWith('character')) {
                return charId;
            }
            if (typeof charId === 'string' && !isNaN(parseInt(charId))) {
                return `character${parseInt(charId) + 1}`;
            }
            return 'character1';
        };

        // Notify players
        this.io.to(roomId).emit('game_over', {
            winner: {
                username: winner.username,
                userId: winner.userId,
                characterId: normalizeCharacterId(winner.characterId)
            },
            loser: {
                username: loser.username,
                userId: loser.userId,
                characterId: normalizeCharacterId(loser.characterId)
            },
            duration: gameRecord.duration
        });

        // Update room status
        room.status = 'finished';

        // Clear all timers
        if (game && game.turnTimer) {
            clearTimeout(game.turnTimer);
        }
        if (game && game.turnCountdownInterval) {
            clearInterval(game.turnCountdownInterval);
        }

        // Clean up after 30 seconds
        setTimeout(() => {
            games.delete(roomId);
            rooms.delete(roomId);
            this.broadcastRoomList();
        }, 30000);

        console.log(`Game ended in room ${roomId}. Winner: ${winner.username}`);
    }

    // Player disconnect - returns true if player is in a game/room (needs grace period)
    async handleDisconnect(socket) {
        console.log(`[Disconnect] Socket ${socket.id} disconnected (userId: ${socket.userId})`);
        
        // ✅ CRITICAL FIX: Check Redis for intentional leave flag
        // This prevents double game_over emission and reconnecting overlay for intentional leaves
        const isIntentional = await socketStateManager.isIntentionalLeave(socket.userId);
        if (isIntentional) {
            console.log(`[Disconnect] ✅ Intentional leave detected - skipping disconnect logic for ${socket.userId}`);
            return false;
        }
        
        // Remove from matchmaking queue if present
        this.removeFromQueue(socket.id);
        
        let playerUserId = socket.userId;
        
        // If no userId on socket, try to find from socketStateManager
        if (!playerUserId) {
            playerUserId = await socketStateManager.getUserIdBySocket(socket.id);
        }
        
        if (!playerUserId) {
            console.log(`[Disconnect] No userId found for socket ${socket.id}`);
            return false;
        }
        
        // Check if this disconnect should be ignored (rapid reconnection)
        const shouldIgnore = await socketStateManager.shouldIgnoreDisconnect(playerUserId, socket.id);
        if (shouldIgnore) {
            console.log(`[Disconnect] Ignoring disconnect for ${playerUserId} - rapid reconnection detected`);
            return true; // Return true to prevent guest cleanup
        }
        
        // Get socket status from Redis
        const socketStatus = await socketStateManager.checkSocketStatus(playerUserId, socket.id);
        console.log(`[Disconnect] Socket status for ${playerUserId}:`, {
            isCurrent: socketStatus.isCurrent,
            hasNewSocket: socketStatus.hasNewSocket,
            newSocketId: socketStatus.newSocketId
        });
        
        // Find player's room
        let playerRoom = null;
        let roomId = null;
        
        for (const [id, room] of rooms.entries()) {
            if ((room.player1 && room.player1.userId === playerUserId) || 
                (room.player2 && room.player2.userId === playerUserId)) {
                playerRoom = room;
                roomId = id;
                break;
            }
        }

        if (!playerRoom) {
            console.log(`[Disconnect] User ${playerUserId} not in any room`);
            await socketStateManager.clearSession(playerUserId, socket.id);
            return false;
        }

        const game = games.get(roomId);
        const isHost = playerRoom.player1 && playerRoom.player1.userId === playerUserId;
        const disconnectedPlayer = playerRoom.player1?.userId === playerUserId ? playerRoom.player1 : playerRoom.player2;
        const otherPlayer = playerRoom.player1?.userId === playerUserId ? playerRoom.player2 : playerRoom.player1;
        
        console.log(`[Disconnect] User ${playerUserId} in room ${roomId}, status=${playerRoom.status}, isHost=${isHost}`);
        
        // ✅ CRITICAL: Skip grace period for finished/game_over rooms
        if (playerRoom.status === 'finished' || playerRoom.status === 'game_over') {
            console.log(`[Disconnect] Room ${roomId} already ended (${playerRoom.status}) - skipping grace period`);
            await socketStateManager.clearSession(playerUserId, socket.id);
            return false;
        }
        
        // If user has a new socket, check if they're still in the room
        if (socketStatus.hasNewSocket) {
            const roomSockets = this.io.sockets.adapter.rooms.get(roomId);
            const newSocketInRoom = roomSockets && roomSockets.has(socketStatus.newSocketId);
            
            console.log(`[Disconnect] User has new socket ${socketStatus.newSocketId}, in room: ${newSocketInRoom}`);
            
            if (!newSocketInRoom) {
                // User navigated away (not in room with new socket)
                console.log(`[Disconnect] User ${playerUserId} left to hub/lobby`);
                
                // 🔥 CRITICAL FIX: CHECK REDIS BEFORE FORFEIT
                // Old socket disconnect can fire AFTER new socket registered
                // Redis is source of truth - NEVER trust RAM flags
                const redis = socketStateManager.getRedisClient();
                if (redis) {
                    try {
                        const redisConnected = await redis.get(`user:${playerUserId}:connected`);
                        const redisSocketId = await redis.get(`user:${playerUserId}:socket`);
                        
                        console.log(`[Disconnect] Redis check before forfeit:`, {
                            connected: redisConnected,
                            redisSocketId,
                            currentSocketId: socket.id
                        });
                        
                        // If Redis says user is connected → old socket, ABORT
                        if (redisConnected === 'true') {
                            console.log(`[Disconnect] ✅ Redis shows CONNECTED - old socket ignored`);
                            await socketStateManager.clearSession(playerUserId, socket.id);
                            return true;
                        }
                        
                        // If Redis socketId doesn't match → stale socket, ABORT
                        if (redisSocketId && redisSocketId !== socket.id) {
                            console.log(`[Disconnect] ✅ Stale socket detected (Redis: ${redisSocketId}, current: ${socket.id}) - ignored`);
                            await socketStateManager.clearSession(playerUserId, socket.id);
                            return true;
                        }
                        
                        console.log(`[Disconnect] ❌ Redis confirms disconnect - proceeding with forfeit`);
                    } catch (err) {
                        console.error(`[Disconnect] Redis check error:`, err.message);
                        // On error, assume connected (safe default)
                        console.log(`[Disconnect] ✅ Redis error - assuming connected, aborting forfeit`);
                        return true;
                    }
                }
                
                // ✅ FIX: User navigated away - START GRACE PERIOD
                // Don't forfeit immediately, give them time to reconnect
                const gracePeriodMs = (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing')) 
                    ? 10000  // 10s for battle/deployment
                    : 5000;  // 5s for lobby
                
                console.log(`[Disconnect] User navigated away, starting ${gracePeriodMs}ms grace period...`);
                
                // ✅ CRITICAL: Check Redis one more time before marking disconnected
                // New socket might have registered during the Redis check above
                if (redis) {
                    try {
                        const finalCheck = await redis.get(`user:${playerUserId}:connected`);
                        if (finalCheck === 'true') {
                            console.log(`[Disconnect] ✅ User reconnected during check - aborting grace period`);
                            return true;
                        }
                        
                        // ✅ NEW: Check if reconnect happened VERY recently (rapid reconnect)
                        // This handles race where disconnect event arrives AFTER reconnect completed
                        const lastReconnectAt = await redis.get(`user:${playerUserId}:lastReconnectAt`);
                        if (lastReconnectAt) {
                            const reconnectAge = Date.now() - parseInt(lastReconnectAt);
                            const RECONNECT_WINDOW_MS = 500; // 500ms window for rapid reconnects
                            
                            if (reconnectAge < RECONNECT_WINDOW_MS) {
                                console.log(`[Disconnect] ✅ Rapid reconnect detected (${reconnectAge}ms ago) - aborting grace period`);
                                return true;
                            }
                        }
                    } catch (err) {
                        console.log(`[Disconnect] Redis final check error - aborting grace period`);
                        return true;
                    }
                }
                
                // Mark as disconnected in Redis
                const gracePeriodStarted = await socketStateManager.markDisconnected(playerUserId, socket.id, gracePeriodMs);
                
                if (!gracePeriodStarted) {
                    console.log(`[Disconnect] Grace period not started - already reconnected`);
                    return true;
                }
                
                // ✅ CRITICAL: Check if player's socketId in room has changed BEFORE setting disconnected flag
                // This handles race where joinGameRoom() updated socketId during markDisconnected()
                if (disconnectedPlayer.socketId !== socket.id) {
                    console.log(`[Disconnect] ⚠️ Player socketId changed (was ${socket.id}, now ${disconnectedPlayer.socketId}) - aborting disconnect`);
                    // Clear the disconnected state in Redis since we're aborting
                    await socketStateManager.registerSocket(playerUserId, disconnectedPlayer.socketId, playerRoom.roomId);
                    return true;
                }
                
                // ✅ Double-check Redis one more time - joinGameRoom may have just registered
                if (redis) {
                    const currentSocketId = await redis.get(`user:${playerUserId}:socket`);
                    if (currentSocketId && currentSocketId !== socket.id) {
                        console.log(`[Disconnect] ⚠️ Redis socketId changed (was ${socket.id}, now ${currentSocketId}) - aborting disconnect`);
                        return true;
                    }
                }
                
                // Mark player as disconnected
                if (!disconnectedPlayer.disconnected) {
                    disconnectedPlayer.disconnected = true;
                    disconnectedPlayer.disconnectTime = Date.now();
                    console.log(`[Disconnect] ✅ Set disconnected=true for ${disconnectedPlayer.username}`);
                }
                
                // Clear any existing timers
                if (playerRoom.disconnectTimer) {
                    clearTimeout(playerRoom.disconnectTimer);
                    delete playerRoom.disconnectTimer;
                }
                if (playerRoom.battleDisconnectTimer) {
                    clearTimeout(playerRoom.battleDisconnectTimer);
                    delete playerRoom.battleDisconnectTimer;
                }
                
                // Notify opponent about disconnect with grace period
                if (otherPlayer && (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing'))) {
                    this.io.to(roomId).emit('player:disconnected', {
                        playerId: playerUserId,
                        message: `${disconnectedPlayer.username} disconnected`,
                        gracePeriod: gracePeriodMs / 1000
                    });
                }
                
                // Start grace period timer
                const timerKey = (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing'))
                    ? 'battleDisconnectTimer'
                    : 'disconnectTimer';
                
                playerRoom[timerKey] = setTimeout(async () => {
                    console.log(`[Disconnect] Grace period expired for ${playerUserId} after navigation`);
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    const graceStatus = await socketStateManager.checkGracePeriodStatus(playerUserId, gracePeriodMs);
                    console.log(`[Disconnect] Grace status:`, graceStatus);
                    
                    if (graceStatus.hasReconnected || !graceStatus.isStillDisconnected) {
                        console.log(`[Disconnect] ✅ User reconnected - cancelling forfeit`);
                        disconnectedPlayer.disconnected = false;
                        delete disconnectedPlayer.disconnectTime;
                        delete playerRoom[timerKey];
                        
                        this.io.to(roomId).emit('player:reconnected', {
                            playerId: playerUserId,
                            message: `${disconnectedPlayer.username} reconnected`
                        });
                        return;
                    }
                    
                    if (!graceStatus.gracePeriodExpired) {
                        console.log(`[Disconnect] ⏰ Grace period not expired`);
                        return;
                    }
                    
                    const finalSocketStatus = await socketStateManager.checkSocketStatus(playerUserId, socket.id);
                    if (finalSocketStatus.hasNewSocket) {
                        console.log(`[Disconnect] ✅ User has new socket - ABORT`);
                        disconnectedPlayer.disconnected = false;
                        delete disconnectedPlayer.disconnectTime;
                        delete playerRoom[timerKey];
                        return;
                    }
                    
                    console.log(`[Disconnect] ❌ Forfeit confirmed after grace period`);
                    
                    // Handle based on game phase
                    if (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing')) {
                        if (otherPlayer) {
                            if (game) {
                                this.endGame(roomId, otherPlayer.userId);
                            } else {
                                await this.createGameAndEndWithWinner(
                                    roomId,
                                    playerRoom,
                                    otherPlayer.userId,
                                    `${disconnectedPlayer.username} left during deployment`
                                );
                            }
                        } else {
                            this.disbandRoom(roomId, `${disconnectedPlayer.username} left during ${playerRoom.status}`);
                        }
                    } else {
                        this.disbandRoom(roomId, isHost ? 'Host left' : `${disconnectedPlayer.username} left`);
                    }
                    
                    await socketStateManager.clearSession(playerUserId, socket.id);
                }, gracePeriodMs);
                
                return true;
            } else {
                // User reconnected and is back in room - ignore disconnect
                console.log(`[Disconnect] User ${playerUserId} reconnected to room, ignoring old socket disconnect`);
                return true;
            }
        }
        
        // No new socket detected - start grace period based on game phase
        const gracePeriodMs = (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing')) 
            ? 10000  // 10s for battle/deployment
            : 3000;  // 3s for lobby
        
        // Mark as disconnected in Redis
        const gracePeriodStarted = await socketStateManager.markDisconnected(playerUserId, socket.id, gracePeriodMs);
        
        if (!gracePeriodStarted) {
            console.log(`[Disconnect] Grace period not started for ${playerUserId} - already reconnected`);
            return true;
        }
        
        console.log(`[Disconnect] Starting ${gracePeriodMs}ms grace period for ${playerUserId} in room ${roomId} (status: ${playerRoom.status})`);
        
        // Mark player as disconnected
        if (!disconnectedPlayer.disconnected) {
            disconnectedPlayer.disconnected = true;
            disconnectedPlayer.disconnectTime = Date.now();
        }
        
        // Battle/Deployment phase - 10s grace period
        if (playerRoom.status === 'deploying' || (game && playerRoom.status === 'playing')) {
            // Clear any existing timer
            if (playerRoom.battleDisconnectTimer) {
                clearTimeout(playerRoom.battleDisconnectTimer);
            }
            
            // Notify opponent
            if (otherPlayer) {
                this.io.to(roomId).emit('player:disconnected', {
                    playerId: playerUserId,
                    message: `${disconnectedPlayer.username} disconnected`,
                    gracePeriod: 10
                });
            }
            
            // Start 10s timer
            playerRoom.battleDisconnectTimer = setTimeout(async () => {
                console.log(`[Disconnect] Grace period timer triggered for ${playerUserId}, checking Redis state...`);
                
                // ✅ CRITICAL: Wait 50ms for Redis propagation (network + write latency)
                // Race condition: New socket might connect during old socket disconnect processing
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // ✅ NEW: Check if reconnect happened DURING grace period (rapid reconnect)
                const redis = socketStateManager.getRedisClient();
                if (redis) {
                    try {
                        const lastReconnectAt = await redis.get(`user:${playerUserId}:lastReconnectAt`);
                        const disconnectAt = await redis.get(`user:${playerUserId}:disconnectAt`);
                        
                        if (lastReconnectAt && disconnectAt) {
                            const reconnectTime = parseInt(lastReconnectAt);
                            const disconnectTime = parseInt(disconnectAt);
                            
                            // If reconnect happened AFTER disconnect, user is back
                            if (reconnectTime > disconnectTime) {
                                console.log(`[Disconnect] ✅ User ${playerUserId} reconnected during grace period (reconnect: ${reconnectTime}, disconnect: ${disconnectTime})`);
                                disconnectedPlayer.disconnected = false;
                                delete disconnectedPlayer.disconnectTime;
                                delete playerRoom.battleDisconnectTimer;
                                
                                this.io.to(roomId).emit('player:reconnected', {
                                    playerId: playerUserId,
                                    message: `${disconnectedPlayer.username} reconnected`
                                });
                                return;
                            }
                        }
                    } catch (err) {
                        console.error(`[Disconnect] Reconnect timestamp check error:`, err.message);
                    }
                }
                
                // CRITICAL: Check Redis single source of truth (NOT old socketId)
                const graceStatus = await socketStateManager.checkGracePeriodStatus(playerUserId, 10000);
                
                console.log(`[Disconnect] Grace status for ${playerUserId}:`, graceStatus);
                
                // If user reconnected, cancel timeout
                if (graceStatus.hasReconnected || !graceStatus.isStillDisconnected) {
                    console.log(`[Disconnect] ✅ User ${playerUserId} RECONNECTED - cancelling timeout`);
                    disconnectedPlayer.disconnected = false;
                    delete disconnectedPlayer.disconnectTime;
                    delete playerRoom.battleDisconnectTimer;
                    
                    this.io.to(roomId).emit('player:reconnected', {
                        playerId: playerUserId,
                        message: `${disconnectedPlayer.username} reconnected`
                    });
                    return;
                }
                
                // If grace period NOT expired yet, don't punish
                if (!graceStatus.gracePeriodExpired) {
                    console.log(`[Disconnect] ⏰ Grace period not expired for ${playerUserId} - giving more time`);
                    return;
                }
                
                // 🔥 CRITICAL SAFETY CHECK: Re-check socket status before forfeit
                // Client might have reconnected but not joined room yet (slow network/page load)
                const finalSocketStatus = await socketStateManager.checkSocketStatus(playerUserId, socket.id);
                console.log(`[Disconnect] Final socket check before forfeit:`, finalSocketStatus);
                
                if (finalSocketStatus.hasNewSocket) {
                    console.log(`[Disconnect] ✅ User ${playerUserId} has new socket ${finalSocketStatus.newSocketId} - ABORT forfeit`);
                    disconnectedPlayer.disconnected = false;
                    delete disconnectedPlayer.disconnectTime;
                    delete playerRoom.battleDisconnectTimer;
                    return;
                }
                
                // Player did not reconnect AND grace period expired - opponent wins
                console.log(`[Disconnect] ❌ User ${playerUserId} did not reconnect, opponent wins`);
                
                if (otherPlayer) {
                    // Create game record and show game over screen
                    await this.createGameAndEndWithWinner(
                        roomId,
                        playerRoom,
                        otherPlayer.userId,
                        `${disconnectedPlayer.username} disconnected`
                    );
                } else {
                    // No opponent - just disband
                    this.disbandRoom(roomId, `${disconnectedPlayer.username} disconnected`);
                }
                
                await socketStateManager.clearSession(playerUserId, socket.id);
            }, 10000);
            
            return true;
        }
        
        // Lobby phase - 5s grace period (increased from 3s for better UX)
        if (['waiting', 'character_selection', 'preparing'].includes(playerRoom.status)) {
            // Clear any existing timer
            if (playerRoom.disconnectTimer) {
                clearTimeout(playerRoom.disconnectTimer);
            }
            
            // Start 5s timer
            playerRoom.disconnectTimer = setTimeout(async () => {
                console.log(`[Disconnect] Lobby grace period timer triggered for ${playerUserId}`);
                
                // ✅ CRITICAL: Wait 50ms for Redis propagation (network + write latency)
                await new Promise(resolve => setTimeout(resolve, 50));
                
                console.log(`[Disconnect] Now checking Redis after buffer...`);
                
                // Check Redis single source of truth
                const graceStatus = await socketStateManager.checkGracePeriodStatus(playerUserId, 5000);
                
                console.log(`[Disconnect] Lobby grace status:`, graceStatus);
                
                // If user reconnected, cancel timeout
                if (graceStatus.hasReconnected || !graceStatus.isStillDisconnected) {
                    console.log(`[Disconnect] ✅ User ${playerUserId} reconnected to lobby`);
                    disconnectedPlayer.disconnected = false;
                    delete disconnectedPlayer.disconnectTime;
                    delete playerRoom.disconnectTimer;
                    return;
                }
                
                // ✅ DOUBLE CHECK: Query Redis again to catch race conditions
                const doubleCheck = await socketStateManager.checkGracePeriodStatus(playerUserId, 5000);
                if (doubleCheck.hasReconnected) {
                    console.log(`[Disconnect] ✅✅ DOUBLE CHECK: User reconnected, cancelling`);
                    disconnectedPlayer.disconnected = false;
                    delete disconnectedPlayer.disconnectTime;
                    delete playerRoom.disconnectTimer;
                    return;
                }
                
                // If grace period NOT expired yet, don't punish
                if (!graceStatus.gracePeriodExpired) {
                    console.log(`[Disconnect] ⏰ Lobby grace period not expired for ${playerUserId}`);
                    return;
                }
                
                // 🔥 CRITICAL SAFETY CHECK: Re-check socket status before disbanding
                const finalSocketStatus = await socketStateManager.checkSocketStatus(playerUserId, socket.id);
                console.log(`[Disconnect] Final socket check before disband:`, finalSocketStatus);
                
                if (finalSocketStatus.hasNewSocket) {
                    console.log(`[Disconnect] ✅ User ${playerUserId} has new socket ${finalSocketStatus.newSocketId} - ABORT disband`);
                    disconnectedPlayer.disconnected = false;
                    delete disconnectedPlayer.disconnectTime;
                    delete playerRoom.disconnectTimer;
                    return;
                }
                
                // Player did not reconnect - disband room
                console.log(`[Disconnect] ❌ User ${playerUserId} did not reconnect to lobby, disbanding`);
                this.disbandRoom(roomId, isHost ? 'Host left' : `${disconnectedPlayer.username} left`);
                await socketStateManager.clearSession(playerUserId, socket.id);
            }, 5000);
            
            return true;
        }
        
        // Unknown state - clean up
        console.log(`[Disconnect] Unknown room status ${playerRoom.status}, cleaning up`);
        await socketStateManager.clearSession(playerUserId, socket.id);
        return false;
    }

    // Broadcast room list to all clients (chỉ hiển thị public rooms)
    broadcastRoomList() {
        const availableRooms = Array.from(rooms.values())
            .filter(room => room.status === 'waiting' && !room.isPrivate) // Chỉ public rooms
            .map(room => ({
                id: room.id,
                player1: room.player1.username,
                createdAt: room.createdAt
            }));

        this.io.emit('room_list', { rooms: availableRooms });
    }

    // ============ QUICK PLAY QUEUE ============
    
    // Join matchmaking queue
    joinQueue(socket, data) {
        const { userId, username } = data;
        
        // Check if already in queue
        const existingIndex = matchmakingQueue.findIndex(p => p.userId === userId);
        if (existingIndex !== -1) {
            return socket.emit('queue:error', { message: 'Already in queue' });
        }
        
        // Check if there's someone else in queue
        if (matchmakingQueue.length > 0) {
            // Match found! Pop first player from queue
            const opponent = matchmakingQueue.shift();
            
            // Create public room and join both players
            const roomId = this.generateRoomId();
            const room = {
                id: roomId,
                code: null, // Public room has no code
                isPrivate: false,
                player1: {
                    userId: opponent.userId,
                    username: opponent.username,
                    socketId: opponent.socketId,
                    ready: false,
                    characterId: null,
                    characterLocked: false,
                    isGuest: opponent.isGuest || false,
                    guestDisplayName: opponent.guestDisplayName || null
                },
                player2: {
                    userId,
                    username,
                    socketId: socket.id,
                    ready: false,
                    characterId: null,
                    characterLocked: false,
                    isGuest: socket.isGuest || false,
                    guestDisplayName: socket.guestName || null
                },
                status: 'character_selection',
                characterSelectionStartTime: Date.now(),
                createdAt: Date.now()
            };
            
            rooms.set(roomId, room);
            playerSockets.set(opponent.userId, opponent.socketId);
            playerSockets.set(userId, socket.id);
            
            // Get opponent socket
            const opponentSocket = this.io.sockets.sockets.get(opponent.socketId);
            
            // Join both to room
            if (opponentSocket) {
                opponentSocket.join(roomId);
            }
            socket.join(roomId);
            
            // Start 60s countdown for public room (both players joined)
            this.startLobbyCountdown(roomId, room);
            
            // Notify both players - match found
            this.io.to(roomId).emit('match:found', {
                room: this.sanitizeRoom(room),
                characterSelectionStartTime: room.characterSelectionStartTime
            });
            
            console.log(`[Queue] Match found! ${opponent.username} vs ${username} in room ${roomId}`);
        } else {
            // No one in queue, add current player
            matchmakingQueue.push({
                socketId: socket.id,
                userId,
                username,
                isGuest: socket.isGuest || false,
                guestDisplayName: socket.guestName || null,
                queuedAt: Date.now()
            });
            
            socket.emit('queue:waiting', { position: matchmakingQueue.length });
            console.log(`[Queue] ${username} joined queue (position: ${matchmakingQueue.length})`);
        }
    }
    
    // Cancel queue
    cancelQueue(socket, data) {
        const { userId } = data;
        const index = matchmakingQueue.findIndex(p => p.userId === userId);
        
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
            // Emit both events for backwards compatibility
            socket.emit('queue:cancelled');
            socket.emit('queue:left');
            console.log(`[Queue] ${data.username || 'User'} cancelled queue`);
        }
    }
    
    // Remove from queue on disconnect
    removeFromQueue(socketId) {
        const index = matchmakingQueue.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            const player = matchmakingQueue.splice(index, 1)[0];
            console.log(`[Queue] ${player.username} removed from queue (disconnect)`);
        }
    }
    
    // ============ PRIVATE ROOM ============
    
    // Create private room
    createPrivateRoom(socket, data) {
        const { userId, username } = data;
        
        // Check if user already in a room
        let oldRoomId = null;
        for (const [rid, r] of rooms.entries()) {
            if ((r.player1 && r.player1.userId === userId) || (r.player2 && r.player2.userId === userId)) {
                oldRoomId = rid;
                break;
            }
        }
        
        // Leave old room if exists
        if (oldRoomId) {
            const oldRoom = rooms.get(oldRoomId);
            socket.leave(oldRoomId);
            
            if (oldRoom.player1 && oldRoom.player1.userId === userId) {
                rooms.delete(oldRoomId);
            } else if (oldRoom.player2 && oldRoom.player2.userId === userId) {
                oldRoom.player2 = null;
                oldRoom.status = 'waiting';
            }
            
            console.log(`[Private] User ${username} left old room ${oldRoomId}`);
        }
        
        const roomId = this.generateRoomId();
        const roomCode = this.generateRoomCode();
        
        const room = {
            id: roomId,
            code: roomCode,
            isPrivate: true,
            player1: {
                userId,
                username,
                socketId: socket.id,
                ready: false,
                characterId: null,
                characterLocked: false,
                isGuest: socket.isGuest || false,
                guestDisplayName: socket.guestName || null
            },
            player2: null,
            status: 'waiting',
            createdAt: Date.now()
        };
        
        rooms.set(roomId, room);
        playerSockets.set(userId, socket.id);
        socket.join(roomId);
        
        socket.emit('room:created', { 
            roomId, 
            roomCode, 
            room: this.sanitizeRoom(room),
            isPrivate: true
        });
        
        console.log(`[Private] Room ${roomId} (code: ${roomCode}) created by ${username}, total rooms: ${rooms.size}`);
    }
    
    // Join private room by code
    joinPrivateRoom(socket, data) {
        const { code, userId, username } = data;
        
        if (!code || typeof code !== 'string') {
            return socket.emit('room:error', { message: 'Invalid room code' });
        }
        
        const roomCode = code.trim().toUpperCase();
        
        // Find room by code
        let targetRoom = null;
        let targetRoomId = null;
        
        for (const [rid, r] of rooms.entries()) {
            if (r.code === roomCode && r.isPrivate) {
                targetRoom = r;
                targetRoomId = rid;
                break;
            }
        }
        
        if (!targetRoom) {
            return socket.emit('room:error', { message: 'Room not found' });
        }
        
        if (targetRoom.status !== 'waiting') {
            return socket.emit('room:error', { message: 'Room is not available' });
        }
        
        if (targetRoom.player2) {
            return socket.emit('room:error', { message: 'Room is full' });
        }
        
        if (targetRoom.player1.userId === userId) {
            return socket.emit('room:error', { message: 'You are already in this room' });
        }
        
        // Leave old room if exists
        let oldRoomId = null;
        for (const [rid, r] of rooms.entries()) {
            if (rid !== targetRoomId && ((r.player1 && r.player1.userId === userId) || (r.player2 && r.player2.userId === userId))) {
                oldRoomId = rid;
                break;
            }
        }
        
        if (oldRoomId) {
            const oldRoom = rooms.get(oldRoomId);
            socket.leave(oldRoomId);
            
            if (oldRoom.player1 && oldRoom.player1.userId === userId) {
                rooms.delete(oldRoomId);
            } else if (oldRoom.player2 && oldRoom.player2.userId === userId) {
                oldRoom.player2 = null;
                oldRoom.status = 'waiting';
            }
        }
        
        // Join room
        targetRoom.player2 = {
            userId,
            username,
            socketId: socket.id,
            ready: false,
            characterId: null,
            characterLocked: false,
            isGuest: socket.isGuest || false,
            guestDisplayName: socket.guestName || null
        };
        targetRoom.status = 'character_selection';
        targetRoom.characterSelectionStartTime = Date.now();
        
        playerSockets.set(userId, socket.id);
        socket.join(targetRoomId);
        
        // Start 60s countdown for private room (player2 just joined)
        this.startLobbyCountdown(targetRoomId, targetRoom);
        
        // Notify both players - emit BOTH events for compatibility
        this.io.to(targetRoomId).emit('player_joined', {
            room: this.sanitizeRoom(targetRoom),
            characterSelectionStartTime: targetRoom.characterSelectionStartTime
        });
        this.io.to(targetRoomId).emit('room:playerJoined', {
            room: this.sanitizeRoom(targetRoom),
            joinedUserId: userId
        });
        
        console.log(`[Private] ${username} joined room ${targetRoomId} (code: ${roomCode})`);
    }

    // Request room info (for lobby page when redirected after creating/joining)
    async requestRoomInfo(socket, data) {
        const { roomCode, userId, username } = data;
        
        if (!roomCode) {
            return socket.emit('room:error', { message: 'Room code is required' });
        }
        
        // Find room by code or ID
        let targetRoom = null;
        let targetRoomId = null;
        
        // Try to find by code first
        for (const [rid, r] of rooms.entries()) {
            if (r.code === roomCode || rid === roomCode) {
                targetRoom = r;
                targetRoomId = rid;
                break;
            }
        }
        
        if (!targetRoom) {
            console.log(`[Lobby] Room not found for code: ${roomCode}, total rooms: ${rooms.size}`);
            return socket.emit('room:error', { message: 'Room not found or expired', code: 'ROOM_NOT_FOUND' });
        }
        
        // Check if user is in this room
        const isPlayer1 = targetRoom.player1 && targetRoom.player1.userId === userId;
        const isPlayer2 = targetRoom.player2 && targetRoom.player2.userId === userId;
        
        if (!isPlayer1 && !isPlayer2) {
            console.log(`[Lobby] User ${username} not in room ${targetRoomId}`);
            return socket.emit('room:error', { message: 'You are not in this room' });
        }
        
        // ✅ FIX PATH 2: Register socket FIRST (Redis single source of truth)
        console.log(`[Lobby] 🔧 [PATH 2] Registering socket BEFORE room join for ${username}`);
        await socketStateManager.registerSocket(userId, socket.id, targetRoomId);
        await socketStateManager.updateRoomStatus(userId, targetRoomId, targetRoom.status);
        
        // Update socket ID for reconnection (important for navigation between pages)
        if (isPlayer1) {
            targetRoom.player1.socketId = socket.id;
            // Clear disconnect flag if was disconnected
            if (targetRoom.player1.disconnected) {
                targetRoom.player1.disconnected = false;
                targetRoom.player1.disconnectedAt = null;
                console.log(`[Lobby] Cleared disconnect flag for player1 ${username}`);
            }
        } else if (isPlayer2) {
            targetRoom.player2.socketId = socket.id;
            // Clear disconnect flag if was disconnected
            if (targetRoom.player2.disconnected) {
                targetRoom.player2.disconnected = false;
                targetRoom.player2.disconnectedAt = null;
                console.log(`[Lobby] Cleared disconnect flag for player2 ${username}`);
            }
        }
        
        // Clear battle disconnect timer if exists (player reconnected)
        if (targetRoom.battleDisconnectTimer) {
            clearTimeout(targetRoom.battleDisconnectTimer);
            targetRoom.battleDisconnectTimer = null;
            console.log(`[Lobby] Cleared battle disconnect timer for room ${targetRoomId}`);
            
            // Notify opponent that player reconnected
            socket.to(targetRoomId).emit('player_reconnected', {
                username: username,
                userId: userId
            });
        }
        
        // Update player socket mapping
        playerSockets.set(userId, socket.id);
        
        // User is already in room, just send room info
        socket.join(targetRoomId); // Ensure socket is in the room
        
        socket.emit('room:joined', {
            room: this.sanitizeRoom(targetRoom),
            roomId: targetRoomId
        });
        
        console.log(`[Lobby] ${username} requested room info for ${targetRoomId} (code: ${roomCode}), socketId updated`);
    }

    // Lobby player ready (before game starts - just marks player as ready in lobby)
    lobbyPlayerReady(socket, data) {
        const { roomCode, userId, username } = data;
        
        if (!roomCode) {
            return socket.emit('room:error', { message: 'Room code is required' });
        }
        
        // Find room by code
        let targetRoom = null;
        let targetRoomId = null;
        
        for (const [rid, r] of rooms.entries()) {
            if (r.code === roomCode || rid === roomCode) {
                targetRoom = r;
                targetRoomId = rid;
                break;
            }
        }
        
        if (!targetRoom) {
            return socket.emit('room:error', { message: 'Room not found' });
        }
        
        // Mark player as ready in lobby
        if (targetRoom.player1 && targetRoom.player1.userId === userId) {
            targetRoom.player1.lobbyReady = true;
        } else if (targetRoom.player2 && targetRoom.player2.userId === userId) {
            targetRoom.player2.lobbyReady = true;
        }
        
        // Notify room about ready status
        this.io.to(targetRoomId).emit('lobby:playerReady', {
            userId,
            username
        });
        
        console.log(`[Lobby] ${username} is ready in room ${targetRoomId}`);
        
        // If both players ready, transition to game
        if (targetRoom.player1 && targetRoom.player2 && 
            targetRoom.player1.lobbyReady && targetRoom.player2.lobbyReady) {
            
            console.log(`[Lobby] Both players ready in room ${targetRoomId}, starting game transition`);
            
            // Clear countdown timer since both are ready
            this.clearLobbyCountdown(targetRoom);
            
            // === START DEPLOYMENT TIMER (120s) ===
            targetRoom.status = 'deploying';
            this.startDeploymentTimer(targetRoomId, targetRoom);
            
            // Notify both players to start game
            this.io.to(targetRoomId).emit('lobby:bothReady', {
                message: 'Both players are ready! Starting game...'
            });
        }
    }
    
    // Join game room (when navigating to game.html)
    async joinGameRoom(socket, data) {
        const { roomCode, userId, username } = data;
        const resolvedUserId = userId || socket.userId;
        
        console.log(`[GameHandler] joinGameRoom - userId: ${userId}, roomCode: ${roomCode}`);
        
        if (!roomCode) {
            return socket.emit('room:error', { message: 'Room code is required' });
        }
        
        // Find room by code (for private rooms) or by id (for quick match)
        let targetRoom = null;
        let targetRoomId = null;
        
        console.log(`[GameHandler] Searching in ${rooms.size} rooms...`);
        
        for (const [rid, r] of rooms.entries()) {
            console.log(`[GameHandler] Checking room - rid: ${rid}, code: ${r.code}, isPrivate: ${r.isPrivate}`);
            if (r.code === roomCode || rid === roomCode) {
                targetRoom = r;
                targetRoomId = rid;
                console.log(`[GameHandler] ✅ Found room: ${rid}`);
                break;
            }
        }

        if (!targetRoom) {
            const restored = await this.getGameByIdentifier(roomCode);
            if (restored) {
                targetRoomId = restored.roomId;
                targetRoom = rooms.get(targetRoomId) || null;
            }
        }

        if (!targetRoom) {
            console.error(`[GameHandler] ❌ Room not found: ${roomCode}`);
            console.error(`[GameHandler] Available rooms:`, Array.from(rooms.keys()));
            console.log(`[GameHandler] 💡 Room may have ended - checking game history...`);
            
            // Check if room ended (game over)
            const gameRecord = await this.getGameByIdentifier(roomCode);
            if (gameRecord && gameRecord.gameState === 'finished') {
                console.log(`[GameHandler] 🏁 Game already ended in room ${roomCode}`);
                return socket.emit('game:already_ended', { 
                    message: 'Game has already ended',
                    winner: gameRecord.winner,
                    roomId: roomCode
                });
            }
            
            return socket.emit('room:error', { message: 'Room not found or has ended' });
        }
        
        // ✅ CRITICAL FIX: Register socket in Redis FIRST (before join/emit)
        let wasDisconnected = false;
        if (resolvedUserId) {
            console.log(`[GameHandler] 🔧 Registering socket BEFORE join/emit...`);
            
            // 1. Register in Redis (sets connected=true, deletes disconnectAt)
            await socketStateManager.registerSocket(resolvedUserId, socket.id, targetRoomId);
            await socketStateManager.updateRoomStatus(resolvedUserId, targetRoomId, targetRoom.status);
            
            // 2. Clear any disconnect timers (prevents stale timer callbacks)
            // Note: Don't set wasDisconnected here - timer existing doesn't mean player was marked disconnected
            if (targetRoom.disconnectTimer) {
                console.log(`[GameHandler] ✅ Clearing disconnectTimer - user rejoined`);
                clearTimeout(targetRoom.disconnectTimer);
                delete targetRoom.disconnectTimer;
            }
            if (targetRoom.battleDisconnectTimer) {
                console.log(`[GameHandler] ✅ Clearing battleDisconnectTimer - user rejoined`);
                clearTimeout(targetRoom.battleDisconnectTimer);
                delete targetRoom.battleDisconnectTimer;
            }
            
            // 3. Update room player data
            // Only set wasDisconnected if player actually had disconnected=true flag
            if (targetRoom.player1 && targetRoom.player1.userId === resolvedUserId) {
                targetRoom.player1.socketId = socket.id;
                if (targetRoom.player1.disconnected === true) {
                    wasDisconnected = true;
                    console.log(`[GameHandler] 🔄 Player1 was disconnected, will emit reconnected event`);
                }
                targetRoom.player1.disconnected = false;
                delete targetRoom.player1.disconnectTime;
            } else if (targetRoom.player2 && targetRoom.player2.userId === resolvedUserId) {
                targetRoom.player2.socketId = socket.id;
                if (targetRoom.player2.disconnected === true) {
                    wasDisconnected = true;
                    console.log(`[GameHandler] 🔄 Player2 was disconnected, will emit reconnected event`);
                }
                targetRoom.player2.disconnected = false;
                delete targetRoom.player2.disconnectTime;
            }
            
            playerSockets.set(resolvedUserId, socket.id);
            
            console.log(`[GameHandler] ✅ Redis updated BEFORE join (connected=true)`);
        }

        // NOW safe to join room and emit events
        socket.join(targetRoomId);
        console.log(`[GameHandler] ✅ Socket ${socket.id} joined room ${targetRoomId}`);
        
        // 4. ✅ CRITICAL: Emit player:reconnected AFTER joining room
        // This clears the reconnecting overlay on client side
        if (wasDisconnected) {
            const reconnectedPlayer = targetRoom.player1?.userId === resolvedUserId ? targetRoom.player1 : targetRoom.player2;
            console.log(`[GameHandler] 📢 Emitting player:reconnected for ${reconnectedPlayer?.username} to room ${targetRoomId}`);
            this.io.to(targetRoomId).emit('player:reconnected', {
                playerId: resolvedUserId,
                username: reconnectedPlayer?.username,
                message: `${reconnectedPlayer?.username} reconnected`
            });
        }
        
        // Send actual roomId back to client for chat/webrtc
        socket.emit('room:actualRoomId', {
            roomCode: roomCode,
            actualRoomId: targetRoomId
        });
        
        // Send current ready status to the joining player
        socket.emit('player_ready_update', {
            player1Ready: targetRoom.player1?.ready || false,
            player2Ready: targetRoom.player2?.ready || false
        });
        
        console.log(`[GameHandler] Sent initial ready status to ${username}`);
    }
    
    // Lobby character changed (realtime update for opponent)
    lobbyCharacterChanged(socket, data) {
        const { roomCode, characterIndex, userId } = data;
        
        if (!roomCode) {
            return socket.emit('room:error', { 
                message: 'Room code is required',
                code: 'MISSING_ROOM_CODE'
            });
        }
        
        // Find room by code OR by roomId (for public rooms)
        let targetRoomId = null;
        let targetRoom = null;
        for (const [rid, room] of rooms.entries()) {
            // Support both private (room.code) and public (rid)
            if (room.code === roomCode || rid === roomCode) {
                targetRoomId = rid;
                targetRoom = room;
                break;
            }
        }
        
        if (!targetRoom) {
            console.log(`[Lobby] Room ${roomCode} not found for character change`);
            return socket.emit('room:error', { 
                message: 'Room not found',
                code: 'ROOM_NOT_FOUND'
            });
        }
        
        // Update character in room
        if (targetRoom.player1 && targetRoom.player1.userId === userId) {
            targetRoom.player1.characterId = characterIndex;
        } else if (targetRoom.player2 && targetRoom.player2.userId === userId) {
            targetRoom.player2.characterId = characterIndex;
        }
        
        // Notify opponent only (not the sender)
        socket.to(targetRoomId).emit('lobby:opponentCharacterChanged', {
            characterIndex
        });
        
        // Also emit room:updated for UI sync
        this.emitRoomUpdated(targetRoomId);
        
        console.log(`[Lobby] Character changed in room ${roomCode} to index ${characterIndex}`);
    }

    // Helper functions
    generateRoomId() {
        return 'room_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    generateGameId() {
        return 'game_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // === DEPLOYMENT TIMER (SHARED FOR BOTH PLAYERS) ===
    startDeploymentTimer(roomId, room) {
        // Safety check - only start if both players exist
        if (!room.player1 || !room.player2) {
            console.error(`[Deployment Timer] ❌ Cannot start timer - missing player(s) in room ${roomId}`);
            console.log(`[Deployment Timer] Player1: ${room.player1?.username || 'null'}, Player2: ${room.player2?.username || 'null'}`);
            return;
        }
        
        const DEPLOYMENT_DURATION = 120; // 120 seconds
        
        // Clear any existing timer
        if (room.deploymentTimerInterval) {
            clearInterval(room.deploymentTimerInterval);
        }
        
        // Set end time
        room.deploymentEndTime = Date.now() + (DEPLOYMENT_DURATION * 1000);
        room.deploymentTimeRemaining = DEPLOYMENT_DURATION;
        
        console.log(`[Deployment Timer] ⏰ Starting SHARED deployment timer for room ${roomId}: ${DEPLOYMENT_DURATION}s`);
        
        // Emit initial timer
        this.io.to(roomId).emit('deployment_timer_update', {
            timeRemaining: DEPLOYMENT_DURATION,
            endTime: room.deploymentEndTime
        });
        
        // Update timer every second
        room.deploymentTimerInterval = setInterval(() => {
            const now = Date.now();
            const remainingMs = room.deploymentEndTime - now;
            room.deploymentTimeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
            
            // Emit to both clients
            this.io.to(roomId).emit('deployment_timer_update', {
                timeRemaining: room.deploymentTimeRemaining
            });
            
            // Check if time's up
            if (room.deploymentTimeRemaining <= 0) {
                console.log(`[Deployment Timer] ⏰ Time's up for room ${roomId}!`);
                this.handleDeploymentTimeout(roomId, room);
            }
            
            // Warning at 10s
            if (room.deploymentTimeRemaining === 10) {
                this.io.to(roomId).emit('deployment_timer_warning', {
                    message: 'Only 10 seconds remaining!'
                });
            }
        }, 1000);
    }
    
    stopDeploymentTimer(room) {
        if (room.deploymentTimerInterval) {
            clearInterval(room.deploymentTimerInterval);
            room.deploymentTimerInterval = null;
            console.log(`[Deployment Timer] ⏹️ Timer stopped`);
        }
    }
    
    handleDeploymentTimeout(roomId, room) {
        this.stopDeploymentTimer(room);
        
        console.log(`[Deployment Timer] 🤖 Auto-readying players who are not ready...`);
        
        // Auto-ready any player who hasn't readied yet
        let autoReadyCount = 0;
        
        if (room.player1 && !room.player1.ready) {
            console.log(`[Deployment Timer] Auto-readying ${room.player1.username}`);
            // Generate random ship placement for player1
            room.player1.ships = this.generateRandomShips();
            room.player1.board = this.generateBoardFromShips(room.player1.ships);
            room.player1.ready = true;
            autoReadyCount++;
            
            // Notify player1
            const player1Socket = this.io.sockets.sockets.get(room.player1.socketId);
            if (player1Socket) {
                player1Socket.emit('deployment_auto_ready', {
                    message: 'Time\'s up! Your ships have been placed automatically.',
                    ships: room.player1.ships
                });
            }
        }
        
        if (room.player2 && !room.player2.ready) {
            console.log(`[Deployment Timer] Auto-readying ${room.player2.username}`);
            // Generate random ship placement for player2
            room.player2.ships = this.generateRandomShips();
            room.player2.board = this.generateBoardFromShips(room.player2.ships);
            room.player2.ready = true;
            autoReadyCount++;
            
            // Notify player2
            const player2Socket = this.io.sockets.sockets.get(room.player2.socketId);
            if (player2Socket) {
                player2Socket.emit('deployment_auto_ready', {
                    message: 'Time\'s up! Your ships have been placed automatically.',
                    ships: room.player2.ships
                });
            }
        }
        
        console.log(`[Deployment Timer] Auto-readied ${autoReadyCount} player(s)`);
        
        // If both players exist and are now ready, start game
        if (room.player1 && room.player2 && room.player1.ready && room.player2.ready) {
            console.log(`[Deployment Timer] Both players ready after timeout, starting game...`);
            this.startGame(roomId);
        } else if (!room.player2) {
            // Private room waiting for player2 - don't start game yet
            console.log(`[Deployment Timer] Waiting for player2 to join private room ${roomId}`);
            // Stop deployment phase since only 1 player
            room.phase = 'waiting';
        }
    }
    
    generateRandomShips() {
        // Place all ships randomly on a fresh board so each ship has a valid cells array
        const board = GameLogic.createEmptyBoard();
        const placedShips = [];

        for (const shipConfig of SHIPS) {
            let placed = false;
            let attempts = 0;

            // Try random positions first
            while (!placed && attempts < 100) {
                attempts++;
                const isHorizontal = Math.random() < 0.5;
                const row = Math.floor(Math.random() * board.length);
                const col = Math.floor(Math.random() * board[0].length);

                if (!GameLogic.canPlaceShip(board, shipConfig, row, col, isHorizontal)) {
                    continue;
                }

                const cells = GameLogic.placeShip(board, shipConfig, row, col, isHorizontal);
                if (cells) {
                    placedShips.push({
                        name: shipConfig.name,
                        size: shipConfig.size,
                        cells,
                        hits: 0
                    });
                    placed = true;
                }
            }

            // Fallback deterministic scan (should rarely be needed)
            if (!placed) {
                for (let r = 0; r < board.length && !placed; r++) {
                    for (let c = 0; c < board[0].length && !placed; c++) {
                        for (const isHorizontal of [true, false]) {
                            if (GameLogic.canPlaceShip(board, shipConfig, r, c, isHorizontal)) {
                                const cells = GameLogic.placeShip(board, shipConfig, r, c, isHorizontal);
                                placedShips.push({
                                    name: shipConfig.name,
                                    size: shipConfig.size,
                                    cells,
                                    hits: 0
                                });
                                placed = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return placedShips;
    }
    
    generateBoardFromShips(ships) {
        const board = GameLogic.createEmptyBoard();

        if (!Array.isArray(ships)) {
            return board;
        }

        ships.forEach(ship => {
            if (!ship || !Array.isArray(ship.cells)) {
                return;
            }

            ship.cells.forEach(cell => {
                const { row, col } = cell;
                if (GameLogic.isValidCoordinate(row, col)) {
                    board[row][col] = ship.name;
                }
            });
        });

        return board;
    }

    // Create minimal game record and end with winner (for deployment disconnect)
    createGameAndEndWithWinner(roomId, room, winnerId, reason = 'disconnect') {
        console.log(`[GameHandler] Creating game record for ${reason} win in room ${roomId}, room status: ${room.status}`);
        
        const winner = room.player1.userId === winnerId ? room.player1 : room.player2;
        const loser = room.player1.userId === winnerId ? room.player2 : room.player1;

        // Save game to database
        const gameRecord = {
            roomId,
            player1Id: room.player1.userId,
            player1Username: room.player1.username,
            player1IsGuest: room.player1.isGuest || false,
            player1DisplayName: room.player1.guestDisplayName || room.player1.displayName || null,
            player2Id: room.player2.userId,
            player2Username: room.player2.username,
            player2IsGuest: room.player2.isGuest || false,
            player2DisplayName: room.player2.guestDisplayName || room.player2.displayName || null,
            winnerId,
            winnerUsername: winner.username,
            duration: 0, // No actual gameplay time
            startTime: Date.now(),
            endedAt: new Date().toISOString(),
            reason: reason
        };

        Database.createGame(gameRecord).catch(err => {
            console.error('Error saving game to database:', err);
        });

        // Normalize characterId
        const normalizeCharacterId = (charId) => {
            if (typeof charId === 'number') {
                return `character${charId + 1}`;
            }
            if (typeof charId === 'string' && charId.startsWith('character')) {
                return charId;
            }
            if (typeof charId === 'string' && !isNaN(parseInt(charId))) {
                return `character${parseInt(charId) + 1}`;
            }
            return 'character1';
        };

        // ✅ CRITICAL FIX: Only emit game_over if game actually started (deployment or playing)
        // Lobby disconnects should NOT show game over screen
        const gamePhases = ['deploying', 'playing'];
        if (gamePhases.includes(room.status)) {
            console.log(`[GameHandler] ✅ Emitting game_over for ${room.status} phase`);
            
            // Emit game_over event
            this.io.to(roomId).emit('game_over', {
                winner: {
                    userId: winner.userId,
                    username: winner.username,
                    characterId: normalizeCharacterId(winner.characterId)
                },
                loser: {
                    userId: loser.userId,
                    username: loser.username,
                    characterId: normalizeCharacterId(loser.characterId)
                },
                reason: reason,
                message: `${winner.username} thắng do ${loser.username} mất kết nối!`
            });
        } else {
            console.log(`[GameHandler] ⚠️ Room status '${room.status}' - NOT emitting game_over (lobby phase)`);
            // For lobby phase, just disband without game_over screen
            this.disbandRoom(roomId, `${loser.username} left before game started`);
            return; // Early return to skip cleanup below
        }

        // Clean up room AFTER a short delay to ensure client receives game_over event
        setTimeout(() => {
            this.clearGameState(roomId, room.code || null);
            rooms.delete(roomId);
            console.log(`[GameHandler] ✅ Room ${roomId} cleaned up after game_over`);
        }, 2000); // 2 second delay
        
        console.log(`[GameHandler] ✅ Game ended in room ${roomId} - Winner: ${winner.username} (${reason})`);
    }
}

module.exports = GameHandler;
