import { z } from "zod";

import type { EducationLevel, ExperienceLevel, PreferredTrack } from "@/types/user";

export const EDUCATION_LEVELS = [
  "SSC",
  "HSC",
  "Diploma",
  "Bachelor",
  "Master",
  "Other",
] as const;

export const EXPERIENCE_LEVELS = ["Fresher", "Junior", "Mid"] as const;

export const PREFERRED_TRACKS = [
  "Web Development",
  "App Development",
  "Game Development",
  "Software Engineering",
  "Machine Learning",
  "Data Science",
  "UI UX Design",
  "Marketing",
] as const;

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  educationLevel: z.enum(EDUCATION_LEVELS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  preferredTrack: z.enum(PREFERRED_TRACKS).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  experienceNotes: z.string().max(5000).optional(),
  careerInterests: z.array(z.string().min(1).max(100)).optional(),
  cvRawText: z.string().max(50000).optional(),
});

export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export type { EducationLevel, ExperienceLevel, PreferredTrack };
