// Load environment variables FIRST before any other imports
// Using dotenv/config ensures .env is loaded before env.js validation
import "dotenv/config";

import { embedCommits } from "./embed.commits";
import { embedContributors } from "./embed.contributors";
import { embedRepositoryWorks } from "./embed.repository-works";

/**
 * Main entry point for the embedding script.
 * Orchestrates embedding generation for:
 * 1. Commits (Level 1) - embed their summaries
 * 2. Repository Works (Level 2) - embed their summaries
 * 3. Contributors (Level 3) - embed their summaries
 */
const main = async () => {
  try {
    // Phase 1: Embed commits (Level 1)
    await embedCommits();

    // Phase 2: Embed repository works (Level 2)
    await embedRepositoryWorks();

    // Phase 3: Embed contributors (Level 3)
    await embedContributors();

    console.log("\n🎉 All embedding complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
