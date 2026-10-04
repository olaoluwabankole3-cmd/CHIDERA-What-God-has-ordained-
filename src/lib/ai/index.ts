import { generateWithProvider, isProviderConfigured } from "./providers";
import type { AIMessage, AIProviderName, AIRequest, AIResponse } from "./types";
import { AIProviderError } from "./types";

const DEFAULT_PROVIDER_ORDER: AIProviderName[] = ["gemini", "groq", "openrouter", "openai"];

function getProviderOrder(): AIProviderName[] {
  const configuredOrder = process.env.AI_PROVIDER_ORDER
    ?.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as AIProviderName[] | undefined;

  const order = configuredOrder?.length ? configuredOrder : DEFAULT_PROVIDER_ORDER;

  return order.filter(
    (provider, index) =>
      ["gemini", "groq", "openrouter", "openai"].includes(provider) &&
      order.indexOf(provider) === index &&
      isProviderConfigured(provider),
  );
}

export async function generateTutorResponse(
  request: AIRequest & { history?: AIMessage[] },
): Promise<AIResponse> {
  const providers = getProviderOrder();

  if (providers.length === 0) {
    throw new AIProviderError(
      "openai",
      "No AI provider is configured. Add at least one provider API key.",
      { retryable: false },
    );
  }

  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const response = await generateWithProvider(provider, request);
      console.info(`AI provider succeeded: ${provider}`);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      failures.push(`${provider}: ${message}`);
      console.warn(`AI provider failed: ${provider}`, error);
    }
  }

  throw new AIProviderError(
    providers[providers.length - 1],
    `All configured AI providers failed. ${failures.join(" | ")}`,
    { retryable: false },
  );
}
