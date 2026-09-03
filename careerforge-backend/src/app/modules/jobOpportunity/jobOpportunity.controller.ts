import { Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { JobOpportunityServices } from "./jobOpportunity.service.js";
import type { AuthenticatedRequest } from "../auth/auth.interface.js";
import type { QueryJobsInput } from "./jobOpportunity.validation.js";

const listJobs = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const filters: QueryJobsInput = {
    track: req.query.track as QueryJobsInput["track"],
    location: req.query.location as string | undefined,
    type: req.query.type as QueryJobsInput["type"],
    search: req.query.search as string | undefined,
  };

  const jobs = await JobOpportunityServices.listJobs(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Jobs retrieved successfully",
    data: jobs,
  });
});

const getJobById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const job = await JobOpportunityServices.getJobById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Job retrieved successfully",
    data: job,
  });
});

export const JobOpportunityController = {
  listJobs,
  getJobById,
};
