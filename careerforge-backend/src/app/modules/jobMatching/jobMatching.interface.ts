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
