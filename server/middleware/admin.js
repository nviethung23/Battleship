const Database = require('../config/database');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        // req.user is set by authenticateToken middleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user from database to check role
        const user = await Database.findUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // User is admin, proceed
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { isAdmin };

