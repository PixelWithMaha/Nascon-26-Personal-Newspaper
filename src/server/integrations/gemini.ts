import "server-only";
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/lib/config/server-env";

let client: GoogleGenAI | undefined;
function ai() {
  client ??= new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  return client;
}

type GenerateJsonInput = {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  temperature?: number;
};

export async function generateJson({ system, prompt, jsonSchema, temperature = 0.4 }: GenerateJsonInput) {
  const response = await ai().models.generateContent({
    model: serverEnv().GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      temperature,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text) as unknown;
}

export async function generateText({
  system,
  prompt,
  temperature = 0.3,
}: {
  system: string;
  prompt: string;
  temperature?: number;
}) {
  const response = await ai().models.generateContent({
    model: serverEnv().GEMINI_MODEL,
    contents: prompt,
    config: { systemInstruction: system, temperature },
  });
  return (response.text ?? "").trim();
}