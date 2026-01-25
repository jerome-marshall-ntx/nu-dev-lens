import { chatModel } from "@/ai/models";
import { searchContributorsTool, searchRepositoryWorksTool } from "@/ai/tools";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: chatModel,
    messages: await convertToModelMessages(messages),
    tools: {
      searchContributors: searchContributorsTool,
      searchRepositoryWorks: searchRepositoryWorksTool,
    },
    stopWhen: stepCountIs(5),
    onError: (error) => {
      console.error("🚀 ~ error:", error)
    },
    onFinish: (output) => {
      console.log("🚀 ~ output:", output)
    },
  });

  return result.toUIMessageStreamResponse();
}
