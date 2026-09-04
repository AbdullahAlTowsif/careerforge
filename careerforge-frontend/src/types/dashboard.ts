import type { MatchResult, ResourceRecommendation } from "./matching";

export interface DashboardProfile {
  fullName: string;
  email: string;
  skillsCount: number;
  topSkills: string[];
  track: string | null;
  experienceLevel: string | null;
  educationLevel: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  totalResources: number;
  averageMatchScore: number;
}

export interface DashboardData {
  profile: DashboardProfile;
  recommendedJobs: MatchResult[];
  recommendedResources: ResourceRecommendation[];
  stats: DashboardStats;
}
