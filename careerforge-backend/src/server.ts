import { Server } from "http";
import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./app/config/env.js";
import { connectDB } from "./app/config/db.js";
import { connectRedis, disconnectRedis } from "./app/config/redis.js";

async function startServer(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();

    const server: Server = app.listen(env.PORT, () => {
      console.log(`🚀 Server is running on PORT ${env.PORT}`);
    });

    // Graceful shutdown on unhandled rejections / uncaught exceptions
    process.on("unhandledRejection", (error) => {
      console.error("Unhandled Rejection detected:", error);
      if (server) {
        server.close(() => {
          disconnectRedis();
          mongoose.connection.close();
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception detected:", error);
      process.exit(1);
    });

    // SIGINT/SIGTERM graceful shutdown
    const shutdown = () => {
      console.log("Shutting down...");
      server.close(() => {
        disconnectRedis();
        mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
