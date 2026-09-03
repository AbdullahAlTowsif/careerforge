import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import router from "./routes/index.js";
import globalErrorHandler from "./app/errorHelpers/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";
import { env } from "./app/config/env.js";

const app: Application = express();

// Security headers
app.use(helmet());

// CORS - allow the Next.js origin with credentials
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    credentials: true,
  })
);

// Request logging in dev
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Parse JSON + cookies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.send("CareerForge API is running");
});

// API routes
app.use("/api", router);

// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

export default app;
