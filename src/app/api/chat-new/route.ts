// Disable AI SDK warning logging
globalThis.AI_SDK_LOG_WARNINGS = false;

import { runAgentLoop } from "@/ai/run-agent-loop";
import { type OurMessage } from "@/ai/types";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (!messages.length) {
    return new Response("No messages provided", { status: 400 });
  }

  const stream = createUIMessageStream<OurMessage>({
    execute: async ({ writer }) => {
      const result = await runAgentLoop(messages, {
        write: writer.write,
      });

      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      console.error("🚀 ~ error:", error);
      return "Oops, an error occurred!";
    },
    onFinish: (output) => {
      console.log("🚀 ~ output:", output.responseMessage);
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
}
