import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const nai = createOpenAICompatible({
  name: "nai",
  apiKey: process.env.NAI_API_KEY,
  baseURL: process.env.NAI_BASE_URL!,
  supportsStructuredOutputs: true,
});

const models = {
  "nai:gpt-oss-120b": nai("eng-pool-01"),
} as const;

export const summarizationModel = models["nai:gpt-oss-120b"];
