export type ExperienceLevel = "Fresher" | "Junior" | "Mid";

export type PreferredTrack = "Web Development" | "App Development" | "Game Development" | "Software Engineering" | "Machine Learning" | "Data Science" | "UI UX Design" | "Marketing";

export type EducationLevel =
  | "SSC"
  | "HSC"
  | "Diploma"
  | "Bachelor"
  | "Master"
  | "Other";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  educationLevel?: EducationLevel;
  experienceLevel?: ExperienceLevel;
  preferredTrack?: PreferredTrack;
  skills: string[];
  experienceNotes?: string;
  careerInterests: string[];
  cvRawText?: string;
  cvFileUrl?: string;
  avatarUrl?: string;
  extractedSkills: string[];
  extractedRoles: string[];
  createdAt: string;
  updatedAt: string;
}
