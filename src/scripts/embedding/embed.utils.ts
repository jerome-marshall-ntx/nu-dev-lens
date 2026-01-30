import { db } from "@/server/db";
import { commits, contributors, repositoryWorks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { BATCH_UPDATE_SIZE } from "./embed.config";

/**
 * Batch updates contributor embeddings efficiently.
 * Groups updates together to reduce database load and improve performance.
 */
export async function batchUpdateContributorEmbeddings(
  updates: Array<{ id: number; embedding: number[] }>,
  batchSize = BATCH_UPDATE_SIZE,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(contributors)
          .set({ embedding: update.embedding })
          .where(eq(contributors.id, update.id)),
      ),
    );
  }
}

/**
 * Batch updates repository work embeddings efficiently.
 * Groups updates together to reduce database load and improve performance.
 */
export async function batchUpdateRepositoryWorkEmbeddings(
  updates: Array<{ id: number; embedding: number[] }>,
  batchSize = BATCH_UPDATE_SIZE,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(repositoryWorks)
          .set({ embedding: update.embedding })
          .where(eq(repositoryWorks.id, update.id)),
      ),
    );
  }
}

/**
 * Batch updates commit embeddings efficiently.
 * Groups updates together to reduce database load and improve performance.
 */
export async function batchUpdateCommitEmbeddings(
  updates: Array<{ id: number; embedding: number[] }>,
  batchSize = BATCH_UPDATE_SIZE,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(commits)
          .set({ embedding: update.embedding })
          .where(eq(commits.id, update.id)),
      ),
    );
  }
}
