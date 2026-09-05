import { Types } from "mongoose";
import { User } from "../user/user.model.js";
import { JobOpportunity } from "../jobOpportunity/jobOpportunity.model.js";
import { LearningResource } from "../learningResource/learningResource.model.js";
import AppError from "../../errorHelpers/AppError.js";
import {
  ADJACENT_LEVELS,
  MATCH_WEIGHTS,
  RELATED_TRACKS,
} from "./jobMatching.constant.js";
import type {
  ILearningLink,
  IMatchBreakdown,
  IMatchResult,
  IJobMatchResult,
  IResourceRecommendation,
} from "./jobMatching.interface.js";

const computeExperienceAlignment = (
  userLevel: string | undefined,
  jobLevel: string
): number => {
  if (!userLevel) return 0;
  if (userLevel === jobLevel) return 100;
  if ((ADJACENT_LEVELS[jobLevel] ?? []).includes(userLevel)) return 60;
  return 0;
};

const computeTrackAlignment = (
  userTrack: string | undefined,
  jobTrack: string
): number => {
  if (!userTrack) return 0;
  if (userTrack === jobTrack) return 100;
  if ((RELATED_TRACKS[userTrack] ?? []).includes(jobTrack)) return 40;
  return 0;
};

const computeBreakdown = (
  skillOverlap: number,
  experienceLevel: string | undefined,
  jobExperienceLevel: string,
  preferredTrack: string | undefined,
  jobTrack: string
): IMatchBreakdown => {
  const experienceAlignment = computeExperienceAlignment(
    experienceLevel,
    jobExperienceLevel
  );
  const trackAlignment = computeTrackAlignment(preferredTrack, jobTrack);
  return {
    skillOverlap: Math.round(skillOverlap),
    experienceAlignment,
    trackAlignment,
  };
};

const computeMatchPercentage = (breakdown: IMatchBreakdown): number => {
  return Math.round(
    breakdown.skillOverlap * MATCH_WEIGHTS.skillOverlap +
      breakdown.experienceAlignment * MATCH_WEIGHTS.experienceAlignment +
      breakdown.trackAlignment * MATCH_WEIGHTS.trackAlignment
  );
};

const buildReasons = (
  breakdown: IMatchBreakdown,
  matchedCount: number,
  requiredCount: number,
  experienceLevel: string | undefined,
  jobExperienceLevel: string,
  preferredTrack: string | undefined,
  jobTrack: string
): string[] => {
  const reasons: string[] = [];

  if (requiredCount === 0) {
    reasons.push("No required skills listed for this job.");
  } else if (breakdown.skillOverlap >= 70) {
    reasons.push(
      `Strong skill match: you have ${matchedCount} of ${requiredCount} required skills.`
    );
  } else if (breakdown.skillOverlap >= 40) {
    reasons.push(
      `Partial skill match: you have ${matchedCount} of ${requiredCount} required skills.`
    );
  } else {
    reasons.push(
      `Limited skill match: you have ${matchedCount} of ${requiredCount} required skills.`
    );
  }

  if (breakdown.experienceAlignment === 100) {
    reasons.push(
      `${jobExperienceLevel} experience level is a perfect fit for you.`
    );
  } else if (breakdown.experienceAlignment === 60) {
    reasons.push(
      `${jobExperienceLevel} experience level is close to yours (${experienceLevel ?? "unknown"}).`
    );
  } else {
    reasons.push(
      `This role targets ${jobExperienceLevel} experience, which differs from your level (${experienceLevel ?? "not set"}).`
    );
  }

  if (breakdown.trackAlignment === 100) {
    reasons.push(`Matches your preferred track (${jobTrack}).`);
  } else if (breakdown.trackAlignment === 40) {
    reasons.push(
      `Related to your preferred track: the job is in ${jobTrack} while you prefer ${preferredTrack}.`
    );
  } else {
    reasons.push(
      `This job falls under ${jobTrack}, which is outside your preferred track (${preferredTrack ?? "not set"}).`
    );
  }

  return reasons;
};

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
    const skillOverlap =
      job.requiredSkills.length > 0
        ? (matchedSkills.length / job.requiredSkills.length) * 100
        : 0;
    const breakdown = computeBreakdown(
      skillOverlap,
      user.experienceLevel,
      job.experienceLevel,
      user.preferredTrack,
      job.track
    );
    return {
      job,
      score: computeMatchPercentage(breakdown),
      matchedSkills,
    };
  });

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTrack = a.job.track === user.preferredTrack ? 1 : 0;
    const bTrack = b.job.track === user.preferredTrack ? 1 : 0;
    return bTrack - aTrack;
  });

  return results;
};

const getResourcesForGaps = async (
  missingSkills: string[]
): Promise<ILearningLink[]> => {
  if (missingSkills.length === 0) return [];

  const resources = await LearningResource.find({
    relatedSkills: { $in: missingSkills },
  });

  return missingSkills.map((skill) => {
    const skillLower = skill.toLowerCase();
    return {
      skill,
      resources: resources
        .filter((r) => r.relatedSkills.some((s) => s.toLowerCase() === skillLower))
        .map((r) => ({
          _id: r._id as Types.ObjectId,
          title: r.title,
          platform: r.platform,
          url: r.url,
          cost: r.cost,
        })),
    };
  });
};

const getJobMatch = async (
  userId: string,
  jobId: string
): Promise<IJobMatchResult> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const job = await JobOpportunity.findById(jobId);
  if (!job) {
    throw new AppError(404, "Job not found");
  }

  const userSkills = new Set(user.skills.map((s) => s.toLowerCase()));
  const matchedSkills = job.requiredSkills.filter((s) =>
    userSkills.has(s.toLowerCase())
  );
  const missingSkills = job.requiredSkills.filter(
    (s) => !userSkills.has(s.toLowerCase())
  );

  const skillOverlap =
    job.requiredSkills.length > 0
      ? (matchedSkills.length / job.requiredSkills.length) * 100
      : 0;

  const breakdown = computeBreakdown(
    skillOverlap,
    user.experienceLevel,
    job.experienceLevel,
    user.preferredTrack,
    job.track
  );

  const matchPercentage = computeMatchPercentage(breakdown);
  const reasons = buildReasons(
    breakdown,
    matchedSkills.length,
    job.requiredSkills.length,
    user.experienceLevel,
    job.experienceLevel,
    user.preferredTrack,
    job.track
  );
  const learningLinks = await getResourcesForGaps(missingSkills);

  return {
    job,
    matchPercentage,
    matchedSkills,
    missingSkills,
    breakdown,
    reasons,
    learningLinks,
  };
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
  getJobMatch,
};