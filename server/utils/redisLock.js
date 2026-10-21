import Redis from 'ioredis';

// In-memory fallback map for zero-dependency local development or when Redis daemon isn't running
const memoryLocks = new Map(); // key: `res:${eventId}:${userId}` -> { expiresAt: timestamp, eventId, userId }

let redisClient = null;
let isRedisConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) return null; // stop reconnect spam if Redis daemon not active
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    isRedisConnected = true;
    console.log('⚡ Connected to Redis instance for distributed seat locking & concurrency control.');
  }).catch((err) => {
    isRedisConnected = false;
    console.log(`ℹ️ External Redis not detected (${err.message}). Using resilient in-memory concurrency lock manager.`);
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
  });
} catch (e) {
  isRedisConnected = false;
  console.log('ℹ️ Running in-memory concurrency lock manager.');
}

/**
 * Clean up expired memory locks periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of memoryLocks.entries()) {
    if (val.expiresAt <= now) {
      memoryLocks.delete(key);
    }
  }
}, 5000);

/**
 * Get count of active held seats for an event
 */
export async function getActiveHoldCount(eventId) {
  const now = Date.now();
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(`lock:event:${eventId}:*`);
      return keys.length;
    } catch (e) {
      // Fallback
    }
  }

  // Memory fallback
  let count = 0;
  for (const [key, val] of memoryLocks.entries()) {
    if (val.eventId === eventId && val.expiresAt > now) {
      count++;
    }
  }
  return count;
}

/**
 * Reserve a seat with TTL (10 minutes default = 600 seconds)
 * Returns { success: boolean, expiresAt: number, remainingSeconds: number, reason?: string }
 */
export async function reserveSeatLock(eventId, userId, holdSeconds = 600) {
  const lockKey = `lock:event:${eventId}:${userId}`;
  const now = Date.now();
  const expiresAt = now + holdSeconds * 1000;

  if (isRedisConnected && redisClient) {
    try {
      // SET key value EX holdSeconds NX (Only set if not already set)
      const result = await redisClient.set(lockKey, JSON.stringify({ eventId, userId, expiresAt }), 'EX', holdSeconds, 'NX');
      if (!result) {
        // Already holds a lock, extend or return existing
        const existingVal = await redisClient.get(lockKey);
        if (existingVal) {
          const parsed = JSON.parse(existingVal);
          const ttl = await redisClient.ttl(lockKey);
          return {
            success: true,
            alreadyHeld: true,
            expiresAt: parsed.expiresAt,
            remainingSeconds: ttl > 0 ? ttl : holdSeconds
          };
        }
      }
      return {
        success: true,
        expiresAt,
        remainingSeconds: holdSeconds
      };
    } catch (e) {
      // Fallback to memory
    }
  }

  // In-memory atomic lock
  const existing = memoryLocks.get(lockKey);
  if (existing && existing.expiresAt > now) {
    const remainingSeconds = Math.max(1, Math.round((existing.expiresAt - now) / 1000));
    return {
      success: true,
      alreadyHeld: true,
      expiresAt: existing.expiresAt,
      remainingSeconds
    };
  }

  memoryLocks.set(lockKey, { expiresAt, eventId, userId });
  return {
    success: true,
    expiresAt,
    remainingSeconds: holdSeconds
  };
}

/**
 * Verify if user currently holds an active reservation lock
 */
export async function verifySeatLock(eventId, userId) {
  const lockKey = `lock:event:${eventId}:${userId}`;
  const now = Date.now();

  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get(lockKey);
      if (val) {
        const ttl = await redisClient.ttl(lockKey);
        return { held: true, remainingSeconds: Math.max(0, ttl) };
      }
      return { held: false, remainingSeconds: 0 };
    } catch (e) {}
  }

  const existing = memoryLocks.get(lockKey);
  if (existing && existing.expiresAt > now) {
    const remainingSeconds = Math.max(1, Math.round((existing.expiresAt - now) / 1000));
    return { held: true, remainingSeconds };
  }
  return { held: false, remainingSeconds: 0 };
}

/**
 * Release / Clear seat lock
 */
export async function releaseSeatLock(eventId, userId) {
  const lockKey = `lock:event:${eventId}:${userId}`;

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(lockKey);
    } catch (e) {}
  }

  memoryLocks.delete(lockKey);
  return true;
}

export function isRedisActive() {
  return isRedisConnected;
}
