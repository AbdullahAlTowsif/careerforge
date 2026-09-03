import { Schema, model } from "mongoose";
import { IUser, IUserModel } from "./user.interface.js";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  PREFERRED_TRACKS,
} from "./user.constant.js";

const userSchema = new Schema<IUser, IUserModel>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    educationLevel: {
      type: String,
      enum: EDUCATION_LEVELS,
    },
    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVELS,
    },
    preferredTrack: {
      type: String,
      enum: PREFERRED_TRACKS,
    },
    skills: {
      type: [String],
      default: [],
    },
    experienceNotes: {
      type: String,
    },
    careerInterests: {
      type: [String],
      default: [],
    },
    cvRawText: {
      type: String,
    },
    cvFileUrl: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    extractedRoles: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser, IUserModel>("User", userSchema);
