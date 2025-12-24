const mongoose = require('mongoose');
require('dotenv').config();

async function getStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const Game = require('./server/models/Game');
        const User = require('./server/models/User');
        const ChatMessage = require('./server/models/ChatMessage');
        const CallLog = require('./server/models/CallLog');

        const totalUsers = await User.countDocuments();
        const totalGames = await Game.countDocuments();
        const totalChats = await ChatMessage.countDocuments();
        const totalCalls = await CallLog.countDocuments();
        
        const avgDurationResult = await Game.aggregate([
            { $match: { duration: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: '$duration' } } }
        ]);

        const stats = {
            users: totalUsers,
            games: totalGames,
            chats: totalChats,
            calls: totalCalls,
            avgDurationSeconds: avgDurationResult[0] ? Math.round(avgDurationResult[0].avg / 1000) : 0
        };

        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getStats();
