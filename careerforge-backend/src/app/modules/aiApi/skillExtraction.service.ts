import { createHash } from "crypto";
import { z } from "zod";
import { getCache, setCache } from "../../helpers/cache.js";
import { User } from "../user/user.model.js";
import AppError from "../../errorHelpers/AppError.js";
import { callGemini } from "./aiApi.service.js";
import { SKILL_DICTIONARY, ROLE_DICTIONARY } from "./aiApi.constant.js";
import type { IExtractedSkills, IAiServiceResult, AiProvider } from "./aiApi.interface.js";

const SKILL_EXTRACTION_CACHE_TTL = 24 * 60 * 60; // 24 hours

const extractionSchema = z.object({
  skills: z.array(z.string()),
  tools: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});

const extractionCacheKey = (text: string): string => {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 24);
  return `skill:extract:${hash}`;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const dedupe = (items: string[]): string[] =>
  Array.from(new Set(items.map((i) => i.trim()).filter(Boolean)));

const textIncludesKeyword = (lowerText: string, keyword: string): boolean => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWordlike = /^[a-z0-9]/.test(keyword);
  const endsWordlike = /[a-z0-9]$/.test(keyword);

  if (startsWordlike && endsWordlike) {
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(lowerText);
  }
  return lowerText.includes(keyword);
};

const matchWithDictionary = (text: string): IExtractedSkills => {
  const lowerText = normalize(text);

  const skills = dedupe(
    SKILL_DICTIONARY.filter((entry) =>
      textIncludesKeyword(lowerText, normalize(entry.keyword))
    ).map((entry) => entry.skill)
  );

  const tools = dedupe(
    SKILL_DICTIONARY.filter(
      (entry) =>
        entry.tool && textIncludesKeyword(lowerText, normalize(entry.keyword))
    ).map((entry) => entry.tool as string)
  );

  const roles = dedupe(
    ROLE_DICTIONARY.filter((entry) =>
      textIncludesKeyword(lowerText, normalize(entry.keyword))
    ).map((entry) => entry.role)
  );

  return { skills, tools, roles };
};

const extractWithGemini = async (
  text: string
): Promise<{ data: IExtractedSkills; provider: AiProvider }> => {
  const systemInstruction =
    "You are an expert CV/career analyzer. Extract skills, tools, and job roles from the given text. " +
    'Respond with STRICT JSON only, matching this shape: {"skills": string[], "tools": string[], "roles": string[]}. ' +
    "skills = technical or professional capabilities; tools = software/libraries the person used; " +
    "roles = job titles the person has held or is targeting. Keep each item concise and deduplicated.";

  const raw = await callGemini(text, {
    systemInstruction,
    temperature: 0.2,
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
  });

  if (raw) {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = extractionSchema.parse(JSON.parse(jsonMatch[0]));
        return {
          data: {
            skills: parsed.skills,
            tools: parsed.tools ?? [],
            roles: parsed.roles ?? [],
          },
          provider: "gemini",
        };
      } catch (error) {
        console.error("Gemini skill extraction JSON parse failed, falling back:", error);
      }
    }
  }

  return {
    data: matchWithDictionary(text),
    provider: "dictionary",
  };
};

const extractSkillsFromText = async (
  text: string
): Promise<IAiServiceResult<IExtractedSkills>> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      data: { skills: [], tools: [], roles: [] },
      fromCache: false,
      provider: "dictionary",
    };
  }

  const cacheKey = extractionCacheKey(trimmed);
  const cached = await getCache<IExtractedSkills>(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true, provider: "dictionary" };
  }

  const { data, provider } = await extractWithGemini(trimmed);
  await setCache(cacheKey, data, SKILL_EXTRACTION_CACHE_TTL);

  return { data, fromCache: false, provider };
};

const extractFromUser = async (
  userId: string
): Promise<IAiServiceResult<IExtractedSkills>> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const compositeText = [
    user.cvRawText ?? "",
    user.experienceNotes ?? "",
    user.careerInterests.join(", "),
    user.skills.join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const result = await extractSkillsFromText(compositeText);

  await User.findByIdAndUpdate(userId, {
    $set: {
      extractedSkills: result.data.skills,
      extractedRoles: result.data.roles,
    },
  });

  return result;
};

export const SkillExtractionServices = {
  extractSkillsFromText,
  extractFromUser,
};