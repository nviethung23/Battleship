const { createClient } = require('redis');

let redisClient = null;
let redisReady = false;
let initPromise = null;

function resolveRedisUrl() {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }

    const host = process.env.REDIS_HOST;
    if (!host) {
        return null;
    }

    const port = process.env.REDIS_PORT || '6379';
    const username = process.env.REDIS_USERNAME || 'default';
    const password = process.env.REDIS_PASSWORD;
    const auth = password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

    return `redis://${auth}${host}:${port}`;
}

function isRedisEnabled() {
    return Boolean(resolveRedisUrl());
}

async function initRedis() {
    const url = resolveRedisUrl();
    if (!url) {
        return null;
    }

    if (redisClient && redisReady) {
        return redisClient;
    }

    if (initPromise) {
        return initPromise;
    }

    redisClient = createClient({
        url,
        socket: {
            reconnectStrategy: (retries) => Math.min(retries * 100, 2000)
        }
    });

    redisClient.on('error', (err) => {
        console.warn('[Redis] Error:', err.message || err);
    });

    redisClient.on('ready', () => {
        redisReady = true;
        console.log('[Redis] Connected');
    });

    redisClient.on('end', () => {
        redisReady = false;
        console.warn('[Redis] Connection closed');
    });

    initPromise = redisClient.connect()
        .then(() => redisClient)
        .catch((err) => {
            console.warn('[Redis] Connection failed:', err.message || err);
            return null;
        });

    return initPromise;
}

function getRedisClient() {
    return redisReady ? redisClient : null;
}

function isRedisReady() {
    return redisReady;
}

module.exports = {
    initRedis,
    getRedisClient,
    isRedisEnabled,
    isRedisReady
};
