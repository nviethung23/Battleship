
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import MongoDB connection
const { connectDB } = require('./config/mongodb');
const { initRedis } = require('./config/redis');

// Import controllers and handlers
const { register, login, guestLogin, getProfile } = require('./controllers/authController');
const { authenticateToken } = require('./middleware/auth');
const { validateRegister, validateLogin, validateGuestLogin } = require('./middleware/validation');
const GameHandler = require('./socket/gameHandler');
const ChatHandler = require('./socket/chatHandler');
const WebRTCHandler = require('./socket/webrtcHandler');

// Import cleanup functions
const { cleanupExpiredGuests, deleteGuestOnDisconnect } = require('./scripts/cleanupGuests');
const { updateGuestActivitySocket } = require('./middleware/guestActivity');
const { GUEST_CLEANUP_INTERVAL_MINUTES } = require('./config/guest');

const app = express();
let server;
const keyPath = process.env.HTTPS_KEY_PATH || path.join(__dirname, '../key.pem');
const certPath = process.env.HTTPS_CERT_PATH || path.join(__dirname, '../cert.pem');
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    server = https.createServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    }, app);
    console.log('[Server] Using HTTPS with certs:', keyPath, certPath);
} else {
    server = http.createServer(app);
    console.warn('[Server] HTTPS certs not found. Falling back to HTTP.');
}
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onerror, onclick, etc.)
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            upgradeInsecureRequests: null, // Disable HTTPS upgrade for HTTP server
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per windowMs (increased for testing)
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per windowMs (increased for testing)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Apply rate limiting to auth routes (only for specific endpoints, not all /api/)
// Don't use app.use() for specific routes as it blocks all methods

// API Routes (PHẢI TRƯỚC static files)
app.post('/api/register', authLimiter, validateRegister, register);
app.post('/api/login', authLimiter, validateLogin, login);
app.post('/api/guest-login', authLimiter, validateGuestLogin, guestLogin);
app.get('/api/profile', authenticateToken, getProfile);

// Admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Static files (PHẢI TRƯỚC các HTML routes để serve CSS/JS/images)
app.use(express.static(path.join(__dirname, '../client')));

// Serve HTML pages (fallback sau static files)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/hub', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/hub.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/lobby.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/game.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
});

// Initialize handlers
const gameHandler = new GameHandler(io);
const chatHandler = new ChatHandler(io);
const webrtcHandler = new WebRTCHandler(io);

// Set gameHandler reference in chatHandler and webrtcHandler for roomId lookup
chatHandler.setGameHandler(gameHandler);
webrtcHandler.setGameHandler(gameHandler);

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = decoded.id;
        socket.username = decoded.username;
        socket.isGuest = decoded.isGuest || false;
        socket.guestName = decoded.guestName || null;
        next();
    });
});

