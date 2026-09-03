import { Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { UserServices } from "./user.service.js";
import type { AuthenticatedRequest } from "../auth/auth.interface.js";

const getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserServices.getProfile(req.user!.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile retrieved successfully",
    data: user,
  });
});

const updateProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserServices.updateProfile(req.user!.userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

export const UserController = {
  getProfile,
  updateProfile,
};
