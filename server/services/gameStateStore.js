const { initRedis } = require('../config/redis');

const DEFAULT_TTL_SECONDS = 2 * 60 * 60;
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'battleship';

function getTtlSeconds() {
    const envValue = parseInt(process.env.GAME_STATE_TTL_SECONDS, 10);
    if (Number.isFinite(envValue) && envValue > 0) {
        return envValue;
    }
    return DEFAULT_TTL_SECONDS;
}

function gameKey(roomId) {
    return `${KEY_PREFIX}:game:${roomId}`;
}

function roomCodeKey(roomCode) {
    return `${KEY_PREFIX}:roomCode:${roomCode}`;
}

function serializePlayer(player) {
    if (!player) return null;

    return {
        userId: player.userId,
        username: player.username,
        characterId: player.characterId,
        ships: Array.isArray(player.ships) ? player.ships : [],
        board: Array.isArray(player.board) ? player.board : [],
        attackedCells: Array.isArray(player.attackedCells) ? player.attackedCells : [],
        disconnectCount: player.disconnectCount || 0,
        timeoutCount: player.timeoutCount || 0,
        turnTimeLimit: player.turnTimeLimit || null,
        isGuest: player.isGuest || false,
        guestDisplayName: player.guestDisplayName || null,
        displayName: player.displayName || null
    };
}

function serializeGame(game) {
    if (!game || !game.roomId || !game.player1 || !game.player2) {
        return null;
    }

    return {
        version: 1,
        roomId: game.roomId,
        roomCode: game.roomCode || null,
        currentTurn: game.currentTurn,
        startTime: game.startTime,
        turnStartTime: game.turnStartTime,
        turnTimeLimit: game.turnTimeLimit || 60000,
        turnTimeRemaining: game.turnTimeRemaining || null,
        player1: serializePlayer(game.player1),
        player2: serializePlayer(game.player2),
        updatedAt: Date.now()
    };
}

function normalizePlayer(player) {
    if (!player || !player.userId) {
        return null;
    }

    return {
        userId: player.userId,
        username: player.username,
        characterId: player.characterId,
        ships: Array.isArray(player.ships) ? player.ships : [],
        board: Array.isArray(player.board) ? player.board : [],
        attackedCells: Array.isArray(player.attackedCells) ? player.attackedCells : [],
        disconnectCount: player.disconnectCount || 0,
        timeoutCount: player.timeoutCount || 0,
        turnTimeLimit: player.turnTimeLimit || null,
        isGuest: player.isGuest || false,
        guestDisplayName: player.guestDisplayName || null,
        displayName: player.displayName || null
    };
}

function normalizeGame(payload) {
    if (!payload || !payload.roomId || !payload.player1 || !payload.player2) {
        return null;
    }

    const player1 = normalizePlayer(payload.player1);
    const player2 = normalizePlayer(payload.player2);

    if (!player1 || !player2) {
        return null;
    }

    return {
        roomId: payload.roomId,
        roomCode: payload.roomCode || null,
        currentTurn: payload.currentTurn,
        startTime: payload.startTime || Date.now(),
        turnStartTime: payload.turnStartTime || payload.startTime || Date.now(),
        turnTimeLimit: payload.turnTimeLimit || 60000,
        turnTimeRemaining: payload.turnTimeRemaining || null,
        player1,
        player2
    };
}

async function saveGameState(game) {
    const payload = serializeGame(game);
    if (!payload) {
        return false;
    }

    const client = await initRedis();
    if (!client) {
        return false;
    }

    try {
        const ttl = getTtlSeconds();
        const value = JSON.stringify(payload);
        await client.set(gameKey(payload.roomId), value, { EX: ttl });

        if (payload.roomCode && payload.roomCode !== payload.roomId) {
            await client.set(roomCodeKey(payload.roomCode), payload.roomId, { EX: ttl });
        }
        return true;
    } catch (error) {
        return false;
    }
}

async function loadGameStateByRoomId(roomId) {
    if (!roomId) {
        return null;
    }

    const client = await initRedis();
    if (!client) {
        return null;
    }

    try {
        const raw = await client.get(gameKey(roomId));
        if (!raw) {
            return null;
        }

        const payload = JSON.parse(raw);
        return normalizeGame(payload);
    } catch (error) {
        return null;
    }
}

async function loadGameStateByIdentifier(identifier) {
    const direct = await loadGameStateByRoomId(identifier);
    if (direct) {
        return { game: direct, roomId: direct.roomId };
    }

    const client = await initRedis();
    if (!client) {
        return null;
    }

    try {
        const roomId = await client.get(roomCodeKey(identifier));
        if (!roomId) {
            return null;
        }

        const game = await loadGameStateByRoomId(roomId);
        if (!game) {
            return null;
        }

        return { game, roomId };
    } catch (error) {
        return null;
    }
}

async function removeGameState(roomId, roomCode) {
    const client = await initRedis();
    if (!client) {
        return false;
    }

    const keys = [];
    if (roomId) {
        keys.push(gameKey(roomId));
    }
    if (roomCode && roomCode !== roomId) {
        keys.push(roomCodeKey(roomCode));
    }

    if (!keys.length) {
        return false;
    }

    try {
        await client.del(keys);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    saveGameState,
    loadGameStateByIdentifier,
    removeGameState
};
