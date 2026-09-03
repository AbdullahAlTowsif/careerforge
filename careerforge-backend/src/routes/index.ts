import { Router } from "express";
import { AuthRoutes } from "../app/modules/auth/auth.routes.js";
import { UserRoutes } from "../app/modules/user/user.routes.js";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/profile", UserRoutes);

export default router;
