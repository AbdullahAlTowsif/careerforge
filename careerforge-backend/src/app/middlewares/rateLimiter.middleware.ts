import { NextFunction, Request, Response } from "express";
import {
  RateLimiterRedis,
  RateLimiterMemory,
  RateLimiterRes,
} from "rate-limiter-flexible";
import { getRedisClient, isRedisConnected } from "../config/redis.js";

interface RateLimiterOptions {
  points?: number;
  durationSeconds?: number;
  keyPrefix?: string;
}

const createMemoryLimiter = (options: RateLimiterOptions): RateLimiterMemory =>
  new RateLimiterMemory({
    points: options.points ?? 10,
    duration: options.durationSeconds ?? 60,
  });

const createRateLimiter = (options: RateLimiterOptions = {}) => {
  const { points = 10, durationSeconds = 60, keyPrefix = "rl" } = options;

  const memoryLimiter = createMemoryLimiter(options);
  let redisLimiter: RateLimiterRedis | null = null;

  const getLimiter = () => {
    if (isRedisConnected() && getRedisClient()) {
      if (!redisLimiter) {
        redisLimiter = new RateLimiterRedis({
          storeClient: getRedisClient(),
          keyPrefix,
          points,
          duration: durationSeconds,
          insuranceLimiter: memoryLimiter,
        });
      }
      return redisLimiter;
    }
    return memoryLimiter;
  };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const limiter = getLimiter();

    try {
      await limiter.consume(ip);
      next();
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down and try again later.",
        });
        return;
      }
      next();
    }
  };
};

export const aiRateLimiter = createRateLimiter({
  points: 10,
  durationSeconds: 60,
  keyPrefix: "rl:ai",
});

export default aiRateLimiter;