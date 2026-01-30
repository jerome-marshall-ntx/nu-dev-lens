import { db } from "@/server/db";
import { commits, contributors, repositoryWorks } from "@/server/db/schema";
import type { StoredCommitData } from "@/types/github";
import { eq } from "drizzle-orm";
import { estimateTokenCount, isWithinTokenLimit } from "tokenx";
import { processInParallel, retryWithBackoff } from "../utils";
import { MAX_INPUT_TOKENS, TOKEN_BUFFER } from "./summarize.config";

// Re-export shared utilities for convenience
export { processInParallel, retryWithBackoff };

/**
 * Removes null bytes and other problematic characters from text.
 * PostgreSQL doesn't allow null bytes (0x00) in text fields, and other
 * control characters can cause issues with display or processing.
 */
function sanitizeForPostgres(text: string): string {
  return (
    text
      // Remove null bytes (0x00) - PostgreSQL doesn't allow these in text
      .replace(/\x00/g, "")
      // Remove other problematic control characters (0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F)
      // We keep: tab (0x09), newline (0x0A), carriage return (0x0D)
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "")
      // Remove Unicode replacement character (often indicates encoding issues)
      .replace(/\uFFFD/g, "")
      // Remove zero-width characters that can cause invisible issues
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Normalize multiple spaces/newlines to single ones (cleanup)
      .replace(/\n{3,}/g, "\n\n")
      .replace(/ {2,}/g, " ")
      // Trim whitespace from start and end
      .trim()
  );
}

/**
 * Batch updates database records efficiently.
 * Instead of updating one record at a time, this groups updates together
 * to reduce database load and improve performance.
 */
export async function batchUpdateCommits(
  updates: Array<{ id: number; summary: string }>,
  batchSize = 50,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(commits)
          .set({ summary: sanitizeForPostgres(update.summary) })
          .where(eq(commits.id, update.id)),
      ),
    );
  }
}

/**
 * Builds repository context info for the AI prompt.
 * Formats repository information in a structured way that helps the AI
 * understand what repository the commit belongs to.
 */
export function buildRepositoryInfo(repo: {
  name: string;
  description: string | null;
}): string {
  const repoDescription = repo.description ?? "No description available.";

  return `
<repository_info>
Repository: ${repo.name}

${repoDescription}
</repository_info>`;
}

/**
 * Builds commit context info for the AI prompt.
 * Formats commit data (message, files changed, diff) in a structured way
 * that helps the AI understand what changes were made.
 */
export function buildCommitInfo(commit: StoredCommitData): string {
  return `<commit_data>
  <message>${commit.message}</message>
  <files_changed>${commit.files_changed?.map((file) => `- ${file.filename} (${file.status})`).join("\n")}</files_changed>
  <diff_patch>${JSON.stringify(commit.diff_patch ?? "")}</diff_patch>
  </commit_data>`;
}

/**
 * Batch updates repository work summaries efficiently.
 * Groups updates together to reduce database load and improve performance.
 */
export async function batchUpdateRepositoryWorks(
  updates: Array<{ id: number; summary: string }>,
  batchSize = 50,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(repositoryWorks)
          .set({ summary: sanitizeForPostgres(update.summary) })
          .where(eq(repositoryWorks.id, update.id)),
      ),
    );
  }
}

/**
 * Batch updates contributor summaries efficiently.
 * Groups updates together to reduce database load and improve performance.
 */
export async function batchUpdateContributors(
  updates: Array<{ id: number; summary: string }>,
  batchSize = 50,
): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((update) =>
        db
          .update(contributors)
          .set({ summary: sanitizeForPostgres(update.summary) })
          .where(eq(contributors.id, update.id)),
      ),
    );
  }
}

/**
 * Builds repository work input for Level 2 summarization.
 * Formats commit summaries in a structured way for the AI to synthesize.
 */
export function buildRepositoryWorkInput(
  repositoryInfo: string,
  commitSummaries: string[],
): string {
  const validSummaries = commitSummaries.filter(
    (s) => s?.trim() && !s.toLowerCase().includes("cannot summarize"),
  );

  if (validSummaries.length === 0) {
    return "";
  }

  return `<repository_work_input>
${repositoryInfo}

Commit summaries:
${validSummaries.map((summary, idx) => `${idx + 1}. ${summary}`).join("\n\n")}
</repository_work_input>`;
}

