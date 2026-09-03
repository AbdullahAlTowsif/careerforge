import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { updateUserSchema } from "./user.validation.js";
import { UserController } from "./user.controller.js";

const router = Router();

router.get("/", authMiddleware, UserController.getProfile);
router.put(
  "/",
  authMiddleware,
  validateRequest(updateUserSchema),
  UserController.updateProfile
);

export const UserRoutes = router;
