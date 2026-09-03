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
