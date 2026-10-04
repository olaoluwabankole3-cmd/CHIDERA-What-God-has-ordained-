export type AIProviderName = "gemini" | "groq" | "openrouter" | "openai";

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIRequest = {
  instructions: string;
  input: string;
  history?: AIMessage[];
};

export type AIResponse = {
  answer: string;
  provider: AIProviderName;
  model: string;
};

export class AIProviderError extends Error {
  provider: AIProviderName;
  status?: number;
  retryable: boolean;

  constructor(
    provider: AIProviderName,
    message: string,
    options?: { status?: number; retryable?: boolean },
  ) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.status = options?.status;
    this.retryable = options?.retryable ?? true;
  }
}
