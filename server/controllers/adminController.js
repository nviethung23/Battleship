const Database = require('../config/database');

// Get all users (with stats in one query)
const getAllUsers = async (req, res) => {
    try {
        const users = await Database.getUsers();
        
        // Get all stats in parallel
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const userId = user._id || user.id;
            let stats = { totalGames: 0, wins: 0, losses: 0, winRate: 0 };
            
            try {
                stats = await Database.getUserStats(userId.toString());
            } catch (e) {
                // Keep default stats if error
            }
            
            return {
                id: userId,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                createdAt: user.createdAt,
                stats: stats
            };
        }));

        res.json({
            success: true,
            count: usersWithStats.length,
            users: usersWithStats
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Database.findUserById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        const stats = await Database.getUserStats(id);

        res.json({
            success: true,
            user: {
                id: user._id || user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                createdAt: user.createdAt
            },
            stats
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await Database.findUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete user (need to add delete method to Database)
        const User = require('../models/User');
        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update user role
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
        }

        // Don't allow demoting yourself
        if (id === req.user.id && role === 'user') {
            return res.status(400).json({ error: 'Cannot demote your own admin role' });
        }

        const User = require('../models/User');
        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all games
const getAllGames = async (req, res) => {
    try {
        const games = await Database.getGames();
        
        res.json({
            success: true,
            count: games.length,
            games: games
        });
    } catch (error) {
        console.error('Get all games error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get game by ID
const getGameById = async (req, res) => {
    try {
        const { id } = req.params;
        const Game = require('../models/Game');
        const game = await Game.findById(id).lean();

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({
            success: true,
            game: {
                id: game._id.toString(),
                roomId: game.roomId,
                player1Id: game.player1Id,
                player1Username: game.player1Username,
                player2Id: game.player2Id,
                player2Username: game.player2Username,
                winnerId: game.winnerId,
                winnerUsername: game.winnerUsername,
                duration: game.duration,
                startedAt: game.startedAt,
                endedAt: game.endedAt,
                createdAt: game.createdAt
            }
        });
    } catch (error) {
        console.error('Get game by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete game
const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;
        const Game = require('../models/Game');
        
        const game = await Game.findByIdAndDelete(id);
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({
            success: true,
            message: 'Game deleted successfully'
        });
    } catch (error) {
        console.error('Delete game error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get statistics
const getStatistics = async (req, res) => {
    try {
        const User = require('../models/User');
        const Game = require('../models/Game');

        // Total users
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalRegularUsers = totalUsers - totalAdmins;

        // Total games
        const totalGames = await Game.countDocuments();
        
        // Games today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const gamesToday = await Game.countDocuments({
            createdAt: { $gte: today }
        });

        // Games last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const gamesLast7Days = await Game.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        // Average game duration
        const avgDurationResult = await Game.aggregate([
            { $match: { duration: { $gt: 0 } } },
            { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
        ]);
        const avgDuration = avgDurationResult.length > 0 
            ? Math.round(avgDurationResult[0].avgDuration / 1000) // Convert to seconds
            : 0;

        // Top 10 players by wins (include deleted guests)
        const topPlayers = await Game.aggregate([
            { $match: { winnerId: { $ne: null }, winnerUsername: { $ne: null } } },
            { $group: { 
                _id: '$winnerId', 
                wins: { $sum: 1 }, 
                username: { $first: '$winnerUsername' },
                isGuest: { $first: '$player1IsGuest' } // fallback indicator
            } },
            { $sort: { wins: -1 } },
            { $limit: 10 }
        ]);

        // Games per day (last 7 days)
        const gamesPerDay = await Game.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    admins: totalAdmins,
                    regular: totalRegularUsers
                },
                games: {
                    total: totalGames,
                    today: gamesToday,
                    last7Days: gamesLast7Days,
                    avgDurationSeconds: avgDuration
                },
                topPlayers: topPlayers.map(p => ({
                    userId: p._id,
                    username: p.username,
                    wins: p.wins
                })),
                gamesPerDay: gamesPerDay.map(g => ({
                    date: g._id,
                    count: g.count
                }))
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    deleteUser,
    updateUserRole,
    getAllGames,
    getGameById,
    deleteGame,
    getStatistics
};

