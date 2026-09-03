export const EXPERIENCE_LEVELS = ["Fresher", "Junior", "Mid"] as const;

export const PREFERRED_TRACKS = [
  "Web Development",
  "Data",
  "Design",
  "Marketing",
] as const;

export const EDUCATION_LEVELS = [
  "SSC",
  "HSC",
  "Diploma",
  "Bachelor",
  "Master",
  "Other",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type PreferredTrack = (typeof PREFERRED_TRACKS)[number];
