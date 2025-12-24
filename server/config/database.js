const User = require('../models/User');
const Game = require('../models/Game');
const { extendGuestExpiry } = require('./guest');

// Database class - MongoDB implementation
// Giữ nguyên interface để không phải sửa code khác
class Database {
    // USER OPERATIONS
    static async getUsers() {
        try {
            const users = await User.find({}).lean();
            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    static async findUserByUsername(username) {
        try {
            const user = await User.findOne({ username }).lean();
            if (!user) return null;
            
            // Convert _id to id for backward compatibility
            return {
                id: user._id.toString(),
                _id: user._id,
                username: user.username,
                email: user.email,
                password: user.password,
                role: user.role || 'user',
                isGuest: user.isGuest || false,
                guestDisplayName: user.guestDisplayName || null,
                expiresAt: user.expiresAt || null,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            };
        } catch (error) {
            console.error('Error finding user by username:', error);
            return null;
        }
    }

    static async findUserById(id) {
        try {
            const user = await User.findById(id).lean();
            if (!user) return null;
            
            // Convert _id to id for backward compatibility
            return {
                id: user._id.toString(),
                _id: user._id,
                username: user.username,
                email: user.email,
                password: user.password,
                role: user.role || 'user',
                isGuest: user.isGuest || false,
                guestDisplayName: user.guestDisplayName || null,
                expiresAt: user.expiresAt || null,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            };
        } catch (error) {
            console.error('Error finding user by id:', error);
            return null;
        }
    }

    static async createUser(userData) {
        try {
            // Convert id to _id for MongoDB compatibility
            const user = new User({
                username: userData.username,
                email: userData.email || '',
                password: userData.password,
                isGuest: userData.isGuest || false,
                guestDisplayName: userData.guestDisplayName || null,
                expiresAt: userData.expiresAt || null,
                createdAt: userData.createdAt || new Date()
            });
            
            const savedUser = await user.save();
            
            // Convert _id to id for backward compatibility
            return {
                id: savedUser._id.toString(),
                _id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                password: savedUser.password,
                role: savedUser.role || 'user',
                isGuest: savedUser.isGuest || false,
                guestDisplayName: savedUser.guestDisplayName || null,
                expiresAt: savedUser.expiresAt || null,
                createdAt: savedUser.createdAt
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // GAME OPERATIONS
    static async getGames() {
        try {
            const games = await Game.find({}).lean();
            return games.map(game => ({
                id: game._id.toString(),
                roomId: game.roomId,
                player1Id: game.player1Id,
                player1Username: game.player1Username,
                player2Id: game.player2Id,
                player2Username: game.player2Username,
                winnerId: game.winnerId,
                winnerUsername: game.winnerUsername,
                duration: game.duration,
                endedAt: game.endedAt
            }));
        } catch (error) {
            console.error('Error getting games:', error);
            return [];
        }
    }

    static async createGame(gameData) {
        try {
            const game = new Game({
                roomId: gameData.roomId || gameData.id,
                player1Id: gameData.player1Id,
                player1Username: gameData.player1Username,
                player1IsGuest: gameData.player1IsGuest || false,
                player1DisplayName: gameData.player1DisplayName || null,
                player2Id: gameData.player2Id,
                player2Username: gameData.player2Username,
                player2IsGuest: gameData.player2IsGuest || false,
                player2DisplayName: gameData.player2DisplayName || null,
                winnerId: gameData.winnerId || null,
                winnerUsername: gameData.winnerUsername || null,
                duration: gameData.duration || 0,
                startedAt: gameData.startTime ? new Date(gameData.startTime) : new Date(),
                endedAt: gameData.endedAt ? new Date(gameData.endedAt) : null
            });
            
            const savedGame = await game.save();
            
            // Convert _id to id for backward compatibility
            return {
                id: savedGame._id.toString(),
                roomId: savedGame.roomId,
                player1Id: savedGame.player1Id,
                player1Username: savedGame.player1Username,
                player1IsGuest: savedGame.player1IsGuest,
                player1DisplayName: savedGame.player1DisplayName,
                player2Id: savedGame.player2Id,
                player2Username: savedGame.player2Username,
                player2IsGuest: savedGame.player2IsGuest,
                player2DisplayName: savedGame.player2DisplayName,
                winnerId: savedGame.winnerId,
                winnerUsername: savedGame.winnerUsername,
                duration: savedGame.duration,
                endedAt: savedGame.endedAt
            };
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    static async getGamesByUserId(userId) {
        try {
            const games = await Game.find({
                $or: [
                    { player1Id: userId },
                    { player2Id: userId }
                ]
            }).lean();
            
            return games.map(game => ({
                id: game._id.toString(),
                roomId: game.roomId,
                player1Id: game.player1Id,
                player1Username: game.player1Username,
                player2Id: game.player2Id,
                player2Username: game.player2Username,
                winnerId: game.winnerId,
                winnerUsername: game.winnerUsername,
                duration: game.duration,
                endedAt: game.endedAt
            }));
        } catch (error) {
            console.error('Error getting games by user id:', error);
            return [];
        }
    }

    static async getUserStats(userId) {
        try {
            const games = await this.getGamesByUserId(userId);
            const wins = games.filter(g => g.winnerId === userId).length;
            const losses = games.filter(g => g.winnerId && g.winnerId !== userId).length;
            
            return {
                totalGames: games.length,
                wins,
                losses,
                winRate: games.length > 0 ? ((wins / games.length) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                totalGames: 0,
                wins: 0,
                losses: 0,
                winRate: 0
            };
        }
    }

    /**
     * Lấy tất cả guest users đã hết hạn
     */
    async getExpiredGuests() {
        try {
            const now = new Date();
            return await this.db.collection('users').find({
                isGuest: true,
                expiresAt: { $lt: now }
            }).toArray();
        } catch (error) {
            console.error('Get expired guests error:', error);
            return [];
        }
    }

    /**
     * Xóa user theo ID
     */
    async deleteUserById(userId) {
        try {
            const ObjectId = require('mongodb').ObjectId;
            const result = await this.db.collection('users').deleteOne({
                _id: new ObjectId(userId)
            });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }

    /**
     * Xóa tất cả guest của user khi logout
     */
    async deleteGuestUser(userId) {
        try {
            const ObjectId = require('mongodb').ObjectId;
            const user = await this.db.collection('users').findOne({
                _id: new ObjectId(userId),
                isGuest: true
            });

            if (user) {
                await this.db.collection('users').deleteOne({
                    _id: new ObjectId(userId)
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete guest user error:', error);
            throw error;
        }
    }

    /**
     * Lấy tất cả guest users đã hết hạn (static method)
     */
    static async getExpiredGuests() {
        try {
            const now = new Date();
            const expiredGuests = await User.find({
                isGuest: true,
                expiresAt: { $lt: now, $ne: null }
            }).lean();
            return expiredGuests;
        } catch (error) {
            console.error('Get expired guests error:', error);
            return [];
        }
    }

    /**
     * Xóa user theo ID (static method)
     */
    static async deleteUserById(userId) {
        try {
            const result = await User.deleteOne({
                _id: userId
            });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }

    /**
     * Update guest activity (lastSeenAt và gia hạn expiresAt)
     */
    static async updateGuestActivity(userId) {
        try {
            const now = new Date();
            const newExpiresAt = extendGuestExpiry();
            
            await User.updateOne(
                { 
                    _id: userId,
                    isGuest: true
                },
                {
                    $set: {
                        lastSeenAt: now,
                        expiresAt: newExpiresAt
                    }
                }
            );
            return true;
        } catch (error) {
            console.error('Update guest activity error:', error);
            return false;
        }
    }

    /**
     * Đếm số lượng guest hiện tại
     */
    static async countGuests() {
        try {
            return await User.countDocuments({
                isGuest: true
            });
        } catch (error) {
            console.error('Count guests error:', error);
            return 0;
        }
    }
}

module.exports = Database;

