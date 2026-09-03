import { Model, Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  educationLevel?: string;
  experienceLevel?: "Fresher" | "Junior" | "Mid";
  preferredTrack?: string;
  skills: string[];
  experienceNotes?: string;
  careerInterests: string[];
  cvRawText?: string;
  cvFileUrl?: string;
  avatarUrl?: string;
  extractedSkills: string[];
  extractedRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type IUserModel = Model<IUser>;
