import { Types } from "mongoose";
import { IJobOpportunity } from "../jobOpportunity/jobOpportunity.interface.js";
import { ILearningResource } from "../learningResource/learningResource.interface.js";

export interface IMatchResult {
  job: IJobOpportunity;
  score: number;
  matchedSkills: string[];
}

export interface IResourceRecommendation {
  resource: ILearningResource;
  matchedGaps: string[];
}

export interface IMatchBreakdown {
  skillOverlap: number;
  experienceAlignment: number;
  trackAlignment: number;
}

export interface ILearningLinkResource {
  _id: Types.ObjectId;
  title: string;
  platform: string;
  url: string;
  cost: "Free" | "Paid";
}

export interface ILearningLink {
  skill: string;
  resources: ILearningLinkResource[];
}

export interface IJobMatchResult {
  job: IJobOpportunity;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: IMatchBreakdown;
  reasons: string[];
  learningLinks: ILearningLink[];
}
