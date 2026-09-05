import { Redis } from "ioredis";
import { env } from "./env.js";

let redisClient: InstanceType<typeof Redis> | null = null;
let redisAvailable = false;
let connectionErrorLogged = false;

export const isRedisConnected = (): boolean => redisAvailable;

export const connectRedis = async (): Promise<void> => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => {
      if (times > 15) return null;
      return Math.min(times * 200, 2000);
    },
    enableReadyCheck: true,
  });

  client.on("ready", () => {
    connectionErrorLogged = false;
    redisClient = client;
    redisAvailable = true;
    console.log("Redis connected successfully");
  });

  client.on("error", (error) => {
    if (!connectionErrorLogged) {
      console.warn(
        "Redis unavailable — caching & Redis rate limiting disabled:",
        error.message
      );
      connectionErrorLogged = true;
    }
    redisClient = null;
    redisAvailable = false;
  });

  client.on("close", () => {
    redisClient = null;
    redisAvailable = false;
  });

  client.on("end", () => {
    redisClient = null;
    redisAvailable = false;
  });

  await new Promise<void>((resolve) => {
    const onFirstSettle = () => {
      client.off("ready", onFirstSettle);
      client.off("error", onFirstSettle);
      resolve();
    };
    client.on("ready", onFirstSettle);
    client.on("error", onFirstSettle);
    client.connect().catch(() => {
      // first-settle is triggered by the "error" event
    });
  });
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.warn("Error while disconnecting Redis:", error);
    }
  }
  redisClient = null;
  redisAvailable = false;
};

export const getRedisClient = (): InstanceType<typeof Redis> | null =>
  redisClient;