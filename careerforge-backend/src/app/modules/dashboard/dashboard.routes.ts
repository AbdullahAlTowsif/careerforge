import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

const router = Router();

router.get("/", authMiddleware, DashboardController.getDashboardData);

export const DashboardRoutes = router;
