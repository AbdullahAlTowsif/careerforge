import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  loginUserSchema,
  registerUserSchema,
} from "../user/user.validation.js";

const router = Router();

router.post(
  "/register",
  validateRequest(registerUserSchema),
  AuthController.register
);

router.post("/login", validateRequest(loginUserSchema), AuthController.login);

router.post("/refresh", AuthController.refresh);

router.post("/logout", AuthController.logout);

router.get("/me", authMiddleware, AuthController.getMe);

export const AuthRoutes = router;
