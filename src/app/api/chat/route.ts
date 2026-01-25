import { chatModel } from '@/ai/models';
import { searchContributorsTool } from '@/ai/tools';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: chatModel,
    messages: await convertToModelMessages(messages),
    tools: { searchContributors: searchContributorsTool },
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse();
}
