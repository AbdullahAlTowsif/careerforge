import { User } from "./user.model.js";
import AppError from "../../errorHelpers/AppError.js";
import type { UpdateUserInput } from "./user.validation.js";

const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const updateProfile = async (userId: string, data: UpdateUserInput) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const allowedFields: (keyof UpdateUserInput)[] = [
    "fullName",
    "educationLevel",
    "experienceLevel",
    "preferredTrack",
    "skills",
    "experienceNotes",
    "careerInterests",
    "cvRawText",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      user.set(field, data[field]);
    }
  }

  await user.save();
  return user;
};

export const UserServices = {
  getProfile,
  updateProfile,
};
