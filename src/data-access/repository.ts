import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { count, desc, eq, inArray, sql } from "drizzle-orm";

/**
 * Get all repositories with their commit counts.
 * Used for the repositories list page.
 */
export async function getAllRepositoriesWithStats() {
  // First get all repositories
  const allRepositories = await db
    .select({
      id: repositories.id,
      name: repositories.name,
      description: repositories.description,
      url: repositories.url,
      createdAt: repositories.createdAt,
    })
    .from(repositories);

  // If no repositories, return empty array
  if (allRepositories.length === 0) {
    return [];
  }

  // Get commit counts per repository
  const repoIds = allRepositories.map((r) => r.id);
  const commitCounts = await db
    .select({
      repositoryId: repositoryWorks.repositoryId,
      count: count(commits.id),
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(inArray(repositoryWorks.repositoryId, repoIds))
    .groupBy(repositoryWorks.repositoryId);

  // Create lookup map
  const commitCountMap = new Map(
    commitCounts.map((c) => [c.repositoryId, Number(c.count)])
  );

  // Combine data
  const results = allRepositories.map((repo) => ({
    ...repo,
    commitCount: commitCountMap.get(repo.id) ?? 0,
  }));

  // Sort by commit count descending
  results.sort((a, b) => b.commitCount - a.commitCount);

  return results;
}

/** Type for repository with stats */
export type RepositoryWithStats = Awaited<
  ReturnType<typeof getAllRepositoriesWithStats>
>[number];

/**
 * Get a single repository by name.
 * Used for looking up repositories by name in AI tool calls.
 * @param name - The repository name to search for (case-insensitive)
 */
export async function getRepositoryByName(name: string) {
  const repository = await db.query.repositories.findFirst({
    where: sql`LOWER(${repositories.name}) = LOWER(${name})`,
  });

  return repository ?? null;
}

/** Type for repository by name result */
export type RepositoryByName = NonNullable<
  Awaited<ReturnType<typeof getRepositoryByName>>
>;

/**
 * Get a single repository by ID with full details.
 * Used for the repository details page.
 */
export async function getRepositoryById(id: number) {
  const repository = await db.query.repositories.findFirst({
    where: eq(repositories.id, id),
  });

  if (!repository) {
    return null;
  }

  // Get commit count
  const [commitCount] = await db
    .select({ count: count(commits.id) })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(eq(repositoryWorks.repositoryId, repository.id));

  // Get contributor count
  const [contributorCount] = await db
    .select({ count: sql<number>`count(distinct ${repositoryWorks.contributorId})` })
    .from(repositoryWorks)
    .where(eq(repositoryWorks.repositoryId, repository.id));

  return {
    id: repository.id,
    name: repository.name,
    description: repository.description,
    url: repository.url,
    createdAt: repository.createdAt,
    commitCount: Number(commitCount?.count ?? 0),
    contributorCount: Number(contributorCount?.count ?? 0),
  };
}

/** Type for repository details */
export type RepositoryDetails = NonNullable<
  Awaited<ReturnType<typeof getRepositoryById>>
>;

/**
 * Get a repository's recent commits with contributor info.
 * @param repositoryId - The repository's ID
 * @param limit - Maximum number of commits to return (default: 10)
 */
export async function getRepositoryRecentCommits(
  repositoryId: number,
  limit: number = 10
) {
  const results = await db
    .select({
      id: commits.id,
      url: commits.url,
      summary: commits.summary,
      rawData: commits.rawData,
      createdAt: commits.createdAt,
      contributorId: contributors.id,
      contributorUsername: contributors.username,
      contributorAvatarUrl: contributors.avatarUrl,
      contributorUrl: contributors.url,
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(contributors, eq(repositoryWorks.contributorId, contributors.id))
    .where(eq(repositoryWorks.repositoryId, repositoryId))
    .orderBy(desc(commits.createdAt))
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    url: r.url,
    summary: r.summary,
    rawData: r.rawData,
    createdAt: r.createdAt,
    contributor: {
      id: r.contributorId,
      username: r.contributorUsername,
      avatarUrl: r.contributorAvatarUrl,
      url: r.contributorUrl,
    },
  }));
}

/** Type for repository commit */
export type RepositoryCommit = Awaited<
  ReturnType<typeof getRepositoryRecentCommits>
>[number];

/**
 * Get a repository's key contributors (top contributors by commit count).
 * @param repositoryId - The repository's ID
 * @param limit - Maximum number of contributors to return (default: 6)
 */
export async function getRepositoryKeyContributors(
  repositoryId: number,
  limit: number = 6
) {
  // Get contributors with their commit counts for this repository
  const results = await db
    .select({
      id: contributors.id,
      username: contributors.username,
      url: contributors.url,
      avatarUrl: contributors.avatarUrl,
      summary: contributors.summary,
      commitCount: count(commits.id),
    })
    .from(contributors)
    .innerJoin(repositoryWorks, eq(repositoryWorks.contributorId, contributors.id))
    .innerJoin(commits, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(eq(repositoryWorks.repositoryId, repositoryId))
    .groupBy(contributors.id)
    .orderBy(desc(count(commits.id)))
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    username: r.username,
    url: r.url,
    avatarUrl: r.avatarUrl,
    summary: r.summary,
    commitCount: Number(r.commitCount),
  }));
}

/** Type for repository contributor */
export type RepositoryContributor = Awaited<
  ReturnType<typeof getRepositoryKeyContributors>
>[number];

/**
 * Get all repository names and descriptions.
 * Used to provide product context for search query generation.
 */
export async function getAllRepositoryDescriptions() {
  const repos = await db
    .select({
      name: repositories.name,
      description: repositories.description,
    })
    .from(repositories);

  return repos;
}
