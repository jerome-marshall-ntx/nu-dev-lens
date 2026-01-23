import { config } from "dotenv";
import { summarizeContributors } from "./summarize.contributors";

config();

/**
 * Main entry point for the summarization script.
 * Orchestrates the three phases of summarization:
 * 1. Commits (Level 1)
 * 2. Repository Works (Level 2) - depends on Level 1
 * 3. Contributors (Level 3) - depends on Level 2
 */
const main = async () => {
  try {
    // Phase 1: Summarize commits (Level 1)
    // await summarizeCommits();

    // Phase 2: Summarize repository works (Level 2) - depends on Level 1
    // await summarizeRepositoryWorks();

    // Phase 3: Summarize contributors (Level 3) - depends on Level 2
    await summarizeContributors();

    console.log("\n🎉 All summarization complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
