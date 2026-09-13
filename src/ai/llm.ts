import { env } from "../config/env";
import { JobType } from "../types/job";

interface LlmResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function runLLM(type: JobType, input: string) {
  if (!env.llmApiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const instruction =
    type === "summarize"
      ? "Summarize the following text clearly in 3-5 sentences."
      : "Classify the following text as positive, negative, or neutral and briefly explain why.";

  const response = await fetch(`${env.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.llmApiKey}`
    },
    body: JSON.stringify({
      model: env.llmModel,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: input }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as LlmResponse;

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0
  };
}
