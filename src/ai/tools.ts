import { getContributorByUsername } from "@/data-access/contributor";
import {
  getAllRepositoriesWithStats,
  getRepositoryByName,
  getRepositoryKeyContributors,
} from "@/data-access/repository";
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
