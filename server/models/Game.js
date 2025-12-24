const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true
    },
    player1Id: {
        type: String,
        required: true
    },
    player1Username: {
        type: String,
        required: true
    },
    player1IsGuest: {
        type: Boolean,
        default: false
    },
    player1DisplayName: {
        type: String,
        default: null
    },
    player2Id: {
        type: String,
        required: true
    },
    player2Username: {
        type: String,
        required: true
    },
    player2IsGuest: {
        type: Boolean,
        default: false
    },
    player2DisplayName: {
        type: String,
        default: null
    },
    winnerId: {
        type: String,
        default: null
    },
    winnerUsername: {
        type: String,
        default: null
    },
    duration: {
        type: Number, // milliseconds
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for faster queries
gameSchema.index({ player1Id: 1, player2Id: 1 });
gameSchema.index({ winnerId: 1 });
gameSchema.index({ endedAt: -1 });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;

