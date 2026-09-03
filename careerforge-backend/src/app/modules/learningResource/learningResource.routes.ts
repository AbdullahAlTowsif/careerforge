import { Router } from "express";
import { LearningResourceController } from "./learningResource.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", LearningResourceController.listResources);
router.get("/recommended", authMiddleware, LearningResourceController.listResources);
router.get("/:id", LearningResourceController.getResourceById);

export const LearningResourceRoutes = router;
