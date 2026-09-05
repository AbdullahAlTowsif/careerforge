import type { ExperienceLevel } from "./user";

export interface ExternalLinks {
  linkedin?: string;
  bdjobs?: string;
  glassdoor?: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  requiredSkills: string[];
  experienceLevel: ExperienceLevel;
  type: JobType;
  track: string;
  description: string;
  externalLinks: ExternalLinks;
}

export type JobType = "Internship" | "Part-time" | "Full-time" | "Freelance";

export interface MatchBreakdown {
  skillOverlap: number;
  experienceAlignment: number;
  trackAlignment: number;
}

export interface LearningLinkResource {
  _id: string;
  title: string;
  platform: string;
  url: string;
  cost: "Free" | "Paid";
}

export interface LearningLink {
  skill: string;
  resources: LearningLinkResource[];
}

export interface JobMatchResult {
  job: Job;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: MatchBreakdown;
  reasons: string[];
  learningLinks: LearningLink[];
}
