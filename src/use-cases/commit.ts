import { embedQuery } from "@/ai/utils";
import { searchCommitsByEmbedding } from "@/data-access/commit";

/**
 * Searches for commits based on a text query using semantic similarity.
 * Includes contributor and repository information for each commit.
 * @param query - The search query (e.g., "authentication timeout", "memory leak fix")
 * @param limit - Maximum number of results to return (default: 10)
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.3)
 * @returns Array of matching commits with author and repository info, plus similarity scores
 */
export async function searchCommitsByQuery(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.3,
) {
  const queryEmbedding = await embedQuery(query);
  const results = await searchCommitsByEmbedding(
    queryEmbedding,
    limit,
    minSimilarity,
  );
  return results;
}
