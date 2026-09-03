import { z } from "zod";
import { JOB_TYPES } from "./jobOpportunity.constant.js";
import { EXPERIENCE_LEVELS, PREFERRED_TRACKS } from "../user/user.constant.js";

export const queryJobsSchema = z.object({
  track: z.enum(PREFERRED_TRACKS).optional(),
  location: z.string().optional(),
  type: z.enum(JOB_TYPES).optional(),
  search: z.string().optional(),
});

export const jobIdParamSchema = z.object({
  id: z.string().min(1, "Job ID is required"),
});

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().min(1).max(100),
  requiredSkills: z.array(z.string().min(1).max(50)).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  type: z.enum(JOB_TYPES),
  track: z.enum(PREFERRED_TRACKS),
  description: z.string().min(1).max(10000),
  externalLinks: z
    .object({
      linkedin: z.url().optional(),
      bdjobs: z.url().optional(),
      glassdoor: z.url().optional(),
    })
    .optional(),
});

export type QueryJobsInput = z.infer<typeof queryJobsSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
