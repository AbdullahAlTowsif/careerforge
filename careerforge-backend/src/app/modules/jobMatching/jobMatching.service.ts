import { User } from "../user/user.model.js";
import { JobOpportunity } from "../jobOpportunity/jobOpportunity.model.js";
import { LearningResource } from "../learningResource/learningResource.model.js";
import AppError from "../../errorHelpers/AppError.js";
import type { IMatchResult, IResourceRecommendation } from "./jobMatching.interface.js";

const getRecommendedJobs = async (userId: string): Promise<IMatchResult[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const userSkills = new Set(user.skills.map((s) => s.toLowerCase()));
  const jobs = await JobOpportunity.find({});

  const results: IMatchResult[] = jobs.map((job) => {
    const matchedSkills = job.requiredSkills.filter((s) =>
      userSkills.has(s.toLowerCase())
    );
    const score =
      job.requiredSkills.length > 0
        ? Math.round((matchedSkills.length / job.requiredSkills.length) * 100)
        : 0;
    return { job, score, matchedSkills };
  });

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTrack = a.job.track === user.preferredTrack ? 1 : 0;
    const bTrack = b.job.track === user.preferredTrack ? 1 : 0;
    return bTrack - aTrack;
  });

  return results;
};

const getRecommendedResources = async (
  userId: string
): Promise<IResourceRecommendation[]> => {
  const matches = await getRecommendedJobs(userId);
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const userSkills = new Set(user.skills.map((s) => s.toLowerCase()));

  const gapSet = new Set<string>();
  for (const match of matches.slice(0, 10)) {
    for (const skill of match.job.requiredSkills) {
      const lower = skill.toLowerCase();
      if (!userSkills.has(lower)) {
        gapSet.add(lower);
      }
    }
  }

  if (gapSet.size === 0) return [];

  const resources = await LearningResource.find({});

  const results: IResourceRecommendation[] = resources
    .map((resource) => ({
      resource,
      matchedGaps: resource.relatedSkills.filter((s) =>
        gapSet.has(s.toLowerCase())
      ),
    }))
    .filter((r) => r.matchedGaps.length > 0)
    .sort((a, b) => b.matchedGaps.length - a.matchedGaps.length);

  return results;
};

export const JobMatchingServices = {
  getRecommendedJobs,
  getRecommendedResources,
};
