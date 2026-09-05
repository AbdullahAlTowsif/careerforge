import { getRedisClient, isRedisConnected } from "../config/redis.js";

const CACHE_PREFIX = "careerforge:";

const formatKey = (key: string): string =>
  key.startsWith(CACHE_PREFIX) ? key : `${CACHE_PREFIX}${key}`;

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isRedisConnected()) return null;
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get(formatKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Redis getCache error for key "${key}":`, error);
    return null;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> => {
  if (!isRedisConnected()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(formatKey(key), JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error(`Redis setCache error for key "${key}":`, error);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isRedisConnected()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(formatKey(key));
  } catch (error) {
    console.error(`Redis deleteCache error for key "${key}":`, error);
  }
};

export const invalidatePattern = async (pattern: string): Promise<void> => {
  if (!isRedisConnected()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error(`Redis invalidatePattern error for pattern "${pattern}":`, error);
  }
};