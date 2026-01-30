import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { cosineDistance, count, countDistinct, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

export const getContributorById = async (id: number) => {
  const contributor = await db.query.contributors.findFirst({
    where: eq(contributors.id, id),
  });
  return contributor;
};

/**
 * Searches for contributors based on semantic similarity to a query embedding.
 * @param queryEmbedding - The embedding vector to search against
 * @param limit - Maximum number of results to return
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.2)
 * @returns Array of contributors with similarity scores
 */
export const searchContributorsByEmbedding = async (
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.2,
) => {
  const allResults = await db
    .select({
      id: contributors.id,
      username: contributors.username,
      url: contributors.url,
      avatarUrl: contributors.avatarUrl,
      summary: contributors.summary,
      // Calculate similarity score (1 - cosine distance = cosine similarity)
      // Cosine similarity ranges from -1 to 1, where 1 means identical
      similarity: sql<number>`1 - (${cosineDistance(contributors.embedding, queryEmbedding)})`,
    })
    .from(contributors)
    .where(isNotNull(contributors.embedding)) // Only search contributors with embeddings
    .orderBy(
      desc(
        sql`1 - (${cosineDistance(contributors.embedding, queryEmbedding)})`,
      ),
    )
    .limit(limit * 2); // Get more results to filter

  // Filter by minimum similarity threshold and limit to requested amount
  const results = allResults
    .filter((r) => r.similarity >= minSimilarity)
    .slice(0, limit);

  return results;
};

/**
 * Get all contributors with their repository and commit counts.
 * Used for the contributors list page.
 */
export async function getAllContributorsWithStats() {
  // First get all contributors
  const allContributors = await db
    .select({
      id: contributors.id,
      username: contributors.username,
      url: contributors.url,
      avatarUrl: contributors.avatarUrl,
      summary: contributors.summary,
    })
    .from(contributors);

  // Get repository counts per contributor
  const repoCounts = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      count: countDistinct(repositoryWorks.repositoryId),
    })
    .from(repositoryWorks)
    .groupBy(repositoryWorks.contributorId);

  // Get commit counts per contributor
  const commitCounts = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      count: count(commits.id),
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .groupBy(repositoryWorks.contributorId);

  // Create lookup maps
  const repoCountMap = new Map(repoCounts.map((r) => [r.contributorId, Number(r.count)]));
  const commitCountMap = new Map(commitCounts.map((c) => [c.contributorId, Number(c.count)]));

  // Combine data
  const results = allContributors.map((contributor) => ({
    ...contributor,
    repositoryCount: repoCountMap.get(contributor.id) ?? 0,
    commitCount: commitCountMap.get(contributor.id) ?? 0,
  }));

  // Sort by commit count descending
  results.sort((a, b) => b.commitCount - a.commitCount);

  return results;
}

/** Type for contributor with stats */
export type ContributorWithStats = Awaited<
  ReturnType<typeof getAllContributorsWithStats>
>[number];

/**
 * Get a single contributor by username with full details.
 * Used for the contributor details page.
 */
export async function getContributorByUsername(username: string) {
  const contributor = await db.query.contributors.findFirst({
    where: eq(contributors.username, username),
  });

  if (!contributor) {
    return null;
  }

  // Get repository count
  const [repoCount] = await db
    .select({ count: countDistinct(repositoryWorks.repositoryId) })
    .from(repositoryWorks)
    .where(eq(repositoryWorks.contributorId, contributor.id));

  // Get commit count
  const [commitCount] = await db
    .select({ count: count(commits.id) })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(eq(repositoryWorks.contributorId, contributor.id));

  return {
    id: contributor.id,
    username: contributor.username,
    url: contributor.url,
    avatarUrl: contributor.avatarUrl,
    summary: contributor.summary,
    createdAt: contributor.createdAt,
    repositoryCount: Number(repoCount?.count ?? 0),
    commitCount: Number(commitCount?.count ?? 0),
  };
}

/** Type for contributor details */
export type ContributorDetails = NonNullable<
  Awaited<ReturnType<typeof getContributorByUsername>>
>;

/**
 * Get a contributor's repository works with repository details.
 * Shows what the contributor did in each repository.
 */
export async function getContributorRepositories(contributorId: number) {
  // Get repository works with repo info
  const repoWorks = await db
    .select({
      id: repositoryWorks.id,
      summary: repositoryWorks.summary,
      repositoryId: repositories.id,
      repositoryName: repositories.name,
      repositoryDescription: repositories.description,
      repositoryUrl: repositories.url,
    })
    .from(repositoryWorks)
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .where(eq(repositoryWorks.contributorId, contributorId));

  // If no repo works, return empty array
  if (repoWorks.length === 0) {
    return [];
  }

  // Get commit counts per repository work using inArray
  const repoWorkIds = repoWorks.map((rw) => rw.id);
  const commitCounts = await db
    .select({
      repositoryWorkId: commits.repositoryWorkId,
      count: count(commits.id),
    })
    .from(commits)
    .where(inArray(commits.repositoryWorkId, repoWorkIds))
    .groupBy(commits.repositoryWorkId);

  const commitCountMap = new Map(
    commitCounts.map((c) => [c.repositoryWorkId, Number(c.count)]),
  );

  const results = repoWorks.map((rw) => ({
    id: rw.id,
    summary: rw.summary,
    repository: {
      id: rw.repositoryId,
      name: rw.repositoryName,
      description: rw.repositoryDescription,
      url: rw.repositoryUrl,
    },
    commitCount: commitCountMap.get(rw.id) ?? 0,
  }));

  // Sort by commit count descending
  results.sort((a, b) => b.commitCount - a.commitCount);

  return results;
}

/** Type for contributor repository work */
export type ContributorRepository = Awaited<
  ReturnType<typeof getContributorRepositories>
>[number];

/**
 * Get a contributor's recent commits with repository info.
 * @param contributorId - The contributor's ID
 * @param limit - Maximum number of commits to return (default: 20)
 */
export async function getContributorCommits(
  contributorId: number,
  limit: number = 20,
) {
  const results = await db
    .select({
      id: commits.id,
      url: commits.url,
      summary: commits.summary,
      rawData: commits.rawData,
      createdAt: sql<Date>`COALESCE(${commits.authoredAt}, ${commits.createdAt})`.as("createdAt"),
      repositoryId: repositories.id,
      repositoryName: repositories.name,
      repositoryUrl: repositories.url,
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .where(eq(repositoryWorks.contributorId, contributorId))
    .orderBy(desc(sql`COALESCE(${commits.authoredAt}, ${commits.createdAt})`))
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    url: r.url,
    summary: r.summary,
    rawData: r.rawData,
    createdAt: r.createdAt,
    repository: {
      id: r.repositoryId,
      name: r.repositoryName,
      url: r.repositoryUrl,
    },
  }));
}

/** Type for contributor commit */
export type ContributorCommit = Awaited<
  ReturnType<typeof getContributorCommits>
>[number];
