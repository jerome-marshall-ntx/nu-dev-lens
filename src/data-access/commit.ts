import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { cosineDistance, desc, eq, isNotNull, sql } from "drizzle-orm";

/**
 * Searches for commits based on semantic similarity to a query embedding.
 * Includes contributor and repository information for each commit.
 * @param queryEmbedding - The embedding vector to search against
 * @param limit - Maximum number of results to return
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.3)
 * @returns Array of commits with author and repository info, plus similarity scores
 */
export const searchCommitsByEmbedding = async (
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.3,
) => {
  const allResults = await db
    .select({
      id: commits.id,
      url: commits.url,
      summary: commits.summary,
      rawData: commits.rawData,
      authoredAt: commits.authoredAt,
      createdAt: commits.createdAt,
      // Contributor (author) information
      contributor: {
        id: contributors.id,
        username: contributors.username,
        url: contributors.url,
        avatarUrl: contributors.avatarUrl,
        summary: contributors.summary,
      },
      // Repository information
      repository: {
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        url: repositories.url,
      },
      // Calculate similarity score (1 - cosine distance = cosine similarity)
      similarity: sql<number>`1 - (${cosineDistance(commits.embedding, queryEmbedding)})`,
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(contributors, eq(repositoryWorks.contributorId, contributors.id))
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .where(isNotNull(commits.embedding)) // Only search commits with embeddings
    .orderBy(
      desc(sql`1 - (${cosineDistance(commits.embedding, queryEmbedding)})`),
    )
    .limit(limit * 2); // Get more results to filter

  // Filter by minimum similarity threshold and limit to requested amount
  const results = allResults
    .filter((r) => r.similarity >= minSimilarity)
    .slice(0, limit)
    // Strip diff_patch and files_changed from rawData to reduce noise in AI context
    .map((r) => ({
      ...r,
      rawData: {
        ...r.rawData,
        diff_patch: undefined,
        files_changed: undefined,
      },
    }));

  return results;
};

/** Type for commit search result */
export type CommitSearchResult = Awaited<
  ReturnType<typeof searchCommitsByEmbedding>
>[number];
