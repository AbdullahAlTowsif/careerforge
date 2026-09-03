import { EXPERIENCE_LEVELS, PREFERRED_TRACKS } from "../user/user.constant.js";

export const JOB_TYPES = ["Internship", "Part-time", "Full-time", "Freelance"] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type JobTrack = (typeof PREFERRED_TRACKS)[number];
