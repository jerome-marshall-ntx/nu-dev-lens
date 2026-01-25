import { searchContributorsByQuery } from "@/use-cases/contributor";
import "dotenv/config";

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
    if (similarity >= 0.5) relevanceEmoji = "🔥";
    else if (similarity >= 0.35) relevanceEmoji = "✨";
    else if (similarity >= 0.25) relevanceEmoji = "⭐";

    console.log(`\n${index + 1}. ${relevanceEmoji} ${result.username}`);
    console.log(`   Match: ${similarityBar} ${similarityPercent}%`);
    console.log(`   Profile: ${result.url}`);

    if (result.summary) {
      // Truncate summary if too long
      const summaryPreview =
        result.summary.length > 200
          ? result.summary.substring(0, 200) + "..."
          : result.summary;
      console.log(`   Summary: ${summaryPreview}`);
    }
  });

  console.log("\n" + "─".repeat(80));
  console.log("\n💡 Tip: Use more detailed queries for better matches!");
  console.log(
    '   Example: "frontend developer who works with React and TypeScript"',
  );
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
    console.log(
      '  pnpm tsx src/scripts/test-search.ts "your search query" [min-similarity]',
    );
    console.log("\nExamples:");
    console.log('  pnpm tsx src/scripts/test-search.ts "frontend developer"');
    console.log('  pnpm tsx src/scripts/test-search.ts "security expert" 0.3');
    console.log(
      '  pnpm tsx src/scripts/test-search.ts "someone who works with databases"',
    );
    console.log("\nTips for better results:");
    console.log(
      '  • Use detailed queries: "developer who works with React and TypeScript"',
    );
    console.log(
      '  • Match summary style: "someone who builds telemetry systems"',
    );
    console.log(
      "  • Adjust min-similarity: 0.2 (default), 0.3 (stricter), 0.4 (very strict)",
    );
    process.exit(1);
  }

  try {
    const results = await searchContributorsByQuery(query, 10, minSimilarity);
    displayResults(results);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Search failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
