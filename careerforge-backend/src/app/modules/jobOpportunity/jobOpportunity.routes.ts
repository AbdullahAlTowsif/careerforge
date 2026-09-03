import { Router } from "express";
import { JobOpportunityController } from "./jobOpportunity.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", JobOpportunityController.listJobs);
router.get("/recommended", authMiddleware, JobOpportunityController.listJobs);
router.get("/:id", JobOpportunityController.getJobById);

export const JobOpportunityRoutes = router;
