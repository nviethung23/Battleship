const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../config/database');
const { sanitizeString } = require('../middleware/validation');
const { GUEST_TTL_HOURS, getGuestExpiresAt } = require('../config/guest');

const register = async (req, res) => {
    try {
        let { username, password, email } = req.body;

        // Sanitize inputs
        username = sanitizeString(username);
        email = email ? sanitizeString(email) : '';

        // Validation (basic checks - express-validator will do detailed validation)
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                error: 'Username must be between 3 and 20 characters' 
            });
        }

        if (password.length < 6 || password.length > 100) {
            return res.status(400).json({ 
                error: 'Password must be between 6 and 100 characters' 
            });
        }

        // Validate username format (alphanumeric and underscore only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ 
                error: 'Username can only contain letters, numbers, and underscores' 
            });
        }

        // Check if user exists
        const existingUser = await Database.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await Database.createUser({
            username,
            email: email || '',
            password: hashedPassword,
            createdAt: new Date()
        });

        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        let { username, password } = req.body;

        // Sanitize username
        username = sanitizeString(username);

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user (Database methods are static)
        const user = await Database.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await Database.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = await Database.getUserStats(user.id);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                isGuest: user.isGuest || false,
                guestDisplayName: user.guestDisplayName || null,
                createdAt: user.createdAt
            },
            stats
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const guestLogin = async (req, res) => {
    try {
        console.log('[Guest Login] Request received:', req.body);
        let { guestName } = req.body;

        // Sanitize input
        guestName = sanitizeString(guestName);

        console.log('[Guest Login] Sanitized name:', guestName);

        // Validation
        if (!guestName || guestName.length < 2) {
            console.log('[Guest Login] Validation failed: name too short');
            return res.status(400).json({ error: 'Guest name must be at least 2 characters' });
        }

        if (guestName.length > 30) {
            console.log('[Guest Login] Validation failed: name too long');
            return res.status(400).json({ error: 'Guest name must not exceed 30 characters' });
        }

        // Create unique guest username
        const timestamp = Date.now();
        const guestUsername = `guest_${timestamp}`;

        console.log('[Guest Login] Creating guest user:', guestUsername);

        // Create guest user in database với TTL từ config
        const user = await Database.createUser({
            username: guestUsername,
            email: `guest_${timestamp}@guest.local`,
            password: 'guest_no_password',
            isGuest: true,
            guestDisplayName: guestName,
            lastSeenAt: new Date(),
            createdAt: new Date(),
            expiresAt: getGuestExpiresAt() // Sử dụng config TTL
        });

        console.log('[Guest Login] Guest user created:', user.id, 'expires in', GUEST_TTL_HOURS, 'hours');

        // Generate token với expiration khớp với TTL
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                guestName: guestName,
                isGuest: true
            },
            process.env.JWT_SECRET,
            { expiresIn: `${GUEST_TTL_HOURS}h` }
        );

        res.status(201).json({
            message: 'Guest login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                guestName: guestName,
                isGuest: true,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login, guestLogin, getProfile };

