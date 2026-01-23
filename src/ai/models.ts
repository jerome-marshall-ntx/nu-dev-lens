import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ollama } from "ollama-ai-provider-v2";

const nai = createOpenAICompatible({
  name: "nai",
  apiKey: process.env.NAI_API_KEY,
  baseURL: process.env.NAI_BASE_URL!,
  supportsStructuredOutputs: true,
});

const models = {
  "nai:gpt-oss-120b": nai("eng-pool-01"),
  "ollama:qwen3-embedding:8b": ollama.embedding('qwen3-embedding:8b')
} as const;

export const summarizationModel = models["nai:gpt-oss-120b"];
export const embeddingModel = models["ollama:qwen3-embedding:8b"];