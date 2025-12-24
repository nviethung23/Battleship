const { body, validationResult } = require('express-validator');

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, ''); // Remove < and > to prevent XSS
};

// Validation middleware for registration
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .customSanitizer(sanitizeString),
    
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Password must be between 6 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
        .optional({ nullable: true }),
    
    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
        .customSanitizer(sanitizeString),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: errors.array()[0].msg 
            });
        }
        next();
    }
];

// Validation middleware for login
const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .customSanitizer(sanitizeString),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: errors.array()[0].msg 
            });
        }
        next();
    }
];

// Sanitize chat messages
const sanitizeChatMessage = (message) => {
    if (typeof message !== 'string') return '';
    // Remove HTML tags and limit length
    return message
        .trim()
        .replace(/<[^>]*>/g, '')
        .substring(0, 200); // Max 200 characters
};

// Sanitize room ID
const sanitizeRoomId = (roomId) => {
    if (typeof roomId !== 'string') return '';
    return roomId.trim().replace(/[^a-zA-Z0-9_]/g, '');
};

// Validation middleware for guest login
const validateGuestLogin = [
    body('guestName')
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage('Guest name must be between 2 and 30 characters')
        .customSanitizer(sanitizeString),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: errors.array()[0].msg 
            });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin,
    validateGuestLogin,
    sanitizeString,
    sanitizeChatMessage,
    sanitizeRoomId
};

