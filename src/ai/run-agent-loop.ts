
import { searchContributorsByQuery } from "@/use-cases/contributor";
import { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { streamText, UIMessage, UIMessageStreamWriter } from "ai";
import { decideNextAction, generateAnswer, generateSearchQuery, getSearchType } from "./actions";
import { SystemContext } from "./system-context";
import type { OurMessage } from "./types";

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    writeMessagePart?: UIMessageStreamWriter<OurMessage>["write"];
  },
): Promise<ReturnType<typeof streamText>> {
  const ctx = new SystemContext(messages);

  while (!ctx.shouldStop()) {
    const searchType = await getSearchType(ctx);
    console.log("🚀 ~ runAgentLoop ~ searchType:", searchType)
    const searchQuery = await generateSearchQuery(ctx, searchType.type);
    console.log("🚀 ~ runAgentLoop ~ searchQuery:", searchQuery)

    if (searchType.type === 'contributors') {
      const contributors = await searchContributorsByQuery(searchQuery, 10, 0.4);
      ctx.addContributorsContext(searchQuery, contributors);
    } else if (searchType.type === 'repository-works') {
      const repositoryWorks = await searchRepositoryWorksByQuery(searchQuery, 10, 0.4);
      ctx.addRepositoryWorksContext(searchQuery, repositoryWorks);
    }

    const decision = await decideNextAction(ctx);
    console.log("🚀 ~ runAgentLoop ~ decision:", decision)

    ctx.setLastFeedback(decision.reasoning);

    if (decision.action === 'answer') {
      const answer = await generateAnswer(ctx);
      return answer;
    }

    ctx.incrementStep();
  }

  // Fallback: should not reach here if shouldStop() works correctly
  // but TypeScript requires a return statement
  throw new Error("Agent loop exited without generating an answer");
}