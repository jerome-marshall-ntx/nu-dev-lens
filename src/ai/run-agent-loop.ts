import { getAllRepositoryDescriptions } from "@/data-access/repository";
import { searchContributorsByQuery } from "@/use-cases/contributor";
import { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { streamText, UIMessage } from "ai";
import { nanoid } from "nanoid";
import {
  decideNextAction,
  generateAnswer,
  generateSearchQuery,
  selectTools,
  ToolType,
  type ToolSelection,
} from "./actions";
import { SystemContext } from "./system-context";
import {
  analyzeBugOrError,
  getContributorStats,
  getTopContributorsByCommits,
  listRepositories,
} from "./tools";
import type { OurMessageStreamWrite } from "./types";

// ============================================================================
// TOOL NAME MAPPING (for UI display)
// ============================================================================

const TOOL_DISPLAY_NAMES: Record<ToolSelection["tools"][number], string> = {
  "search-contributors": "Search Contributors",
  "search-repository-works": "Search Repository Works",
  "get-top-contributors": "Get Top Contributors",
  "get-contributor-stats": "Get Contributor Stats",
  "list-repositories": "List Repositories",
  "analyze-bug-or-error": "Analyze Bug/Error",
};

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================

/**
 * Execute a single tool and add results to context
 */
async function executeTool(
  tool: ToolSelection["tools"][number],
  toolSelection: ToolSelection,
  ctx: SystemContext,
  repositoryDescriptions: { name: string; description: string | null }[],
  write: OurMessageStreamWrite
): Promise<void> {
  const toolCallId = `tool-input-${nanoid()}`;
  const toolName = TOOL_DISPLAY_NAMES[tool];

  // Prepare input based on tool type
  let input: Record<string, unknown> = {};

  switch (tool) {
    case ToolType.SEARCH_CONTRIBUTORS:
    case ToolType.SEARCH_REPOSITORY_WORKS: {
      // For semantic search tools, generate a search query
      const searchType =
        tool === ToolType.SEARCH_CONTRIBUTORS
          ? "contributors"
          : "repository-works";
      const searchQuery = await generateSearchQuery(
        ctx,
        searchType,
        repositoryDescriptions
      );
      input = { query: searchQuery };

      // Write tool input
      write({ type: "tool-input-start", toolCallId, toolName });
      write({ type: "tool-input-available", toolCallId, toolName, input });

      // Execute semantic search
      if (tool === ToolType.SEARCH_CONTRIBUTORS) {
        const contributors = await searchContributorsByQuery(
          searchQuery,
          10,
          0.4
        );
        write({ type: "tool-output-available", toolCallId, output: contributors });
        ctx.addContributorsContext(searchQuery, contributors);
      } else {
        const repositoryWorks = await searchRepositoryWorksByQuery(
          searchQuery,
          10,
          0.4
        );
        write({ type: "tool-output-available", toolCallId, output: repositoryWorks });
        ctx.addRepositoryWorksContext(searchQuery, repositoryWorks);
      }
      break;
    }

    case ToolType.GET_TOP_CONTRIBUTORS: {
      // Database query for top contributors by commits
      const repoName = toolSelection.repositoryName;

      if (!repoName) {
        // If no repository name provided, list available repositories instead
        console.warn("⚠️ get-top-contributors called without repositoryName, listing repositories instead");
        input = { error: "No repository name provided" };
        write({ type: "tool-input-start", toolCallId, toolName });
        write({ type: "tool-input-available", toolCallId, toolName, input });

        const repos = await listRepositories();
        write({
          type: "tool-output-available", toolCallId, output: {
            success: false,
            error: "No repository name was specified. Please specify which repository you want to see top contributors for.",
            availableRepositories: repos
          }
        });
        ctx.addRepositoryListContext(repos);
        break;
      }

      input = { repositoryName: repoName, limit: 10 };

      write({ type: "tool-input-start", toolCallId, toolName });
      write({ type: "tool-input-available", toolCallId, toolName, input });

      const result = await getTopContributorsByCommits(repoName, 10);
      write({ type: "tool-output-available", toolCallId, output: result });
      ctx.addTopContributorsContext(result);
      break;
    }

    case ToolType.GET_CONTRIBUTOR_STATS: {
      // Database query for specific contributor stats
      const username = toolSelection.username;

      if (!username) {
        console.warn("⚠️ get-contributor-stats called without username");
        input = { error: "No username provided" };
        write({ type: "tool-input-start", toolCallId, toolName });
        write({ type: "tool-input-available", toolCallId, toolName, input });

        write({
          type: "tool-output-available", toolCallId, output: {
            success: false,
            error: "No username was specified. Please specify which contributor you want stats for."
          }
        });
        break;
      }

      input = { username };

      write({ type: "tool-input-start", toolCallId, toolName });
      write({ type: "tool-input-available", toolCallId, toolName, input });

      const result = await getContributorStats(username);
      write({ type: "tool-output-available", toolCallId, output: result });
      ctx.addContributorStatsContext(result);
      break;
    }

    case ToolType.LIST_REPOSITORIES: {
      // Database query to list all repositories
      input = {};

      write({ type: "tool-input-start", toolCallId, toolName });
      write({ type: "tool-input-available", toolCallId, toolName, input });

      const result = await listRepositories();
      write({ type: "tool-output-available", toolCallId, output: result });
      ctx.addRepositoryListContext(result);
      break;
    }

    case ToolType.ANALYZE_BUG_OR_ERROR: {
      // Analyze bug/error to find related commits and experts
      let issueContent = toolSelection.bugErrorContent;

      // Fallback: if bugErrorContent is not provided, extract from last user message
      if (!issueContent) {
        console.warn("⚠️ analyze-bug-or-error called without bugErrorContent, extracting from last user message");
        const lastUserMessage = ctx.getLastUserMessage();
        if (lastUserMessage) {
          issueContent = lastUserMessage;
          console.log("📝 Extracted issue content from last user message");
        }
      }

      if (!issueContent) {
        console.error("❌ analyze-bug-or-error: No issue content found");
        input = { error: "No issue content provided" };
        write({ type: "tool-input-start", toolCallId, toolName });
        write({ type: "tool-input-available", toolCallId, toolName, input });

        write({
          type: "tool-output-available",
          toolCallId,
          output: {
            success: false,
            error:
              "No bug/error content was provided. Please describe the issue including any error messages, stack traces, or symptoms.",
          },
        });
        break;
      }

      // Truncate long issue content for display (but use full content for search)
      const displayContent =
        issueContent.length > 200
          ? issueContent.substring(0, 200) + "..."
          : issueContent;
      input = { issueContent: displayContent };

      write({ type: "tool-input-start", toolCallId, toolName });
      write({ type: "tool-input-available", toolCallId, toolName, input });

      const result = await analyzeBugOrError(issueContent);
      write({ type: "tool-output-available", toolCallId, output: result });
      ctx.addBugErrorAnalysisContext(result);
      break;
    }
  }
}

// ============================================================================
// MAIN AGENT LOOP
// ============================================================================

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    write: OurMessageStreamWrite;
  }
): Promise<ReturnType<typeof streamText>> {
  const { write } = opts;
  write({ type: "start" });
  const ctx = new SystemContext(messages);

  const repositoryDescriptions = await getAllRepositoryDescriptions();

  while (!ctx.shouldStop()) {
    write({ type: "start-step" });
    const reasoningId = `reasoning-${nanoid()}`;

    write({ type: "reasoning-start", id: reasoningId });

    // Select which tools to use based on the user's query
    const toolSelection = await selectTools(ctx, repositoryDescriptions);
    console.log("🚀 ~ runAgentLoop ~ toolSelection:", toolSelection)
    write({
      type: "reasoning-delta",
      id: reasoningId,
      delta: `Tool selection: ${toolSelection.tools.join(", ")}\n\n${toolSelection.reasoning}`,
    });

    // Add extracted parameters to reasoning if present
    if (toolSelection.repositoryName) {
      write({
        type: "reasoning-delta",
        id: reasoningId,
        delta: `\n\nRepository: ${toolSelection.repositoryName}`,
      });
    }
    if (toolSelection.username) {
      write({
        type: "reasoning-delta",
        id: reasoningId,
        delta: `\nUsername: ${toolSelection.username}`,
      });
    }

    // Execute all selected tools in parallel for faster responses
    const toolResults = await Promise.allSettled(
      toolSelection.tools.map((tool) =>
        executeTool(tool, toolSelection, ctx, repositoryDescriptions, write)
      )
    );

    // Log any tool failures (but continue with partial results)
    toolResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `⚠️ Tool "${toolSelection.tools[index]}" failed:`,
          result.reason
        );
      }
    });

    // Decide whether to continue searching or answer
    const decision = await decideNextAction(ctx);
    write({
      type: "reasoning-delta",
      id: reasoningId,
      delta: `\n\n${decision.reasoning}`,
    });

    ctx.setLastFeedback(decision.reasoning);

    write({ type: "reasoning-end", id: reasoningId });
    write({ type: "finish-step" });

    if (decision.action === "answer") {
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