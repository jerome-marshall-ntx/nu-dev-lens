import { summarizationModel } from "@/ai/models";
import { SUMMARIZE_COMMIT_PROMPT } from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, repositories, repositoryWorks } from "@/server/db/schema";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { processInParallel, retryWithBackoff } from "../utils";
import { saveBackup } from "./summarize.backup";
import {
  BATCH_UPDATE_SIZE,
  CONCURRENT_REQUESTS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from "./summarize.config";
import {
  batchUpdateCommits,
  buildCommitInfo,
  buildRepositoryInfo,
} from "./summarize.utils";

/**
 * Summarizes commits by fetching them from the database and generating
 * AI summaries. Saves backups and updates the database in batches.
 */
export async function summarizeCommits(): Promise<void> {
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
    .innerJoin(
      repositoryWorks,
      eq(commits.repositoryWorkId, repositoryWorks.id),
    )
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id));
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
  const backupPath = saveBackup({
    summaries,
    filename: "commit-summaries",
    metadata: {
      totalCommits: total,
    },
  });

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
}
