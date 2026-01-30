import { embeddingModel } from "@/ai/models";
import { db } from "@/server/db";
import { commits } from "@/server/db/schema";
import { embedMany } from "ai";
import { isNull } from "drizzle-orm";
import {
  BATCH_UPDATE_SIZE,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  MAX_PARALLEL_CALLS,
  MAX_RETRIES,
} from "./embed.config";
import { batchUpdateCommitEmbeddings } from "./embed.utils";

/**
 * Generates embeddings for commits based on their summaries.
 * Only processes commits that have summaries but no embeddings yet.
 * Uses embedMany for efficient batch processing with parallel API calls.
 */
export async function embedCommits(): Promise<void> {
  // Fetch commits that have summaries but no embeddings
  const commitsToProcess = await db
    .select()
    .from(commits)
    .where(isNull(commits.embedding));

  // Filter to only those with summaries
  const commitsWithSummaries = commitsToProcess.filter(
    (c) => c.summary && c.summary.trim().length > 0,
  );

  const total = commitsWithSummaries.length;
  console.log(`\n📝 Found ${total} commits without embeddings.`);

  if (total === 0) {
    console.log("✅ No commits to embed.");
    return;
  }

  const startTime = Date.now();
  const allEmbeddings: Array<{ id: number; embedding: number[] }> = [];

  // Process commits in batches
  for (let i = 0; i < commitsWithSummaries.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = commitsWithSummaries.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / EMBEDDING_BATCH_SIZE);
    const progress = ((i + batch.length) / total) * 100;

    console.log(
      `🔮 [Batch ${batchNum}/${totalBatches}] (${progress.toFixed(1)}%) Processing ${batch.length} commits...`,
    );

    // Extract summaries and IDs for this batch
    const summaries = batch.map((c) => c.summary!);
    const ids = batch.map((c) => c.id);

    try {
      // Use embedMany with parallel processing
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: summaries,
        maxParallelCalls: MAX_PARALLEL_CALLS,
        maxRetries: MAX_RETRIES,
        providerOptions: {
          ollama: {
            dimensions: EMBEDDING_DIMENSIONS,
          },
        },
      });

      // Map embeddings back to commit IDs
      for (let j = 0; j < embeddings.length; j++) {
        allEmbeddings.push({
          id: ids[j]!,
          embedding: embeddings[j]!,
        });
      }

      console.log(`   ✓ Successfully embedded ${embeddings.length} commits`);
    } catch (error) {
      console.error(
        `   ❌ Error embedding batch ${batchNum}:`,
        (error as Error).message,
      );
      // Continue with next batch instead of failing completely
    }
  }

  // Batch update database
  console.log(
    `💾 Updating ${allEmbeddings.length} commit embeddings in database...`,
  );

  try {
    await batchUpdateCommitEmbeddings(allEmbeddings, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - allEmbeddings.length;

  console.log(
    `✅ Done embedding ${allEmbeddings.length}/${total} commits in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} commits failed to embed.`);
  }
}
