import type { Job } from "./job";
import type { LearningResource } from "./resource";

export interface MatchResult {
  job: Job;
  score: number;
  matchedSkills: string[];
}

export interface ResourceRecommendation {
  resource: LearningResource;
  matchedGaps: string[];
}
