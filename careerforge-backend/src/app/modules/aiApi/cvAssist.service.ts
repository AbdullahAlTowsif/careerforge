import { getCache, setCache } from "../../helpers/cache.js";
import { User } from "../user/user.model.js";
import AppError from "../../errorHelpers/AppError.js";
import { callGemini } from "./aiApi.service.js";
import type { ICvAssistResult, IAiServiceResult, AiProvider } from "./aiApi.interface.js";
import type { IUser } from "../user/user.interface.js";

const CV_ASSIST_CACHE_TTL = 60 * 60; // 1 hour

const cvCacheKey = (userId: string, kind: string): string => `cv:${kind}:${userId}`;

const getUserProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const profileContext = (user: IUser): string => {
  const skills = user.skills.length > 0 ? user.skills.join(", ") : "not specified";
  const interests =
    user.careerInterests.length > 0 ? user.careerInterests.join(", ") : "not specified";
  return [
    `Name: ${user.fullName}`,
    `Education: ${user.educationLevel ?? "not specified"}`,
    `Experience level: ${user.experienceLevel ?? "not specified"}`,
    `Preferred track: ${user.preferredTrack ?? "not specified"}`,
    `Skills: ${skills}`,
    `Career interests: ${interests}`,
    user.experienceNotes ? `Experience notes: ${user.experienceNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const summaryFallback = (user: IUser): string => {
  const skillsText =
    user.skills.length > 0
      ? user.skills.slice(0, 5).join(", ")
      : "a range of transferable skills";
  const trackText = user.preferredTrack
    ? `, focused on the ${user.preferredTrack} track`
    : "";
  return `Motivated ${user.experienceLevel ?? "entry-level"} professional specializing in ${skillsText}${trackText}. Passionate about building a meaningful career and growing continuously through hands-on experience and learning.`;
};

const bulletPointsFallback = (user: IUser): string[] => {
  const bullets: string[] = [];
  if (user.skills.length > 0) {
    bullets.push(
      `Applied ${user.skills.slice(0, 4).join(", ")} in practical coursework and personal projects.`
    );
  }
  if (user.experienceNotes) {
    bullets.push(user.experienceNotes);
  }
  if (user.careerInterests.length > 0) {
    bullets.push(
      `Actively developing a career path in ${user.careerInterests.slice(0, 3).join(", ")}.`
    );
  }
  return bullets;
};

const tipsFallback = (user: IUser): string[] => {
  const tips: string[] = [
    "Quantify achievements with numbers (e.g., 'improved page load by 30%').",
    "Tailor your CV to each job description by matching keywords from the posting.",
    "Keep your CV to one page for entry-level roles unless you have extensive experience.",
  ];
  if (user.skills.length === 0) {
    tips.unshift("Add a dedicated Skills section with the tools and technologies you know.");
  }
  return tips;
};

const generateCvResult = async (
  userId: string,
  kind: "summary" | "bulletPoints" | "tips"
): Promise<IAiServiceResult<ICvAssistResult>> => {
  const user = await getUserProfile(userId);
  const cacheKey = cvCacheKey(userId, kind);
  const cached = await getCache<ICvAssistResult>(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true, provider: "template" };
  }

  const context = profileContext(user);
  let provider: AiProvider = "template";
  const data: ICvAssistResult = { bulletPoints: [], tips: [] };

  if (kind === "summary") {
    const raw = await callGemini(
      `Generate a professional career summary from this profile. Output plain text, 2-3 sentences, first-person:\n\n${context}`,
      {
        systemInstruction:
          "You are a professional CV writer. Write a concise, human-sounding summary. No markdown, no quotes.",
        temperature: 0.6,
        maxOutputTokens: 300,
      }
    );
    if (raw && raw.trim().length > 0) {
      data.summary = raw.trim();
      provider = "gemini";
    } else {
      data.summary = summaryFallback(user);
    }
  }

  if (kind === "bulletPoints") {
    const raw = await callGemini(
      `Generate 4-5 work experience bullet points from this profile. Output each bullet on its own line, starting with a dash. First-person, action verbs, quantified where possible:\n\n${context}`,
      {
        systemInstruction:
          "You are a professional CV writer. Output only bullet points, each starting with '- '. No markdown headers, no extra text.",
        temperature: 0.6,
        maxOutputTokens: 500,
      }
    );
    if (raw) {
      const bullets = raw
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter(Boolean);
      if (bullets.length > 0) {
        data.bulletPoints = bullets.slice(0, 6);
        provider = "gemini";
      } else {
        data.bulletPoints = bulletPointsFallback(user);
      }
    } else {
      data.bulletPoints = bulletPointsFallback(user);
    }
  }

  if (kind === "tips") {
    const raw = await callGemini(
      `Give 4-5 practical LinkedIn/portfolio improvement tips for this profile. Output each tip on its own line, starting with a dash. Concise and specific:\n\n${context}`,
      {
        systemInstruction:
          "You are a career coach. Output only tips, each starting with '- '. No markdown headers, no extra text.",
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    );
    if (raw) {
      const tips = raw
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter(Boolean);
      if (tips.length > 0) {
        data.tips = tips.slice(0, 6);
        provider = "gemini";
      } else {
        data.tips = tipsFallback(user);
      }
    } else {
      data.tips = tipsFallback(user);
    }
  }

  await setCache(cacheKey, data, CV_ASSIST_CACHE_TTL);
  return { data, fromCache: false, provider };
};

const generateSummary = (userId: string): Promise<IAiServiceResult<ICvAssistResult>> =>
  generateCvResult(userId, "summary");

const generateBulletPoints = (userId: string): Promise<IAiServiceResult<ICvAssistResult>> =>
  generateCvResult(userId, "bulletPoints");

const generateTips = (userId: string): Promise<IAiServiceResult<ICvAssistResult>> =>
  generateCvResult(userId, "tips");

export const CvAssistServices = {
  generateSummary,
  generateBulletPoints,
  generateTips,
};