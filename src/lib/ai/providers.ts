import OpenAI from "openai";
import type { AIMessage, AIRequest, AIResponse, AIProviderName } from "./types";
import { AIProviderError } from "./types";

type ProviderConfig = {
  name: AIProviderName;
  apiKey?: string;
  model: string;
};

const providerConfig: Record<AIProviderName, ProviderConfig> = {
  gemini: {
    name: "gemini",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_TUTOR_MODEL || "gemini-2.5-flash",
  },
  groq: {
    name: "groq",
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_TUTOR_MODEL || "llama-3.3-70b-versatile",
  },
  openrouter: {
    name: "openrouter",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_TUTOR_MODEL || "openrouter/free",
  },
  openai: {
    name: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_TUTOR_MODEL || "gpt-5",
  },
};

function responseError(provider: AIProviderName, response: Response, body: string) {
  const retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
  return new AIProviderError(
    provider,
    body || `${provider} request failed with status ${response.status}`,
    { status: response.status, retryable },
  );
}

async function callGemini(request: AIRequest): Promise<AIResponse> {
  const config = providerConfig.gemini;
  if (!config.apiKey) throw new AIProviderError("gemini", "GEMINI_API_KEY is not configured.");

  const contents = [
    ...(request.history || []).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    { role: "user", parts: [{ text: request.input }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.instructions }] },
        contents,
        generationConfig: { temperature: 0.2 },
      }),
      cache: "no-store",
    },
  );

  const body = await response.text();
  if (!response.ok) throw responseError("gemini", response, body);

  const data = JSON.parse(body) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

  if (!answer) throw new AIProviderError("gemini", "Gemini returned an empty response.");
  return { answer, provider: "gemini", model: config.model };
}

async function callOpenAICompatible(
  provider: "groq" | "openrouter" | "openai",
  request: AIRequest,
): Promise<AIResponse> {
  const config = providerConfig[provider];
  if (!config.apiKey) {
    throw new AIProviderError(provider, `${provider.toUpperCase()}_API_KEY is not configured.`);
  }

  const baseURL =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : undefined;

  const client = new OpenAI({
    apiKey: config.apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const response = await client.responses.create({
    model: config.model,
    instructions: request.instructions,
    input: request.input,
  });

  const answer = response.output_text?.trim();
  if (!answer) throw new AIProviderError(provider, `${provider} returned an empty response.`);

  return { answer, provider, model: config.model };
}

export async function generateWithProvider(
  provider: AIProviderName,
  request: AIRequest,
): Promise<AIResponse> {
  if (provider === "gemini") return callGemini(request);
  return callOpenAICompatible(provider, request);
}

export function isProviderConfigured(provider: AIProviderName) {
  return Boolean(providerConfig[provider].apiKey);
}

export function getProviderModel(provider: AIProviderName) {
  return providerConfig[provider].model;
}
