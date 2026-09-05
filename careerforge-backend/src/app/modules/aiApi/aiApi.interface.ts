export interface IExtractedSkills {
  skills: string[];
  tools: string[];
  roles: string[];
}

export interface ICvAssistResult {
  summary?: string;
  bulletPoints: string[];
  tips: string[];
}

export type AiProvider = "gemini" | "dictionary" | "template";

export interface IAiServiceResult<T> {
  data: T;
  fromCache: boolean;
  provider: AiProvider;
}