import { embedQuery } from "@/ai/utils";
import { searchContributorsByEmbedding } from "@/data-access/contributor";

/**
 * Searches for contributors based on a text query using semantic similarity.
 * @param query - The search query (e.g., "backend developer", "security expert")
 * @param limit - Maximum number of results to return (default: 10)
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.2)
 * @returns Array of matching contributors with similarity scores
 */
export async function searchContributorsByQuery(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.2,
) {
  const queryEmbedding = await embedQuery(query);
  const results = await searchContributorsByEmbedding(queryEmbedding, limit, minSimilarity);
  return results;
}