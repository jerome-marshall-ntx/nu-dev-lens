import { summarizationModel } from "@/ai/models";
import { SUMMARIZE_COMMIT_PROMPT } from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, repositories, repositoryWorks } from "@/server/db/schema";
import { generateText } from "ai";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  batchUpdateCommits,
  buildCommitInfo,
  buildRepositoryInfo,
  processInParallel,
  retryWithBackoff,
} from "./summarize.utils";

config();

// Directory for backup JSON files
const BACKUP_DIR = "data/summaries-backup";

// Configuration
const CONCURRENT_REQUESTS = 15; // Process 15 summaries in parallel
const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const summarizeCommits = async () => {
  // Fetch commits with their associated repository info via repositoryWork
  const commitsWithRepo = await db
    .select({
      commit: commits,
      repository: {
        name: repositories.name,
        description: repositories.description,
      },
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
  // .where(isNull(commits.summary));

  const total = commitsWithRepo.length;
  console.log(`Found ${total} commits without summaries.`);

  if (total === 0) {
    console.log("✅ No commits to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process commits in parallel
  const summaries = await processInParallel(
    commitsWithRepo,
    async ({ commit, repository }, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing commit ID ${commit.id}...`,
      );

      const repositoryInfo = buildRepositoryInfo(repository);
      const commitInfo = buildCommitInfo(commit.rawData);
      const prompt = `${repositoryInfo}${commitInfo}`;
      // console.log(`Prompt: ${prompt}`);

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_COMMIT_PROMPT,
            prompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      return { id: commit.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Save summaries to JSON file as backup (before database save)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `commit-summaries-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    generatedAt: new Date().toISOString(),
    totalCommits: total,
    successfulSummaries: summaries.length,
    summaries: summaries,
  };

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📁 Backup saved to: ${backupPath}`);

  // Batch update database
  console.log(
    `💾 Updating ${summaries.length} commit summaries in database...`,
  );

  try {
    await batchUpdateCommits(summaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - summaries.length;

  console.log(
    `✅ Done summarizing ${summaries.length}/${total} commits in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} commits failed to summarize.`);
  }
};

const main = async () => {
  try {
    await summarizeCommits();
    console.log("\n🎉 All summarization complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
