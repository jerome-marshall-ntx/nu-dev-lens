import { summarizationModel } from "@/ai/models";
import { SUMMARIZE_CONTRIBUTOR_PROMPT } from "@/ai/prompts";
import { db } from "@/server/db";
import {
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { generateText } from "ai";
import { eq, isNull } from "drizzle-orm";
import { saveBackup } from "./summarize.backup";
import {
  BATCH_UPDATE_SIZE,
  CONCURRENT_REQUESTS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from "./summarize.config";
import { processInParallel, retryWithBackoff } from "../utils";
import {
  batchUpdateContributors,
  buildContributorInput,
} from "./summarize.utils";

/**
 * Summarizes contributors by aggregating repository work summaries.
 * Saves backups and updates the database in batches.
 */
export async function summarizeContributors(): Promise<void> {
  // Fetch contributors that need summaries
  const contributorsToProcess = await db
    .select()
    .from(contributors)
    .where(isNull(contributors.summary));

  const total = contributorsToProcess.length;
  console.log(`\n👤 Found ${total} contributors without summaries.`);

  if (total === 0) {
    console.log("✅ No contributors to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process contributors in parallel
  const summaries = await processInParallel(
    contributorsToProcess,
    async (contributor, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing contributor ID ${contributor.id} (${contributor.username})...`,
      );

      // Fetch all repository work summaries for this contributor
      const workSummariesData = await db
        .select({
          summary: repositoryWorks.summary,
          repoName: repositories.name,
        })
        .from(repositoryWorks)
        .innerJoin(
          repositories,
          eq(repositoryWorks.repositoryId, repositories.id),
        )
        .where(eq(repositoryWorks.contributorId, contributor.id));

      const workSummaries = workSummariesData
        .map((w) => ({ repoName: w.repoName, summary: w.summary }))
        .filter((w) => w.summary !== null) as Array<{
        repoName: string;
        summary: string;
      }>;

      if (workSummaries.length === 0) {
        console.log(
          `⚠️  Contributor ${contributor.username} has no repository work summaries, skipping...`,
        );
        return undefined;
      }

      const prompt = buildContributorInput(workSummaries);

      if (!prompt) {
        console.log(
          `⚠️  Contributor ${contributor.username} has no valid repository work summaries, skipping...`,
        );
        return undefined;
      }

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_CONTRIBUTOR_PROMPT,
            prompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      return { id: contributor.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Filter out undefined results
  const validSummaries = summaries.filter(
    (s): s is { id: number; summary: string } => s !== undefined,
  );

  // Save summaries to JSON file as backup (before database save)
  const backupPath = saveBackup({
    summaries: validSummaries,
    filename: "contributor-summaries",
    metadata: {
      totalContributors: total,
    },
  });

  // Batch update database
  console.log(
    `💾 Updating ${validSummaries.length} contributor summaries in database...`,
  );

  try {
    await batchUpdateContributors(validSummaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - validSummaries.length;

  console.log(
    `✅ Done summarizing ${validSummaries.length}/${total} contributors in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} contributors failed to summarize.`);
  }
}
