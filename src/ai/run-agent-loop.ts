
import { getAllRepositoryDescriptions } from "@/data-access/repository";
import { searchContributorsByQuery } from "@/use-cases/contributor";
import { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { streamText, UIMessage } from "ai";
import { nanoid } from "nanoid";
import { decideNextAction, generateAnswer, generateSearchQuery, getSearchType } from "./actions";
import { SystemContext } from "./system-context";
import type { OurMessageStreamWrite } from "./types";

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    write: OurMessageStreamWrite;
  },
): Promise<ReturnType<typeof streamText>> {
  const { write } = opts;
  write({ type: "start" });
  const ctx = new SystemContext(messages);

  const repositoryDescriptions = await getAllRepositoryDescriptions();

  while (!ctx.shouldStop()) {
    write({ type: "start-step" });
    const reasoningId = `reasoning-${nanoid()}`;

    write({ type: "reasoning-start", id: reasoningId });

    const searchType = await getSearchType(ctx);
    write({ type: "reasoning-delta", id: reasoningId, delta: searchType.reasoning });

    const searchQuery = await generateSearchQuery(ctx, searchType.type, repositoryDescriptions);
    write({ type: "reasoning-delta", id: reasoningId, delta: "\n\nSearch query: " + searchQuery });

    const toolCallId = `tool-input-${nanoid()}`;
    const toolName = searchType.type === 'contributors' ? 'Search Contributors' : 'Search Repository Works';
    write({
      type: "tool-input-start",
      toolCallId,
      toolName,
    });
    write({
      type: "tool-input-available",
      toolCallId,
      toolName,
      input: { query: searchQuery },
    });

    if (searchType.type === 'contributors') {
      const contributors = await searchContributorsByQuery(searchQuery, 10, 0.4);
      write({
        type: "tool-output-available",
        toolCallId,
        output: contributors,
      });

      ctx.addContributorsContext(searchQuery, contributors);
    } else if (searchType.type === 'repository-works') {
      const repositoryWorks = await searchRepositoryWorksByQuery(searchQuery, 10, 0.4);
      write({
        type: "tool-output-available",
        toolCallId,
        output: repositoryWorks,
      });

      ctx.addRepositoryWorksContext(searchQuery, repositoryWorks);
    }

    const decision = await decideNextAction(ctx);
    write({ type: "reasoning-delta", id: reasoningId, delta: `\n\n${decision.reasoning}` });

    ctx.setLastFeedback(decision.reasoning);

    write({ type: "reasoning-end", id: reasoningId });
    write({ type: "finish-step" });
    if (decision.action === 'answer') {
      const answer = await generateAnswer(ctx);
      return answer;
    }

    ctx.incrementStep();

    // If we've reached the max iterations, force generate an answer
    if (ctx.shouldStop()) {
      const answer = await generateAnswer(ctx);
      return answer;
    }
  }

  // Fallback: generate answer if loop exits without one (e.g., if shouldStop() is true from start)
  return generateAnswer(ctx);
}