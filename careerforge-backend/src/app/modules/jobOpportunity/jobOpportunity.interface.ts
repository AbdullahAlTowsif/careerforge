import { Types } from "mongoose";

export interface IExternalLinks {
  linkedin?: string;
  bdjobs?: string;
  glassdoor?: string;
}

export interface IJobOpportunity {
  _id: Types.ObjectId;
  title: string;
  company: string;
  location: string;
  requiredSkills: string[];
  experienceLevel: "Fresher" | "Junior" | "Mid";
  type: "Internship" | "Part-time" | "Full-time" | "Freelance";
  track: string;
  description: string;
  externalLinks: IExternalLinks;
}