/**
 * Builds contributor input for Level 3 summarization.
 * Formats repository work summaries in a structured way for the AI to synthesize.
 */
export function buildContributorInput(
  workSummaries: Array<{ repoName: string; summary: string }>,
): string {
  const validSummaries = workSummaries.filter(
    (w) =>
      w.summary?.trim() &&
      !w.summary?.toLowerCase().includes("cannot summarize"),
  );

  if (validSummaries.length === 0) {
    return "";
  }

  return `<contributor_input>
Repository work summaries:

${validSummaries
      .map(
        (work, idx) =>
          `${idx + 1}. Repository: ${work.repoName}\n   ${work.summary}`,
      )
      .join("\n\n")}
</contributor_input>`;
}

// ============================================================================
// Token Estimation & Chunking Utilities
// ============================================================================

/**
 * Checks if text is within the context window limit.
 * Uses tokenx library for fast, accurate token estimation.
 *
 * @param text - The text to check
 * @param limit - Token limit (defaults to MAX_INPUT_TOKENS minus buffer)
 * @returns true if text fits within the limit
 */
export function isWithinContextLimit(
  text: string,
  limit: number = MAX_INPUT_TOKENS - TOKEN_BUFFER,
): boolean {
  return isWithinTokenLimit(text, limit);
}

/**
 * Estimates the number of tokens in a text string.
 * Wrapper around tokenx for convenience.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function getTokenCount(text: string): number {
  return estimateTokenCount(text);
}

/**
 * Splits commit summaries into chunks that fit within the token limit.
 * Uses a greedy algorithm: keeps adding summaries to a chunk until
 * adding the next one would exceed the limit.
 *
 * @param summaries - Array of commit summary strings
 * @param maxTokens - Maximum tokens per chunk (defaults to MAX_INPUT_TOKENS minus buffer)
 * @param minSummariesPerChunk - Minimum summaries per chunk to avoid too many chunks
 * @returns Array of summary arrays, each fitting within the token limit
 */
export function splitCommitSummariesByTokens(
  summaries: string[],
  maxTokens: number = MAX_INPUT_TOKENS - TOKEN_BUFFER,
  minSummariesPerChunk = 10,
): string[][] {
  if (summaries.length === 0) {
    return [];
  }

  // Filter out invalid summaries first
  const validSummaries = summaries.filter(
    (s) => s?.trim() && !s.toLowerCase().includes("cannot summarize"),
  );

  if (validSummaries.length === 0) {
    return [];
  }

  // If all summaries fit in one chunk, return as-is
  const allSummariesText = validSummaries.join("\n\n");
  if (isWithinTokenLimit(allSummariesText, maxTokens)) {
    return [validSummaries];
  }

  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const summary of validSummaries) {
    const summaryTokens = estimateTokenCount(summary);
    // Add ~10 tokens for formatting (numbering, newlines)
    const summaryWithOverhead = summaryTokens + 10;

    // Check if adding this summary would exceed the limit
    // But always add at least minSummariesPerChunk to avoid too many tiny chunks
    const wouldExceedLimit = currentTokens + summaryWithOverhead > maxTokens;
    const hasMinimumSummaries = currentChunk.length >= minSummariesPerChunk;

    if (wouldExceedLimit && hasMinimumSummaries) {
      // Start a new chunk
      chunks.push(currentChunk);
      currentChunk = [summary];
      currentTokens = summaryWithOverhead;
    } else {
      // Add to current chunk
      currentChunk.push(summary);
      currentTokens += summaryWithOverhead;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Builds input text for a chunk of commit summaries (for intermediate summarization).
 * Similar to buildRepositoryWorkInput but used for chunked processing.
 *
 * @param repositoryInfo - Repository context info
 * @param commitSummaries - Array of commit summaries for this chunk
 * @param chunkIndex - Current chunk number (1-based)
 * @param totalChunks - Total number of chunks
 * @returns Formatted input string for the AI
 */
export function buildChunkInput(
  repositoryInfo: string,
  commitSummaries: string[],
  chunkIndex: number,
  totalChunks: number,
): string {
  if (commitSummaries.length === 0) {
    return "";
  }

  return `<chunk_input>
${repositoryInfo}

This is chunk ${chunkIndex} of ${totalChunks} containing ${commitSummaries.length} commit summaries.

Commit summaries:
${commitSummaries.map((summary, idx) => `${idx + 1}. ${summary}`).join("\n\n")}
</chunk_input>`;
}
