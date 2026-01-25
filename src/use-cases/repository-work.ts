import { embedQuery } from "@/ai/utils";
import { searchRepositoryWorksByEmbedding } from "@/data-access/repository-work";

/**
 * Searches for repository works based on a text query using semantic similarity.
 * @param query - The search query (e.g., "backend development", "security fixes")
 * @param limit - Maximum number of results to return (default: 10)
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.2)
 * @returns Array of matching repository works with similarity scores
 */
export async function searchRepositoryWorksByQuery(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.2,
) {
  const queryEmbedding = await embedQuery(query);
  const results = await searchRepositoryWorksByEmbedding(
    queryEmbedding,
    limit,
    minSimilarity,
  );
  return results;
}
