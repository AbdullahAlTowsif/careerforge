import { Types } from "mongoose";
import { User } from "../user/user.model.js";
import { JobOpportunity } from "../jobOpportunity/jobOpportunity.model.js";
import { LearningResource } from "../learningResource/learningResource.model.js";
import AppError from "../../errorHelpers/AppError.js";
import {
  normalizeSkill,
  normalizeSkills,
  skillsMatch,
  inferTracksFromSkills,
  SKILL_TRACK_DOMAINS,
} from "../../helpers/skillNormalizer.js";
import { ADJACENT_LEVELS, MATCH_WEIGHTS } from "./jobMatching.constant.js";
import type {
  ILearningLink,
  IMatchBreakdown,
  IMatchResult,
  IJobMatchResult,
  IResourceRecommendation,
} from "./jobMatching.interface.js";

/* ------------------------------------------------------------------ */
/*  Dynamic track relation — derived from skill domain mapping          */
/* ------------------------------------------------------------------ */

/**
 * Two tracks are "related" if they share at least one skill domain.
 * Computed on-the-fly from SKILL_TRACK_DOMAINS so new tracks/tech
 * are automatically related without hardcoded RELATED_TRACKS.
 */
const computeRelatedTracks = (trackA: string, trackB: string): boolean => {
  if (trackA === trackB) return true;

  const skillsInA: string[] = [];
  const skillsInB: string[] = [];

  for (const [skill, domains] of Object.entries(SKILL_TRACK_DOMAINS)) {
    if (domains.includes(trackA)) skillsInA.push(skill);
    if (domains.includes(trackB)) skillsInB.push(skill);
  }

  // Tracks are related if they share ≥ 2 skills
  const shared = skillsInA.filter((s) => skillsInB.includes(s));
  return shared.length >= 2;
};

const computeExperienceAlignment = (
  userLevel: string | undefined,
  jobLevel: string
): number => {
  if (!userLevel) return 0;
  if (userLevel === jobLevel) return 100;
  if ((ADJACENT_LEVELS[jobLevel] ?? []).includes(userLevel)) return 60;
  return 0;
};

/**
 * Track alignment with dynamic inference.
 * - If the user has no preferred track, infer it from their skills.
 * - Relation between tracks is computed via shared skill domains, so
 *   new tech is automatically connected to the right track.
 */
const computeTrackAlignment = (
  userTrack: string | undefined,
  jobTrack: string,
  userSkills: string[] = []
): number => {
  let effectiveTrack = userTrack;

  if (!effectiveTrack) {
    const inferred = inferTracksFromSkills(userSkills);
    if (inferred.length > 0) effectiveTrack = inferred[0];
  }

  if (!effectiveTrack) return 0;
  if (effectiveTrack === jobTrack) return 100;
  if (computeRelatedTracks(effectiveTrack, jobTrack)) return 40;
  return 0;
};

const computeBreakdown = (
  skillOverlap: number,
  experienceLevel: string | undefined,
  jobExperienceLevel: string,
  preferredTrack: string | undefined,
  jobTrack: string,
  userSkills: string[] = []
): IMatchBreakdown => {
  const experienceAlignment = computeExperienceAlignment(
    experienceLevel,
    jobExperienceLevel
  );
  const trackAlignment = computeTrackAlignment(
    preferredTrack,
    jobTrack,
    userSkills
  );
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

/**
 * Build the set of skills a user holds, merging their manually-added skills
 * with AI-extracted skills (from CV/notes analysis). Both are normalized,
 * so "React.js" and "React" collapse to a single entry.
 */
const collectUserSkillSet = (
  user: { skills?: string[]; extractedSkills?: string[] }
): Set<string> =>
  new Set(
    normalizeSkills([
      ...(user.skills ?? []),
      ...(user.extractedSkills ?? []),
    ])
  );

/**
 * Match a job's required skills against a set of user skills.
 * Uses normalized comparison so "React.js" matches "React", etc.
 * Returns the canonical job skill names that matched.
 */
const matchJobSkills = (
  jobRequiredSkills: string[],
  userSkillSet: Set<string>
): string[] => {
  const matched: string[] = [];
  for (const jobSkill of jobRequiredSkills) {
    const normalizedJob = normalizeSkill(jobSkill);
    // Check against every user skill using fuzzy matching
    for (const userSkill of userSkillSet) {
      if (skillsMatch(normalizedJob, userSkill)) {
        matched.push(jobSkill); // keep original job skill name for display
        break;
      }
    }
  }
  return matched;
};

const getRecommendedJobs = async (userId: string): Promise<IMatchResult[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const normalizedUserSkills = Array.from(collectUserSkillSet(user));
  const userSkillSet = new Set(normalizedUserSkills);
  const jobs = await JobOpportunity.find({});

  const results: IMatchResult[] = jobs.map((job) => {
    const matchedSkills = matchJobSkills(job.requiredSkills, userSkillSet);
    const skillOverlap =
      job.requiredSkills.length > 0
        ? (matchedSkills.length / job.requiredSkills.length) * 100
        : 0;
    const breakdown = computeBreakdown(
      skillOverlap,
      user.experienceLevel,
      job.experienceLevel,
      user.preferredTrack,
      job.track,
      normalizedUserSkills
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

/**
 * Find missing skills from a job and match them to learning resources.
 * Normalizes skills so "PostgreSQL" resources appear for a "postgres" gap.
 */
const getResourcesForGaps = async (
  missingSkills: string[]
): Promise<ILearningLink[]> => {
  if (missingSkills.length === 0) return [];

  // Fetch all resources — we'll match in memory since skill names vary
  const resources = await LearningResource.find({});

  return missingSkills.map((skill) => ({
    skill,
    resources: resources
      .filter((r) =>
        r.relatedSkills.some((rs) => skillsMatch(skill, rs))
      )
      .map((r) => ({
        _id: r._id as Types.ObjectId,
        title: r.title,
        platform: r.platform,
        url: r.url,
        cost: r.cost,
      })),
  }));
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

  const normalizedUserSkills = Array.from(collectUserSkillSet(user));
  const userSkillSet = new Set(normalizedUserSkills);
  const matchedSkills = matchJobSkills(job.requiredSkills, userSkillSet);
  const missingSkills = job.requiredSkills.filter(
    (s) => !matchJobSkills([s], userSkillSet).length
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
    job.track,
    normalizedUserSkills
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

  const normalizedUserSkills = Array.from(collectUserSkillSet(user));
  const userSkillSet = new Set(normalizedUserSkills);

  // Collect missing skills from top matches (normalized)
  const missingSet = new Set<string>();
  for (const match of matches.slice(0, 10)) {
    for (const skill of match.job.requiredSkills) {
      const normalized = normalizeSkill(skill);
      if (!matchJobSkills([skill], userSkillSet).length) {
        missingSet.add(normalized);
      }
    }
  }

  if (missingSet.size === 0) return [];

  const resources = await LearningResource.find({});

  const results: IResourceRecommendation[] = resources
    .map((resource) => ({
      resource,
      matchedGaps: resource.relatedSkills.filter((s) =>
        Array.from(missingSet).some((gap) => skillsMatch(gap, s))
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
