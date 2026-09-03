import { NextFunction, Response } from "express";
import { verifyAccessToken } from "../config/jwt.js";
import { ACCESS_TOKEN_COOKIE } from "../config/cookie.js";
import AppError from "../errorHelpers/AppError.js";
import { catchAsync } from "../helpers/catchAsync.js";
import type { AuthenticatedRequest } from "../modules/auth/auth.interface.js";

export const authMiddleware = catchAsync(
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

    if (!token) {
      throw new AppError(401, "You are not logged in. Please log in first.");
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new AppError(401, "Invalid or expired access token. Please log in again.");
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  }
);
