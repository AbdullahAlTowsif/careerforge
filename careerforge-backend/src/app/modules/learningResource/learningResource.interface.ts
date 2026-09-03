import { Types } from "mongoose";

export interface ILearningResource {
  _id: Types.ObjectId;
  title: string;
  platform: string;
  url: string;
  relatedSkills: string[];
  cost: "Free" | "Paid";
}
