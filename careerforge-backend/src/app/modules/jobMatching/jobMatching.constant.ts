export const MATCH_WEIGHTS = {
  skillOverlap: 0.6,
  experienceAlignment: 0.25,
  trackAlignment: 0.15,
} as const;

/**
 * Track relations are now derived dynamically from skill domain mapping
 * (see `skillNormalizer.ts` → `SKILL_TRACK_DOMAINS`): two tracks are
 * considered "related" when they share skills (e.g. Web Development and
 * Software Engineering share React/Python/Go). This means new tracks and
 * new tech are auto-connected without hardcoding a relation table here.
 */
export const ADJACENT_LEVELS: Record<string, string[]> = {
  Fresher: ["Junior"],
  Junior: ["Fresher", "Mid"],
  Mid: ["Junior"],
};