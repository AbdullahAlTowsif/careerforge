export interface LearningResource {
  _id: string;
  title: string;
  platform: string;
  url: string;
  relatedSkills: string[];
  cost: "Free" | "Paid";
}
