import { Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { LearningResourceServices } from "./learningResource.service.js";
import type { AuthenticatedRequest } from "../auth/auth.interface.js";
import type { QueryResourcesInput } from "./learningResource.validation.js";

const listResources = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const filters: QueryResourcesInput = {
    skill: req.query.skill as string | undefined,
  };

  const resources = await LearningResourceServices.listResources(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Resources retrieved successfully",
    data: resources,
  });
});

const getResourceById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const resource = await LearningResourceServices.getResourceById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Resource retrieved successfully",
    data: resource,
  });
});

export const LearningResourceController = {
  listResources,
  getResourceById,
};
