const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const {
    getAllUsers,
    getUserById,
    deleteUser,
    updateUserRole,
    getAllGames,
    getGameById,
    deleteGame,
    getStatistics
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(isAdmin);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

// Game management
router.get('/games', getAllGames);
router.get('/games/:id', getGameById);
router.delete('/games/:id', deleteGame);

// Statistics
router.get('/stats', getStatistics);

module.exports = router;

