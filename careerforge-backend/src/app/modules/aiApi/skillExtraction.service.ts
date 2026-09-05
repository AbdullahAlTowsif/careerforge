import { createHash } from "crypto";
import { z } from "zod";
import { getCache, setCache } from "../../helpers/cache.js";
import { normalizeSkills } from "../../helpers/skillNormalizer.js";
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

/* ------------------------------------------------------------------ */
/*  Heuristic catch-all — open-world detection without an API key      */
/*  Picks up tech-looking tokens the dictionary doesn't know yet, so   */
/*  genuinely new frameworks/tools are never silently dropped.         */
/* ------------------------------------------------------------------ */

const COMMON_WORDS = new Set(
  [
    "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to",
    "for", "with", "from", "by", "as", "is", "are", "was", "were", "be",
    "been", "being", "i", "you", "he", "she", "it", "we", "they", "my",
    "your", "our", "their", "this", "that", "these", "those", "have",
    "has", "had", "do", "does", "did", "will", "would", "can", "could",
    "should", "shall", "may", "might", "must", "not", "no", "yes", "so",
    "very", "just", "about", "after", "before", "during", "while", "also",
    "more", "most", "some", "such", "only", "own", "same", "too", "very",
    "well", "work", "working", "experience", "experienced", "skills",
    "skill", "using", "used", "use", "building", "built", "created",
    "created", "developing", "developed", "development", "develop",
    "designing", "designed", "design", "learning", "learned", "learn",
    "interested", "interests", "including", "includes", "include", "let",
    "like", "look", "looking", "into", "etc", "e.g", "ie", "via", "per",
    "us", "them", "him", "her", "one", "two", "three", "year", "years",
    "months", "month", "university", "degree", "bachelor", "master",
    "course", "courses", "certificate", "certification", "certified",
    "school", "college", "team", "role", "project", "projects", "currently",
    "previous", "past", "recent", "recently", "high", "low", "good", "great",
    "skills", "strong", "solid", "basic", "intermediate", "advanced",
    "proficient", "knowledge", "familiar", "exposure", "understanding",
    "ability", "abilities", "responsibilities", "responsible",
  ].map((w) => w.toLowerCase())
);

const TECH_SUFFIXES = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".rb", ".php", ".css", ".scss",
  "js", "ts", "db", "sql",
];

const TECH_SUBSTRING_HINTS = [
  "framework", "engine", "studio", "platform", "sdk", "api", "cloud",
  "stack", "ops",
];

/** Does this token "look like" a technology/library name? */
const looksLikeTech = (token: string): boolean => {
  const lower = token.toLowerCase();
  if (COMMON_WORDS.has(lower)) return false;
  if (token.length < 2) return false;
  if (/^[a-z]/.test(token) && !/[A-Z]/.test(token.slice(1))) return false; // all-lower, no suffix hint
  if (TECH_SUFFIXES.some((s) => lower.endsWith(s))) return true;
  if (TECH_SUBSTRING_HINTS.some((h) => lower.includes(h))) return true;
  if (/^[A-Z][\w]+([A-Z][\w]+)+/.test(token)) return true; // PascalCase compound
  if (/^\d/.test(token)) return true; // Versioned / 3D names
  if (/\+$/.test(token)) return true; // C++ style
  return false;
};

const ROLE_SUFFIXES = [
  "developer", "engineer", "designer", "manager", "analyst", "specialist",
  "writer", "officer", "consultant", "architect", "tester", "producer",
  "artist", "researcher", "administrator", "coordinator", "lead",
  "strategist", "planner", "instructor", "facilitator",
];

/** Extract tech-looking terms the dictionary missed. */
const heuristicSkillMatches = (text: string): string[] => {
  const tokens = text.match(/[\w.+-]+/g) ?? [];
  const found = new Set<string>();
  for (const token of tokens) {
    if (looksLikeTech(token)) found.add(token);
  }
  return Array.from(found);
};

/** Extract role-like phrases (e.g. "Frontend Developer") the dictionary missed. */
const heuristicRoleMatches = (text: string): string[] => {
  const roles: string[] = [];
  const seen = new Set<string>();
  const sentences = text.split(/[,;\n]/);
  for (const sentence of sentences) {
    for (const suffix of ROLE_SUFFIXES) {
      const pattern = new RegExp(
        `(?:^|[^a-z0-9])([A-Za-z][a-zA-Z0-9 -]{0,30}?${suffix})(?=$|[^a-z0-9])`,
        "i"
      );
      const match = sentence.match(pattern);
      if (match) {
        const role = match[1]!
          .trim()
          .split(" ")
          .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
          .join(" ");
        const key = role.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          roles.push(role);
        }
      }
    }
  }
  return roles;
};

/**
 * Normalize all skills/tools in an extracted result to canonical names.
 * This ensures "React.js", "react", "reactjs" all become "React".
 */
const canonicalize = (result: IExtractedSkills): IExtractedSkills => {
  const roleSeen = new Set<string>();
  const roles: string[] = [];
  for (const role of dedupe(result.roles)) {
    const key = role.toLowerCase();
    if (!roleSeen.has(key)) {
      roleSeen.add(key);
      roles.push(role);
    }
  }
  return {
    skills: normalizeSkills(result.skills),
    tools: normalizeSkills(result.tools),
    roles,
  };
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

  // Heuristic catch-all: pick up tech/roles the dictionary doesn't know yet.
  const heuristicSkills = dedupe(heuristicSkillMatches(text));
  const heuristicRoles = dedupe(heuristicRoleMatches(text));

  return canonicalize({
    skills: [...skills, ...heuristicSkills],
    tools,
    roles: [...roles, ...heuristicRoles],
  });
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
          data: canonicalize({
            skills: parsed.skills,
            tools: parsed.tools ?? [],
            roles: parsed.roles ?? [],
          }),
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