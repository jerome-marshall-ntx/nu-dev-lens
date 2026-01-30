import { getContributorByUsername } from "@/data-access/contributor";
import {
  getAllRepositoriesWithStats,
  getRepositoryByName,
  getRepositoryKeyContributors,
} from "@/data-access/repository";
import { searchCommitsByQuery } from "@/use-cases/commit";
import { searchContributorsByQuery } from "@/use-cases/contributor";
import { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import { tool } from "ai";
import z from "zod";

// ============================================================================
// AI SDK TOOLS (for automatic tool calling in streamText/generateText)
// ============================================================================

export const searchContributorsTool = tool({
  description: `Search for contributors using semantic similarity matching against their profile summaries. For best results, rewrite the user's query to be detailed and descriptive.
`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        `A rewritten, detailed search query optimized for semantic matching.`,
      ),
  }),
  execute: async ({ query }) => {
    console.log("🚀 ~ searchContributorsTool ~ query:", query);
    const results = await searchContributorsByQuery(query, 10, 0.4);
    console.log("🚀 ~ found results:", results.length);
    return results;
  },
});

export const searchRepositoryWorksTool = tool({
  description: `Search for repository works using semantic similarity matching against their summaries. Repository works represent what a contributor did in a specific repository. For best results, rewrite the user's query to be detailed and descriptive.
`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        `A rewritten, detailed search query optimized for semantic matching.`,
      ),
  }),
  execute: async ({ query }) => {
    console.log("🚀 ~ searchRepositoryWorksTool ~ query:", query);
    const results = await searchRepositoryWorksByQuery(query, 10, 0.4);
    console.log("🚀 ~ found results:", results.length);
    return results;
  },
});

// ============================================================================
// MANUAL DATABASE QUERY TOOLS (for agent loop with structured output selection)
// ============================================================================

/**
 * Get top contributors for a repository ranked by commit count.
 * Use this for quantitative questions like "who has the most commits in X repo?"
 *
 * @param repositoryName - The name of the repository to query
 * @param limit - Maximum number of contributors to return (default: 10)
 * @returns Array of contributors with commit counts, or null if repo not found
 */
export async function getTopContributorsByCommits(
  repositoryName: string,
  limit: number = 10
) {
  const repo = await getRepositoryByName(repositoryName);
  if (!repo) {
    return {
      success: false as const,
      error: `Repository "${repositoryName}" not found`,
      availableRepositories: await listRepositories(),
    };
  }

  const contributors = await getRepositoryKeyContributors(repo.id, limit);

  return {
    success: true as const,
    repository: {
      id: repo.id,
      name: repo.name,
      description: repo.description,
    },
    contributors: contributors.map((c) => ({
      username: c.username,
      url: c.url,
      avatarUrl: c.avatarUrl,
      summary: c.summary,
      commitCount: c.commitCount,
    })),
  };
}

/** Return type for getTopContributorsByCommits */
export type TopContributorsResult = Awaited<
  ReturnType<typeof getTopContributorsByCommits>
>;

/**
 * Get detailed stats for a specific contributor.
 * Use this for questions about a specific person's activity.
 *
 * @param username - The GitHub username of the contributor
 * @returns Contributor details with stats, or null if not found
 */
export async function getContributorStats(username: string) {
  const contributor = await getContributorByUsername(username);

  if (!contributor) {
    return {
      success: false as const,
      error: `Contributor "${username}" not found`,
    };
  }

  return {
    success: true as const,
    contributor: {
      username: contributor.username,
      url: contributor.url,
      avatarUrl: contributor.avatarUrl,
      summary: contributor.summary,
      repositoryCount: contributor.repositoryCount,
      commitCount: contributor.commitCount,
    },
  };
}

/** Return type for getContributorStats */
export type ContributorStatsResult = Awaited<
  ReturnType<typeof getContributorStats>
>;

/**
 * List all available repositories with their stats.
 * Use this to help the AI understand what repositories exist.
 *
 * @returns Array of repositories with commit counts
 */
export async function listRepositories() {
  const repos = await getAllRepositoriesWithStats();

  return repos.map((r) => ({
    name: r.name,
    description: r.description,
    url: r.url,
    commitCount: r.commitCount,
  }));
}

/** Return type for listRepositories */
export type RepositoryListResult = Awaited<ReturnType<typeof listRepositories>>;

// ============================================================================
// BUG/ERROR ANALYSIS TOOL
// ============================================================================

