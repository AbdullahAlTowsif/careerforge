import { Schema, model } from "mongoose";
import { ILearningResource } from "./learningResource.interface.js";
import { RESOURCE_COSTS } from "./learningResource.constant.js";

const learningResourceSchema = new Schema<ILearningResource>({
  title: {
    type: String,
    required: [true, "Resource title is required"],
    trim: true,
  },
  platform: {
    type: String,
    required: [true, "Platform is required"],
    trim: true,
  },
  url: {
    type: String,
    required: [true, "URL is required"],
    trim: true,
  },
  relatedSkills: {
    type: [String],
    default: [],
  },
  cost: {
    type: String,
    enum: RESOURCE_COSTS,
    required: [true, "Cost is required"],
  },
});

export const LearningResource = model<ILearningResource>(
  "LearningResource",
  learningResourceSchema
);
