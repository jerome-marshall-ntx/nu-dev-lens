import type { searchContributorsByQuery } from "@/use-cases/contributor";
import type { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { UIMessage } from "ai";
import type {
  BugErrorAnalysisResult,
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
  | "repository-list"
  | "bug-error-analysis";

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

  /**
   * Get the last user message content (for fallback extraction of bug/error content)
   */
  getLastUserMessage(): string | null {
    // Find the last user message
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i]?.role === "user") {
        return messageToString(this.messages[i]!);
      }
    }
    return null;
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

  /**
   * Add context for bug/error analysis results
   */
  addBugErrorAnalysisContext(result: BugErrorAnalysisResult) {
    if (!result.success) {
      this.addContext({
        type: "bug-error-analysis",
        label: "Bug/Error Analysis failed",
        results: ["Error: Unable to analyze the bug/error"],
      });
      return;
    }

    const { relevantCommits, commitAuthors, domainExperts } = result.analysis;

    const results: string[] = [];

    // Add relevant commits section
    if (relevantCommits.length > 0) {
      results.push("### Potentially Related Commits:");
      relevantCommits.forEach((commit, i) => {
        const filesStr = commit.filesChanged
          ?.slice(0, 5)
          .map((f) => `    - ${f.filename} (${f.status})`)
          .join("\n");
        results.push(
          `${i + 1}. **${commit.message.split("\n")[0]}**
   - Author: ${commit.author.username} (${commit.author.url})
   - Repository: ${commit.repository.name}
   - Date: ${commit.authoredAt ? new Date(commit.authoredAt).toLocaleDateString() : "Unknown"}
   - Summary: ${commit.summary ?? "No summary"}
   - Similarity: ${(commit.similarity * 100).toFixed(1)}%
   - URL: ${commit.url}
${filesStr ? `   - Files changed:\n${filesStr}` : ""}`
        );
      });
    } else {
      results.push("No related commits found.");
    }

    // Add commit authors section (people who made related changes)
    if (commitAuthors.length > 0) {
      results.push("\n### People Who Made Related Changes (Potential Causers/Fixers):");
      commitAuthors.forEach((author, i) => {
        results.push(
          `${i + 1}. **${author.username}** - ${author.relevantCommitCount} related commit(s)
   - Profile: ${author.url}
   - Most relevant commit: "${author.topCommit?.message.split("\n")[0] ?? "N/A"}"
   - Expertise: ${author.summary ?? "No summary available"}`
        );
      });
    }

    // Add domain experts section
    if (domainExperts.length > 0) {
      results.push("\n### Domain Experts (Can Help Resolve):");
      domainExperts.forEach((expert, i) => {
        results.push(
          `${i + 1}. **${expert.username}**
   - Profile: ${expert.url}
   - Repository: ${expert.repository.name}
   - Work Summary: ${expert.workSummary ?? "No summary available"}
   - Similarity: ${(expert.similarity * 100).toFixed(1)}%`
        );
      });
    }

    this.addContext({
      type: "bug-error-analysis",
      label: "Bug/Error Analysis Results",
      results,
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
      case "bug-error-analysis":
        return "Bug/Error Analysis";
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