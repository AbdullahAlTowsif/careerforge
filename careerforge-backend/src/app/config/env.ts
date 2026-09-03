import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/career-platform",
  JWT_SECRET: process.env.JWT_SECRET || "change-me",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "change-me-too",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || "",
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
  SSLCOMMERZ_IS_LIVE: process.env.SSLCOMMERZ_IS_LIVE === "true",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  SENTRY_DSN: process.env.SENTRY_DSN || "",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;
