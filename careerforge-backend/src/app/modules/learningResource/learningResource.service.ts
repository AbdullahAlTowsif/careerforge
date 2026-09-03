import { LearningResource } from "./learningResource.model.js";
import AppError from "../../errorHelpers/AppError.js";
import type { QueryResourcesInput } from "./learningResource.validation.js";

const listResources = async (filters: QueryResourcesInput) => {
  const query: Record<string, unknown> = {};

  if (filters.skill) {
    query.relatedSkills = { $regex: filters.skill, $options: "i" };
  }

  const resources = await LearningResource.find(query).sort({ cost: 1, title: 1 });
  return resources;
};

const getResourceById = async (id: string) => {
  const resource = await LearningResource.findById(id);
  if (!resource) {
    throw new AppError(404, "Resource not found");
  }
  return resource;
};

export const LearningResourceServices = {
  listResources,
  getResourceById,
};
