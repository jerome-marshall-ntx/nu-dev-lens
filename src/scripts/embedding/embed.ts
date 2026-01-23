// Load environment variables FIRST before any other imports
// Using dotenv/config ensures .env is loaded before env.js validation
import "dotenv/config";

import { embedContributors } from "./embed.contributors";

/**
 * Main entry point for the embedding script.
 * Orchestrates embedding generation for:
 * 1. Repository Works (Level 2) - embed their summaries
 * 2. Contributors (Level 3) - embed their summaries
 */
const main = async () => {
  try {
    // Phase 1: Embed repository works (Level 2)
    // await embedRepositoryWorks();

    // Phase 2: Embed contributors (Level 3)
    await embedContributors();

    console.log("\n🎉 All embedding complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
