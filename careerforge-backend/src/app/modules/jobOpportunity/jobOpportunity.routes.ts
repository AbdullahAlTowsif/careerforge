import { Router } from "express";
import { JobOpportunityController } from "./jobOpportunity.controller.js";
import { JobMatchingController } from "../jobMatching/jobMatching.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { aiRateLimiter } from "../../middlewares/rateLimiter.middleware.js";

const router = Router();

router.get("/", JobOpportunityController.listJobs);
router.get("/recommended", authMiddleware, JobMatchingController.getRecommendedJobs);
router.get(
  "/:id/match",
  authMiddleware,
  aiRateLimiter,
  JobMatchingController.getJobMatch
);
router.get("/:id", JobOpportunityController.getJobById);

export const JobOpportunityRoutes = router;