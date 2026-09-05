export const MATCH_WEIGHTS = {
  skillOverlap: 0.6,
  experienceAlignment: 0.25,
  trackAlignment: 0.15,
} as const;

export const RELATED_TRACKS: Record<string, string[]> = {
  "Web Development": ["App Development", "Software Engineering"],
  "App Development": ["Web Development", "Software Engineering"],
  "Software Engineering": ["Web Development", "App Development"],
  "Data Science": ["Machine Learning"],
  "Machine Learning": ["Data Science"],
  "UI UX Design": ["Web Development", "Marketing"],
  Marketing: ["UI UX Design"],
  "Game Development": ["Software Engineering"],
};

export const ADJACENT_LEVELS: Record<string, string[]> = {
  Fresher: ["Junior"],
  Junior: ["Fresher", "Mid"],
  Mid: ["Junior"],
};