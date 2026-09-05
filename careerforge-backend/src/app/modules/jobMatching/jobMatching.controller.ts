import { Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { JobMatchingServices } from "./jobMatching.service.js";
import type { AuthenticatedRequest } from "../auth/auth.interface.js";

const getRecommendedJobs = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await JobMatchingServices.getRecommendedJobs(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recommended jobs fetched successfully",
      data: result,
    });
  }
);

const getRecommendedResources = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await JobMatchingServices.getRecommendedResources(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recommended resources fetched successfully",
      data: result,
    });
  }
);

const getJobMatch = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const jobId = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
    const result = await JobMatchingServices.getJobMatch(userId, jobId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job match analysis fetched successfully",
      data: result,
    });
  }
);

export const JobMatchingController = {
  getRecommendedJobs,
  getRecommendedResources,
  getJobMatch,
};