function emitOnlineCount() {
    console.log('[Online] sockets:', io.sockets.sockets.size);
    io.emit('online_count', { count: io.sockets.sockets.size });
}

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);
    emitOnlineCount();

    // Update guest activity on connect
    updateGuestActivitySocket(socket);

    // Send user info
    socket.emit('connected', {
        userId: socket.userId,
        username: socket.username
    });

    // Game events
    socket.on('create_room', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.createRoom(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('join_room', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.joinRoom(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('get_room_list', () => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.getRoomList(socket);
    });

    // ============ QUICK PLAY QUEUE ============
    socket.on('queue:join', () => {
        updateGuestActivitySocket(socket);
        gameHandler.joinQueue(socket, { userId: socket.userId, username: socket.username });
    });

    socket.on('queue:cancel', () => {
        updateGuestActivitySocket(socket);
        gameHandler.cancelQueue(socket, { userId: socket.userId, username: socket.username });
    });
    
    // Add alias for backwards compatibility
    socket.on('queue:leave', () => {
        updateGuestActivitySocket(socket);
        gameHandler.cancelQueue(socket, { userId: socket.userId, username: socket.username });
    });
    
    // Room leave handler
    socket.on('room:leave', () => {
        updateGuestActivitySocket(socket);
        gameHandler.leaveRoom(socket, { userId: socket.userId, username: socket.username });
    });

    // ============ PRIVATE ROOM ============
    socket.on('room:createPrivate', () => {
        updateGuestActivitySocket(socket);
        gameHandler.createPrivateRoom(socket, { userId: socket.userId, username: socket.username });
    });

    socket.on('room:joinPrivate', (data) => {
        updateGuestActivitySocket(socket);
        gameHandler.joinPrivateRoom(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('room:requestInfo', (data) => {
        updateGuestActivitySocket(socket);
        gameHandler.requestRoomInfo(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('lobby:playerReady', (data) => {
        updateGuestActivitySocket(socket);
        gameHandler.lobbyPlayerReady(socket, { ...data, userId: socket.userId, username: socket.username });
    });
    
    socket.on('lobby:characterChanged', (data) => {
        updateGuestActivitySocket(socket);
        gameHandler.lobbyCharacterChanged(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('join_game_room', (data) => {
        console.log('[Server] 🎮 Player joining game room:', data.roomCode, 'socket:', socket.id);
        updateGuestActivitySocket(socket);
        gameHandler.joinGameRoom(socket, { ...data, userId: socket.userId, username: socket.username });
    });

    socket.on('player_ready', (data) => {
        console.log('[Server] 🎯 Received player_ready from socket:', socket.id, 'data:', data);
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.playerReady(socket, { ...data, userId: socket.userId });
    });

    socket.on('character_selected', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.characterSelected(socket, { ...data, userId: socket.userId });
    });

    socket.on('character_locked', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.characterLocked(socket, { ...data, userId: socket.userId });
    });

    socket.on('attack', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        gameHandler.attack(socket, { ...data, userId: socket.userId });
    });

    // Rejoin game after refresh
    socket.on('rejoin_game', (data) => {
        updateGuestActivitySocket(socket);
        gameHandler.rejoinGame(socket, { ...data, userId: socket.userId });
    });

    // Chat events
    socket.on('chat_message', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        chatHandler.sendMessage(socket, { 
            ...data, 
            userId: socket.userId, 
            username: socket.username,
            isGuest: socket.isGuest || false
        });
    });

    socket.on('player_typing', (data) => {
        updateGuestActivitySocket(socket); // Update activity
        chatHandler.playerTyping(socket, { ...data, username: socket.username });
    });

    socket.on('get_chat_history', (data) => {
        updateGuestActivitySocket(socket);
        chatHandler.getChatHistory(socket, data);
    });

    // WebRTC events
    socket.on('webrtc_offer', (data) => {
        webrtcHandler.sendOffer(socket, data);
    });

    socket.on('webrtc_answer', (data) => {
        webrtcHandler.sendAnswer(socket, data);
    });

    socket.on('webrtc_ice_candidate', (data) => {
        webrtcHandler.sendIceCandidate(socket, data);
    });

    socket.on('call_request', (data) => {
        webrtcHandler.callRequest(socket, { 
            ...data, 
            userId: socket.userId,
            username: socket.username 
        });
    });

    socket.on('call_accepted', (data) => {
        webrtcHandler.callAccepted(socket, data);
    });

    socket.on('call_rejected', (data) => {
        webrtcHandler.callRejected(socket, data);
    });

    socket.on('end_call', (data) => {
        webrtcHandler.endCall(socket, data);
    });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.username} (${socket.id})`);
        
        // Handle game disconnect (this sets up grace period for battle)
        const isInGame = await gameHandler.handleDisconnect(socket);
        
        // Nếu là guest và KHÔNG trong game, xóa khỏi database
        // Nếu đang trong game, đợi grace period kết thúc
        if (socket.isGuest && socket.userId && !isInGame) {
            try {
                const { deleteGuestOnDisconnect } = require('./scripts/cleanupGuests');
                await deleteGuestOnDisconnect(socket.userId);
                console.log(`[Disconnect] Deleted guest user: ${socket.guestName || socket.username}`);
            } catch (error) {
                console.error('[Disconnect] Error deleting guest:', error);
            }
        } else if (socket.isGuest && isInGame) {
            console.log(`[Disconnect] Guest ${socket.username} is in game, waiting for reconnect...`);
        }

        emitOnlineCount();
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to MongoDB before starting server
connectDB()
    .then(() => {
        initRedis().catch((error) => {
            console.warn('[Redis] Init skipped:', error.message || error);
        });

        server.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
        });

        // Chạy cleanup guests theo config
        const cleanupIntervalMs = GUEST_CLEANUP_INTERVAL_MINUTES * 60 * 1000;
        setInterval(() => {
            cleanupExpiredGuests();
        }, cleanupIntervalMs);
        
        console.log(`✓ Guest cleanup job scheduled (every ${GUEST_CLEANUP_INTERVAL_MINUTES} minutes)`);

        // Chạy cleanup lần đầu sau 2 phút
        setTimeout(() => {
            cleanupExpiredGuests();
            console.log('[Cleanup] Initial cleanup completed');
        }, 2 * 60 * 1000);
    })
    .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });


