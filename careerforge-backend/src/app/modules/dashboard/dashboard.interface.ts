import type { IMatchResult, IResourceRecommendation } from "../jobMatching/jobMatching.interface.js";

export interface IDashboardProfile {
  fullName: string;
  email: string;
  skillsCount: number;
  topSkills: string[];
  track: string | null;
  experienceLevel: string | null;
  educationLevel: string | null;
}

export interface IDashboardStats {
  totalJobs: number;
  totalResources: number;
  averageMatchScore: number;
}

export interface IDashboardData {
  profile: IDashboardProfile;
  recommendedJobs: IMatchResult[];
  recommendedResources: IResourceRecommendation[];
  stats: IDashboardStats;
}