/**
 * Analyze a bug report, error, or issue to find relevant commits and people to contact.
 * This performs semantic search on commits and repository works to find
 * code changes and experts related to the error.
 *
 * Works for: DIAL issues, JIRA tickets, stack traces, error messages, bug reports, etc.
 *
 * @param issueContent - The bug/error content (error description, stack traces, etc.)
 * @returns Relevant commits and recommended contacts
 */
export async function analyzeBugOrError(issueContent: string) {
  console.log("🔍 Analyzing bug/error...");

  // Search for relevant commits based on the issue content
  const relevantCommits = await searchCommitsByQuery(issueContent, 10, 0.25);
  console.log(`📝 Found ${relevantCommits.length} relevant commits`);

  // Search for repository works to find experts in the affected areas
  const relevantWorks = await searchRepositoryWorksByQuery(issueContent, 10, 0.25);
  console.log(`👥 Found ${relevantWorks.length} relevant repository works`);

  // Extract unique contributors from commits (potential issue causers/fixers)
  const commitAuthorsMap = new Map<
    string,
    {
      username: string;
      url: string;
      avatarUrl: string;
      summary: string | null;
      commitCount: number;
      relevantCommits: Array<{
        url: string;
        summary: string | null;
        message: string;
        authoredAt: Date | null;
        similarity: number;
      }>;
    }
  >();

  for (const commit of relevantCommits) {
    const existing = commitAuthorsMap.get(commit.contributor.username);
    const commitInfo = {
      url: commit.url,
      summary: commit.summary,
      message: commit.rawData.message,
      authoredAt: commit.authoredAt,
      similarity: commit.similarity,
    };

    if (existing) {
      existing.commitCount++;
      existing.relevantCommits.push(commitInfo);
    } else {
      commitAuthorsMap.set(commit.contributor.username, {
        username: commit.contributor.username,
        url: commit.contributor.url,
        avatarUrl: commit.contributor.avatarUrl,
        summary: commit.contributor.summary,
        commitCount: 1,
        relevantCommits: [commitInfo],
      });
    }
  }

  // Extract unique contributors from repository works (domain experts)
  const expertsMap = new Map<
    string,
    {
      username: string;
      url: string;
      avatarUrl: string;
      contributorSummary: string | null;
      workSummary: string | null;
      repository: { name: string; url: string };
      similarity: number;
    }
  >();

  for (const work of relevantWorks) {
    // Only add if not already in the map, or if this one has higher similarity
    const existing = expertsMap.get(work.contributor.username);
    if (!existing || work.similarity > existing.similarity) {
      expertsMap.set(work.contributor.username, {
        username: work.contributor.username,
        url: work.contributor.url,
        avatarUrl: work.contributor.avatarUrl,
        contributorSummary: work.contributor.summary,
        workSummary: work.summary,
        repository: {
          name: work.repository.name,
          url: work.repository.url,
        },
        similarity: work.similarity,
      });
    }
  }

  // Combine and deduplicate contacts - prioritize commit authors
  const commitAuthors = Array.from(commitAuthorsMap.values()).sort(
    (a, b) => b.commitCount - a.commitCount
  );

  const domainExperts = Array.from(expertsMap.values())
    .filter((expert) => !commitAuthorsMap.has(expert.username)) // Exclude those already in commit authors
    .sort((a, b) => b.similarity - a.similarity);

  return {
    success: true as const,
    analysis: {
      // Top commits that might be related to the issue
      relevantCommits: relevantCommits.slice(0, 5).map((commit) => ({
        url: commit.url,
        message: commit.rawData.message,
        summary: commit.summary,
        author: {
          username: commit.contributor.username,
          url: commit.contributor.url,
          avatarUrl: commit.contributor.avatarUrl,
        },
        repository: {
          name: commit.repository.name,
          url: commit.repository.url,
        },
        authoredAt: commit.authoredAt,
        similarity: commit.similarity,
      })),

      // People to contact - commit authors first (they made related changes)
      commitAuthors: commitAuthors.slice(0, 3).map((author) => ({
        username: author.username,
        url: author.url,
        avatarUrl: author.avatarUrl,
        summary: author.summary,
        relevantCommitCount: author.commitCount,
        topCommit: author.relevantCommits[0], // Show their most relevant commit
      })),

      // Domain experts who might help (from repository work summaries)
      domainExperts: domainExperts.slice(0, 3).map((expert) => ({
        username: expert.username,
        url: expert.url,
        avatarUrl: expert.avatarUrl,
        summary: expert.contributorSummary,
        workSummary: expert.workSummary,
        repository: expert.repository,
        similarity: expert.similarity,
      })),
    },
  };
}

/** Return type for analyzeBugOrError */
export type BugErrorAnalysisResult = Awaited<
  ReturnType<typeof analyzeBugOrError>
>;
