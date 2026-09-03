import { Router } from "express";
import { AuthRoutes } from "../app/modules/auth/auth.routes.js";
import { UserRoutes } from "../app/modules/user/user.routes.js";
import { JobOpportunityRoutes } from "../app/modules/jobOpportunity/jobOpportunity.routes.js";
import { LearningResourceRoutes } from "../app/modules/learningResource/learningResource.routes.js";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/profile", UserRoutes);
router.use("/jobs", JobOpportunityRoutes);
router.use("/resources", LearningResourceRoutes);

export default router;
