import { db } from "@/server/db";
import { contributors } from "@/server/db/schema";
import { cosineDistance, desc, eq, isNotNull, sql } from "drizzle-orm";

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
      similarity: sql<number>`1 - (${cosineDistance(contributors.embedding, queryEmbedding)})`
    })
    .from(contributors)
    .where(isNotNull(contributors.embedding)) // Only search contributors with embeddings
    .orderBy(desc(sql`1 - (${cosineDistance(contributors.embedding, queryEmbedding)})`))
    .limit(limit * 2); // Get more results to filter

  // Filter by minimum similarity threshold and limit to requested amount
  const results = allResults
    .filter(r => r.similarity >= minSimilarity)
    .slice(0, limit);

  return results;
};