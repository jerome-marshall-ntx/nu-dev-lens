import { db } from "@/server/db";
import {
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { cosineDistance, desc, eq, isNotNull, sql } from "drizzle-orm";

/**
 * Searches for repository works based on semantic similarity to a query embedding.
 * @param queryEmbedding - The embedding vector to search against
 * @param limit - Maximum number of results to return
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.2)
 * @returns Array of repository works with similarity scores
 */
export const searchRepositoryWorksByEmbedding = async (
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.2,
) => {
  const allResults = await db
    .select({
      id: repositoryWorks.id,
      repositoryId: repositoryWorks.repositoryId,
      contributorId: repositoryWorks.contributorId,
      summary: repositoryWorks.summary,
      // Contributor information
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
      // Cosine similarity ranges from -1 to 1, where 1 means identical
      similarity: sql<number>`1 - (${cosineDistance(repositoryWorks.embedding, queryEmbedding)})`,
    })
    .from(repositoryWorks)
    .innerJoin(
      contributors,
      eq(repositoryWorks.contributorId, contributors.id),
    )
    .innerJoin(
      repositories,
      eq(repositoryWorks.repositoryId, repositories.id),
    )
    .where(isNotNull(repositoryWorks.embedding)) // Only search repository works with embeddings
    .orderBy(
      desc(
        sql`1 - (${cosineDistance(repositoryWorks.embedding, queryEmbedding)})`,
      ),
    )
    .limit(limit * 2); // Get more results to filter

  // Filter by minimum similarity threshold and limit to requested amount
  const results = allResults
    .filter((r) => r.similarity >= minSimilarity)
    .slice(0, limit);

  return results;
};
