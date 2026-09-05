import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

export const GEMINI_MODEL = "gemini-2.5-flash";

let geminiClient: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI | null => {
  if (!env.GEMINI_API_KEY) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return geminiClient;
};

interface CallGeminiOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
}

export const callGemini = async (
  userMessage: string,
  options: CallGeminiOptions = {}
): Promise<string | null> => {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const config: {
      systemInstruction?: string;
      temperature: number;
      maxOutputTokens: number;
      responseMimeType: "text/plain" | "application/json";
    } = {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      responseMimeType: options.responseMimeType ?? "text/plain",
    };

    if (options.systemInstruction !== undefined) {
      config.systemInstruction = options.systemInstruction;
    }

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: userMessage,
      config,
    });

    return response.text ?? null;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return null;
  }
};