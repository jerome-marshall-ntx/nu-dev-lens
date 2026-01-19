import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const nai = createOpenAICompatible({
  name: "nai",
  apiKey: process.env.NAI_API_KEY,
  baseURL: process.env.NAI_BASE_URL!,
  supportsStructuredOutputs: true,
});

const models = {
  "groq:gpt-oss-120b": groq("openai/gpt-oss-120b"),
  "groq:qwen3-32b": groq("qwen/qwen3-32b"),
  "openrouter:x-ai/grok-4-fast:free": openrouter("x-ai/grok-4-fast:free"),
  "nai:gpt-oss-120b": nai("eng-pool-01"),
} as const;

export const summarizationModel = models["nai:gpt-oss-120b"];
