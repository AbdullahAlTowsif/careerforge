import { User } from "../user/user.model.js";
import { JobOpportunity } from "../jobOpportunity/jobOpportunity.model.js";
import { LearningResource } from "../learningResource/learningResource.model.js";
import { JobMatchingServices } from "../jobMatching/jobMatching.service.js";
import AppError from "../../errorHelpers/AppError.js";
import type { IDashboardData } from "./dashboard.interface.js";

const getDashboardData = async (userId: string): Promise<IDashboardData> => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const profile = {
    fullName: user.fullName,
    email: user.email,
    skillsCount: user.skills.length,
    topSkills: user.skills.slice(0, 8),
    track: user.preferredTrack ?? null,
    experienceLevel: user.experienceLevel ?? null,
    educationLevel: user.educationLevel ?? null,
  };

  const [allMatches, recommendedResources, jobCountResult, resourceCountResult] =
    await Promise.all([
      JobMatchingServices.getRecommendedJobs(userId),
      JobMatchingServices.getRecommendedResources(userId),
      JobOpportunity.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
      LearningResource.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
    ]);

  const totalJobs = jobCountResult[0]?.total ?? 0;
  const totalResources = resourceCountResult[0]?.total ?? 0;
  const averageMatchScore =
    allMatches.length > 0
      ? Math.round(
          allMatches.reduce((sum, m) => sum + m.score, 0) / allMatches.length
        )
      : 0;

  return {
    profile,
    recommendedJobs: allMatches.slice(0, 5),
    recommendedResources: recommendedResources.slice(0, 5),
    stats: { totalJobs, totalResources, averageMatchScore },
  };
};

export const DashboardServices = { getDashboardData };
