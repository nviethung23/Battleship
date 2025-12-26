const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../config/database');
const { sanitizeString } = require('../middleware/validation');
const { GUEST_TTL_HOURS, getGuestExpiresAt } = require('../config/guest');

const register = async (req, res) => {
  try {
    // ĐỪNG log password
    console.log('[Register] Incoming:', { username: req.body?.username, hasEmail: !!req.body?.email });

    let { username, password, email } = req.body;

    username = sanitizeString(username);
    email = email ? sanitizeString(email) : '';

    const validationErrors = {};

    if (!username) validationErrors.username = 'Username is required';
    if (!password) validationErrors.password = 'Password is required';

    if (username) {
      if (username.length < 3 || username.length > 20) {
        validationErrors.username = 'Username must be between 3 and 20 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        validationErrors.username = 'Username can only contain letters, numbers, and underscores';
      }
    }

    // Email optional nhưng nếu có thì check format
    if (email) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) validationErrors.email = 'Invalid email format';
    }

    if (password) {
      if (password.length < 6 || password.length > 100) {
        validationErrors.password = 'Password must be between 6 and 100 characters';
      } else if (!/(?=.*[a-z])/.test(password) || !/(?=.*[A-Z])/.test(password) || !/(?=.*\d)/.test(password)) {
        validationErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        errors: Object.entries(validationErrors).map(([field, message]) => ({ field, message }))
      });
    }

    const existingUser = await Database.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        error: "Validation failed",
        errors: [{ field: "username", message: "Username already exists" }]
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Database.createUser({
      username,
      email: email || '',
      password: hashedPassword,
      createdAt: new Date()
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role || 'user' }
    });
  } catch (error) {
    console.error('Register error:', error?.message || error);
    if (error?.stack) console.error(error.stack);

    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({ error: isDev ? (error.message || 'Internal server error') : 'Internal server error' });
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

