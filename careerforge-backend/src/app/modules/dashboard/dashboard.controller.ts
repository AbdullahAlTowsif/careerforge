import { Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { DashboardServices } from "./dashboard.service.js";
import type { AuthenticatedRequest } from "../auth/auth.interface.js";

const getDashboardData = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const data = await DashboardServices.getDashboardData(req.user!.userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dashboard data retrieved successfully",
      data,
    });
  }
);

export const DashboardController = { getDashboardData };
