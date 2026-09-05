import { User } from "./user.model.js";
import AppError from "../../errorHelpers/AppError.js";
import { normalizeSkills } from "../../helpers/skillNormalizer.js";
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

  const allowedFields: Exclude<keyof UpdateUserInput, "skills">[] = [
    "fullName",
    "educationLevel",
    "experienceLevel",
    "preferredTrack",
    "experienceNotes",
    "careerInterests",
    "cvRawText",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      user.set(field, data[field]);
    }
  }

  // Canonicalize skills so "React.js", "reactjs", "React JS" all become
  // "React" (and "Express" → "Express.js"). Keeps the DB clean and
  // guarantees matching is consistent regardless of how the user types it.
  if (Array.isArray(data.skills)) {
    user.set("skills", normalizeSkills(data.skills));
  }

  await user.save();
  return user;
};

export const UserServices = {
  getProfile,
  updateProfile,
};
