import { Schema, model } from "mongoose";
import { IJobOpportunity } from "./jobOpportunity.interface.js";
import { JOB_TYPES } from "./jobOpportunity.constant.js";
import { EXPERIENCE_LEVELS, PREFERRED_TRACKS } from "../user/user.constant.js";

const externalLinksSchema = new Schema(
  {
    linkedin: { type: String, trim: true },
    bdjobs: { type: String, trim: true },
    glassdoor: { type: String, trim: true },
  },
  { _id: false }
);

const jobOpportunitySchema = new Schema<IJobOpportunity>({
  title: {
    type: String,
    required: [true, "Job title is required"],
    trim: true,
  },
  company: {
    type: String,
    required: [true, "Company name is required"],
    trim: true,
  },
  location: {
    type: String,
    required: [true, "Location is required"],
    trim: true,
  },
  requiredSkills: {
    type: [String],
    default: [],
  },
  experienceLevel: {
    type: String,
    enum: EXPERIENCE_LEVELS,
    required: [true, "Experience level is required"],
  },
  type: {
    type: String,
    enum: JOB_TYPES,
    required: [true, "Job type is required"],
  },
  track: {
    type: String,
    enum: PREFERRED_TRACKS,
    required: [true, "Track is required"],
  },
  description: {
    type: String,
    required: [true, "Job description is required"],
  },
  externalLinks: {
    type: externalLinksSchema,
    default: () => ({}),
  },
});

export const JobOpportunity = model<IJobOpportunity>(
  "JobOpportunity",
  jobOpportunitySchema
);
