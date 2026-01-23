import { embeddingModel } from "@/ai/models";
import { db } from "@/server/db";
import { repositoryWorks } from "@/server/db/schema";
import { embedMany } from "ai";
import { isNull } from "drizzle-orm";
import {
  BATCH_UPDATE_SIZE,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  MAX_PARALLEL_CALLS,
  MAX_RETRIES,
} from "./embed.config";
import { batchUpdateRepositoryWorkEmbeddings } from "./embed.utils";

/**
 * Generates embeddings for repository works based on their summaries.
 * Only processes repository works that have summaries but no embeddings yet.
 * Uses embedMany for efficient batch processing with parallel API calls.
 */
export async function embedRepositoryWorks(): Promise<void> {
  // Fetch repository works that have summaries but no embeddings
  const repoWorksToProcess = await db
    .select()
    .from(repositoryWorks)
    .where(isNull(repositoryWorks.embedding));

  // Filter to only those with summaries
  const repoWorksWithSummaries = repoWorksToProcess.filter(
    (rw) => rw.summary && rw.summary.trim().length > 0,
  );

  const total = repoWorksWithSummaries.length;
  console.log(`\n📦 Found ${total} repository works without embeddings.`);

  if (total === 0) {
    console.log("✅ No repository works to embed.");
    return;
  }

  const startTime = Date.now();
  const allEmbeddings: Array<{ id: number; embedding: number[] }> = [];

  // Process repository works in batches
  for (let i = 0; i < repoWorksWithSummaries.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = repoWorksWithSummaries.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / EMBEDDING_BATCH_SIZE);
    const progress = ((i + batch.length) / total) * 100;

    console.log(
      `🔮 [Batch ${batchNum}/${totalBatches}] (${progress.toFixed(1)}%) Processing ${batch.length} repository works...`,
    );

    // Extract summaries and IDs for this batch
    const summaries = batch.map((rw) => rw.summary!);
    const ids = batch.map((rw) => rw.id);

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

      // Map embeddings back to repository work IDs
      for (let j = 0; j < embeddings.length; j++) {
        allEmbeddings.push({
          id: ids[j]!,
          embedding: embeddings[j]!,
        });
      }

      console.log(`   ✓ Successfully embedded ${embeddings.length} repository works`);
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
    `💾 Updating ${allEmbeddings.length} repository work embeddings in database...`,
  );

  try {
    await batchUpdateRepositoryWorkEmbeddings(
      allEmbeddings,
      BATCH_UPDATE_SIZE,
    );
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - allEmbeddings.length;

  console.log(
    `✅ Done embedding ${allEmbeddings.length}/${total} repository works in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} repository works failed to embed.`);
  }
}
