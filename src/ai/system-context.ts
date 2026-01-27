import type { searchContributorsByQuery } from "@/use-cases/contributor";
import type { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { UIMessage } from "ai";
import type {
  ContributorStatsResult,
  RepositoryListResult,
  TopContributorsResult,
} from "./tools";
import { messageToString } from "./utils";

// ============================================================================
// CONTEXT TYPES
// ============================================================================

type ContextType =
  | "contributors"
  | "repository-works"
  | "top-contributors"
  | "contributor-stats"
  | "repository-list";

interface Context {
  type: ContextType;
  label: string;
  results: string[];
}

// ============================================================================
// SYSTEM CONTEXT CLASS
// ============================================================================

export class SystemContext {
  private step = 0;
  private readonly messages: UIMessage[];
  private context: Context[] = [];
  private lastFeedback?: string;

  constructor(messages: UIMessage[]) {
    this.messages = messages;
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `<${role}>${messageToString(message)}</${role}>`;
      })
      .join("\n\n");
  }

  shouldStop() {
    return this.step >= 4;
  }

  incrementStep() {
    this.step++;
  }

  getStep() {
    return this.step;
  }

  addContext(context: Context) {
    this.context.push(context);
  }

  // ============================================================================
  // SEMANTIC SEARCH CONTEXT FORMATTERS
  // ============================================================================

  addContributorsContext(
    query: string,
    contributors: Awaited<ReturnType<typeof searchContributorsByQuery>>
  ) {
    this.addContext({
      type: "contributors",
      label: `Semantic search for contributors: "${query}"`,
      results: contributors.map(
        (c) =>
          `- username: ${c.username}, url: ${c.url}, avatarUrl: ${c.avatarUrl}, summary: ${c.summary ?? "No summary available"}`
      ),
    });
  }

  addRepositoryWorksContext(
    query: string,
    repositoryWorks: Awaited<ReturnType<typeof searchRepositoryWorksByQuery>>
  ) {
    this.addContext({
      type: "repository-works",
      label: `Semantic search for repository works: "${query}"`,
      results: repositoryWorks.map(
        (r) => `
- repository: ${r.repository.name}
- url: ${r.repository.url}
- work summary: ${r.summary ?? "No summary available"}
- contributor summary: ${r.contributor.summary ?? "No summary available"}
- contributor url: ${r.contributor.url}
- contributor username: ${r.contributor.username}`
      ),
    });
  }

  // ============================================================================
  // DATABASE QUERY CONTEXT FORMATTERS
  // ============================================================================

  /**
   * Add context for top contributors by commit count in a repository
   */
  addTopContributorsContext(result: TopContributorsResult) {
    if (!result.success) {
      this.addContext({
        type: "top-contributors",
        label: `Top contributors query failed`,
        results: [
          `Error: ${result.error}`,
          `Available repositories: ${result.availableRepositories.map((r) => r.name).join(", ")}`,
        ],
      });
      return;
    }

    this.addContext({
      type: "top-contributors",
      label: `Top contributors in "${result.repository.name}" (by commit count)`,
      results: result.contributors.map(
        (c, i) =>
          `${i + 1}. ${c.username} - ${c.commitCount} commits | Summary: ${c.summary ?? "No summary available"} | URL: ${c.url}`
      ),
    });
  }

  /**
   * Add context for a specific contributor's stats
   */
  addContributorStatsContext(result: ContributorStatsResult) {
    if (!result.success) {
      this.addContext({
        type: "contributor-stats",
        label: `Contributor stats query failed`,
        results: [`Error: ${result.error}`],
      });
      return;
    }

    const c = result.contributor;
    this.addContext({
      type: "contributor-stats",
      label: `Stats for contributor: ${c.username}`,
      results: [
        `- Username: ${c.username}`,
        `- Total commits: ${c.commitCount}`,
        `- Repositories contributed to: ${c.repositoryCount}`,
        `- Profile URL: ${c.url}`,
        `- Summary: ${c.summary ?? "No summary available"}`,
      ],
    });
  }

  /**
   * Add context for repository list
   */
  addRepositoryListContext(repositories: RepositoryListResult) {
    this.addContext({
      type: "repository-list",
      label: "Available repositories",
      results: repositories.map(
        (r) =>
          `- ${r.name}: ${r.description ?? "No description"} (${r.commitCount} commits)`
      ),
    });
  }

  // ============================================================================
  // CONTEXT OUTPUT
  // ============================================================================

  getContext() {
    if (this.context.length === 0) {
      return "";
    }

    return this.context
      .map((c) => {
        const typeLabel = this.getTypeLabel(c.type);
        return `## ${typeLabel}
${c.label}

${c.results.join("\n")}`;
      })
      .join("\n\n---\n\n");
  }

  private getTypeLabel(type: ContextType): string {
    switch (type) {
      case "contributors":
        return "Contributors (Semantic Search)";
      case "repository-works":
        return "Repository Works (Semantic Search)";
      case "top-contributors":
        return "Top Contributors (Database Query)";
      case "contributor-stats":
        return "Contributor Stats (Database Query)";
      case "repository-list":
        return "Repository List (Database Query)";
      default:
        return "Search Results";
    }
  }

  setLastFeedback(feedback: string) {
    this.lastFeedback = feedback;
  }

  getLastFeedback() {
    return this.lastFeedback;
  }
}