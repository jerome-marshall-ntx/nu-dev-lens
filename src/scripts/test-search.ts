import "dotenv/config";
import { embeddingModel } from "@/ai/models";
import { db } from "@/server/db";
import { contributors } from "@/server/db/schema";
import { embed } from "ai";
import { cosineDistance, desc, isNotNull, sql } from "drizzle-orm";
import { EMBEDDING_DIMENSIONS } from "./embedding/embed.config";

/**
 * Simple test script to search for contributors using semantic search.
 * Uses embeddings and cosine similarity to find relevant contributors.
 * 
 * Usage:
 *   tsx src/scripts/test-search.ts "your search query"
 * 
 * Example:
 *   tsx src/scripts/test-search.ts "frontend developer who works with React"
 */

interface SearchResult {
  id: number;
  username: string;
  url: string;
  avatarUrl: string;
  summary: string | null;
  similarity: number;
}

/**
 * Searches for contributors based on a text query using semantic similarity.
 * @param query - The search query (e.g., "backend developer", "security expert")
 * @param limit - Maximum number of results to return (default: 10)
 * @param minSimilarity - Minimum similarity threshold (0-1, default: 0.2)
 * @returns Array of matching contributors with similarity scores
 */
async function searchContributors(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.2,
): Promise<SearchResult[]> {
  console.log(`\n🔍 Searching for: "${query}"\n`);

  // Step 1: Convert the search query into an embedding
  console.log("📊 Generating embedding for search query...");
  const { embedding: queryEmbedding } = await embed({
    model: embeddingModel,
    value: query,
    providerOptions: {
      ollama: {
        dimensions: EMBEDDING_DIMENSIONS,
      },
    },
  });

  console.log(`✓ Query embedding generated (${queryEmbedding.length} dimensions)\n`);

  // Step 2: Search the database using cosine similarity
  console.log("🔎 Searching database for similar contributors...");
  
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
    .orderBy(desc(sql`1 - (${cosineDistance(contributors.embedding, queryEmbedding)})`))
    .limit(limit * 2); // Get more results to filter

  // Filter by minimum similarity threshold
  const results = (allResults as SearchResult[])
    .filter(r => r.similarity >= minSimilarity)
    .slice(0, limit);

  return results;
}

/**
 * Displays search results in a readable format
 */
function displayResults(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log("❌ No results found. Make sure contributors have embeddings.");
    console.log("   Run: tsx src/scripts/embedding/embed.ts");
    return;
  }

  console.log(`✅ Found ${results.length} matching contributors:\n`);
  
  // Show relevance guide
  console.log("📊 Relevance Guide:");
  console.log("   🔥 50%+ = Highly relevant");
  console.log("   ✨ 35-50% = Good match");
  console.log("   ⭐ 25-35% = Somewhat related");
  console.log("   💫 Below 25% = Loosely related\n");
  
  console.log("─".repeat(80));

  results.forEach((result, index) => {
    const similarityPercent = (result.similarity * 100).toFixed(1);
    const similarity = result.similarity;
    
    // Dynamic bar length based on similarity (max 20 chars)
    const barLength = Math.round(similarity * 20);
    const similarityBar = "█".repeat(barLength);
    
    // Add emoji based on relevance
    let relevanceEmoji = "💫";
    if (similarity >= 0.50) relevanceEmoji = "🔥";
    else if (similarity >= 0.35) relevanceEmoji = "✨";
    else if (similarity >= 0.25) relevanceEmoji = "⭐";
    
    console.log(`\n${index + 1}. ${relevanceEmoji} ${result.username}`);
    console.log(`   Match: ${similarityBar} ${similarityPercent}%`);
    console.log(`   Profile: ${result.url}`);
    
    if (result.summary) {
      // Truncate summary if too long
      const summaryPreview = result.summary.length > 200 
        ? result.summary.substring(0, 200) + "..."
        : result.summary;
      console.log(`   Summary: ${summaryPreview}`);
    }
  });

  console.log("\n" + "─".repeat(80));
  console.log("\n💡 Tip: Use more detailed queries for better matches!");
  console.log('   Example: "frontend developer who works with React and TypeScript"');
}

/**
 * Main function - runs the search
 */
async function main() {
  const query = process.argv[2];
  const minSimilarity = process.argv[3] ? parseFloat(process.argv[3]) : 0.2;

  if (!query) {
    console.error("❌ Error: Please provide a search query");
    console.log("\nUsage:");
    console.log('  pnpm tsx src/scripts/test-search.ts "your search query" [min-similarity]');
    console.log("\nExamples:");
    console.log('  pnpm tsx src/scripts/test-search.ts "frontend developer"');
    console.log('  pnpm tsx src/scripts/test-search.ts "security expert" 0.3');
    console.log('  pnpm tsx src/scripts/test-search.ts "someone who works with databases"');
    console.log("\nTips for better results:");
    console.log('  • Use detailed queries: "developer who works with React and TypeScript"');
    console.log('  • Match summary style: "someone who builds telemetry systems"');
    console.log('  • Adjust min-similarity: 0.2 (default), 0.3 (stricter), 0.4 (very strict)');
    process.exit(1);
  }

  try {
    const results = await searchContributors(query, 10, minSimilarity);
    displayResults(results);
  } catch (error) {
    console.error("\n❌ Search failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
