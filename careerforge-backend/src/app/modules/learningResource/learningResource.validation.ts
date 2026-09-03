import { z } from "zod";
import { RESOURCE_COSTS } from "./learningResource.constant.js";

export const queryResourcesSchema = z.object({
  skill: z.string().optional(),
});

export const resourceIdParamSchema = z.object({
  id: z.string().min(1, "Resource ID is required"),
});

export const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  platform: z.string().min(1).max(100),
  url: z.url("Please provide a valid URL"),
  relatedSkills: z.array(z.string().min(1).max(50)).optional(),
  cost: z.enum(RESOURCE_COSTS),
});

export type QueryResourcesInput = z.infer<typeof queryResourcesSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
