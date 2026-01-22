import { summarizationModel } from "@/ai/models";
import {
  SUMMARIZE_REPO_WORK_CHUNK_PROMPT,
  SUMMARIZE_REPOSITORY_WORK_PROMPT,
} from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, repositories, repositoryWorks } from "@/server/db/schema";
import { generateText } from "ai";
import { eq, isNull } from "drizzle-orm";
import { saveBackup } from "./summarize.backup";
import {
  BATCH_UPDATE_SIZE,
  CONCURRENT_REQUESTS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from "./summarize.config";
import {
  batchUpdateRepositoryWorks,
  buildChunkInput,
  buildRepositoryInfo,
  buildRepositoryWorkInput,
  isWithinContextLimit,
  processInParallel,
  retryWithBackoff,
  splitCommitSummariesByTokens,
} from "./summarize.utils";

/**
 * Summarizes repository works by aggregating commit summaries.
 * Saves backups and updates the database in batches.
 */
export async function summarizeRepositoryWorks(): Promise<void> {
  // Fetch repository works that need summaries, with their repository info
  const repoWorksToProcess = await db
    .select({
      repoWork: repositoryWorks,
      repository: {
        name: repositories.name,
        description: repositories.description,
      },
    })
    .from(repositoryWorks)
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .where(isNull(repositoryWorks.summary));

  const total = repoWorksToProcess.length;
  console.log(`\n📦 Found ${total} repository works without summaries.`);

  if (total === 0) {
    console.log("✅ No repository works to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process repository works in parallel
  const summaries = await processInParallel(
    repoWorksToProcess,
    async ({ repoWork, repository }, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing repository work ID ${repoWork.id}...`,
      );

      // Fetch all commit summaries for this repository work
      const commitSummariesData = await db
        .select({ summary: commits.summary })
        .from(commits)
        .where(eq(commits.repositoryWorkId, repoWork.id));

      const commitSummaries = commitSummariesData
        .map((c) => c.summary)
        .filter((s): s is string => !!s);

      if (commitSummaries.length === 0) {
        console.log(
          `⚠️  Repository work ${repoWork.id} has no commit summaries, skipping...`,
        );
        return undefined;
      }

      const repositoryInfo = buildRepositoryInfo(repository);
      const prompt = buildRepositoryWorkInput(repositoryInfo, commitSummaries);

      if (!prompt) {
        console.log(
          `⚠️  Repository work ${repoWork.id} has no valid commit summaries, skipping...`,
        );
        return undefined;
      }

      // Check if the prompt fits within context limit
      if (isWithinContextLimit(prompt)) {
        // Standard path: all commits fit in one request
        const summary = await retryWithBackoff(
          async () => {
            const result = await generateText({
              model: summarizationModel,
              system: SUMMARIZE_REPOSITORY_WORK_PROMPT,
              prompt,
            });
            return result.text;
          },
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );

        return { id: repoWork.id, summary };
      }

      // Chunked path: too many commits, need to split and summarize in stages
      console.log(
        `📊 Repository work ${repoWork.id} has ${commitSummaries.length} commits, chunking...`,
      );

      const chunks = splitCommitSummariesByTokens(commitSummaries);
      console.log(`   Split into ${chunks.length} chunks`);

      // Stage 1: Summarize each chunk
      const chunkSummaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk || chunk.length === 0) continue;

        const chunkPrompt = buildChunkInput(
          repositoryInfo,
          chunk,
          i + 1,
          chunks.length,
        );

        const chunkSummary = await retryWithBackoff(
          async () => {
            const result = await generateText({
              model: summarizationModel,
              system: SUMMARIZE_REPO_WORK_CHUNK_PROMPT,
              prompt: chunkPrompt,
            });
            return result.text;
          },
          MAX_RETRIES,
          RETRY_DELAY_MS,
        );

        chunkSummaries.push(chunkSummary);
        console.log(`   ✓ Chunk ${i + 1}/${chunks.length} summarized`);
      }

      // Stage 2: Combine chunk summaries into final summary
      const combinedPrompt = buildRepositoryWorkInput(
        repositoryInfo,
        chunkSummaries,
      );

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_REPOSITORY_WORK_PROMPT,
            prompt: combinedPrompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      console.log(`   ✓ Final summary generated from ${chunks.length} chunks`);
      return { id: repoWork.id, summary };
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
    filename: "repository-work-summaries",
    metadata: {
      totalRepositoryWorks: total,
    },
  });

  // Batch update database
  console.log(
    `💾 Updating ${validSummaries.length} repository work summaries in database...`,
  );

  try {
    await batchUpdateRepositoryWorks(validSummaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - validSummaries.length;

  console.log(
    `✅ Done summarizing ${validSummaries.length}/${total} repository works in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} repository works failed to summarize.`);
  }
}
