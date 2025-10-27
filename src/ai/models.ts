import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const models = {
  "groq:gpt-oss-120b": groq("openai/gpt-oss-120b"),
  "groq:qwen3-32b": groq("qwen/qwen3-32b"),
  "openrouter:x-ai/grok-4-fast:free": openrouter("x-ai/grok-4-fast:free"),
} as const;

export const summarizationModel = models["groq:gpt-oss-120b"];
