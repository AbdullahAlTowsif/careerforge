import { z } from "zod";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  PREFERRED_TRACKS,
} from "./user.constant.js";

export const registerUserSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be at most 72 characters"),
  educationLevel: z.enum(EDUCATION_LEVELS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  preferredTrack: z.enum(PREFERRED_TRACKS).optional(),
});

export const loginUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  educationLevel: z.enum(EDUCATION_LEVELS).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
  preferredTrack: z.enum(PREFERRED_TRACKS).optional(),
  skills: z.array(z.string().min(1).max(50)).optional(),
  experienceNotes: z.string().max(5000).optional(),
  careerInterests: z.array(z.string().min(1).max(100)).optional(),
  cvRawText: z.string().max(50000).optional(),
  cvFileUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
