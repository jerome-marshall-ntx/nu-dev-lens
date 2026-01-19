import { summarizationModel } from "@/ai/models";
import { SUMMARIZE_COMMIT_PROMPT, SUMMARIZE_ISSUE_PROMPT } from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, issues } from "@/server/db/schema";
import { generateText } from "ai";
import { config } from "dotenv";
import { eq, isNull } from "drizzle-orm";

config();

// Configuration
const CONCURRENT_REQUESTS = 15; // Process 15 summaries in parallel
const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Processes items in parallel with a concurrency limit.
 */
async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: (R | undefined)[] = new Array<R | undefined>(items.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  const executeNext = async (): Promise<void> => {
    if (index >= items.length) return;

    const currentIndex = index++;
    const item = items[currentIndex];
    if (item === undefined) return;

    const promise = processor(item, currentIndex)
      .then((result) => {
        results[currentIndex] = result;
      })
      .catch((error) => {
        console.error(`Error processing item ${currentIndex}:`, error);
        results[currentIndex] = undefined;
      })
      .then(() => executeNext());

    executing.push(promise);
    await promise;
  };

  // Start initial batch
  const initialBatch = Math.min(concurrency, items.length);
  for (let i = 0; i < initialBatch; i++) {
    executing.push(executeNext());
  }

  await Promise.all(executing);
  return results.filter((r): r is R => r !== undefined);
}

/**
 * Retries a function with exponential backoff.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  delayMs = RETRY_DELAY_MS,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.log(
          `⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError!;
}

/**
 * Batch updates database records.
 */
async function batchUpdateCommits(
  updates: Array<{ id: number; summary: string }>,
): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_UPDATE_SIZE) {
    const batch = updates.slice(i, i + BATCH_UPDATE_SIZE);
    await Promise.all(
      batch.map((update) =>
        db
          .update(commits)
          .set({ summary: update.summary })
          .where(eq(commits.id, update.id)),
      ),
    );
  }
}

async function batchUpdateIssues(
  updates: Array<{ id: number; summary: string }>,
): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_UPDATE_SIZE) {
    const batch = updates.slice(i, i + BATCH_UPDATE_SIZE);
    await Promise.all(
      batch.map((update) =>
        db
          .update(issues)
          .set({ summary: update.summary })
          .where(eq(issues.id, update.id)),
      ),
    );
  }
}

const summarizeCommits = async () => {
  const commitsToSummarize = await db
    .select()
    .from(commits)
    .where(isNull(commits.summary));
  const total = commitsToSummarize.length;
  console.log(`Found ${total} commits without summaries.`);

  if (total === 0) {
    console.log("✅ No commits to summarize.");
    return;
  }

  const startTime = Date.now();
  const repositoryInfo = `
<repository_info>
This codebase uses Remeda, a "data-first" and "data-last" utility library designed for TypeScript.

Key features:
- First-class TypeScript support with specific types
- Supports both data-first (\`R.filter(array, fn)\`) and data-last (\`R.filter(fn)(array)\`) approaches
- Lazy evaluation with \`pipe\` and \`piped\`
- Tree-shakable, supports CJS and ESM
- Common pattern: \`R.pipe(data, R.operation1(), R.operation2())\`

When analyzing commits that reference Remeda functions or patterns, recognize these as utility operations for data transformation, array manipulation, and functional programming patterns.
</repository_info>`;

  // Process commits in parallel
  const summaries = await processInParallel(
    commitsToSummarize,
    async (commit, index) => {
      const progress = ((index + 1) / total) * 100;
      if ((index + 1) % 10 === 0 || index === 0) {
        console.log(
          `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing commit ID ${commit.id}...`,
        );
      }

      const summary = await retryWithBackoff(async () => {
        const result = await generateText({
          model: summarizationModel,
          system: SUMMARIZE_COMMIT_PROMPT,
          prompt: `${repositoryInfo}<commit_data>${JSON.stringify(commit.rawData)}</commit_data>`,
        });
        return result.text;
      });

      return { id: commit.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Batch update database
  console.log(
    `💾 Updating ${summaries.length} commit summaries in database...`,
  );
  await batchUpdateCommits(summaries);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `✅ Done summarizing ${summaries.length}/${total} commits in ${elapsed}s.`,
  );
};

const summarizeIssues = async () => {
  const issuesToSummarize = await db
    .select()
    .from(issues)
    .where(isNull(issues.summary));
  const total = issuesToSummarize.length;
  console.log(`Found ${total} issues without summaries.`);

  if (total === 0) {
    console.log("✅ No issues to summarize.");
    return;
  }

  const startTime = Date.now();
  const repositoryInfo = `
<repository_info>
This codebase uses Remeda, a "data-first" and "data-last" utility library designed for TypeScript.

Key features:
- First-class TypeScript support with specific types
- Supports both data-first (\`R.filter(array, fn)\`) and data-last (\`R.filter(fn)(array)\`) approaches
- Lazy evaluation with \`pipe\` and \`piped\`
- Tree-shakable, supports CJS and ESM
- Common pattern: \`R.pipe(data, R.operation1(), R.operation2())\`

When analyzing commits that reference Remeda functions or patterns, recognize these as utility operations for data transformation, array manipulation, and functional programming patterns.
</repository_info>`;

  // Process issues in parallel
  const summaries = await processInParallel(
    issuesToSummarize,
    async (issue, index) => {
      const progress = ((index + 1) / total) * 100;
      if ((index + 1) % 10 === 0 || index === 0) {
        console.log(
          `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing issue ID ${issue.id}...`,
        );
      }

      const summary = await retryWithBackoff(async () => {
        const result = await generateText({
          model: summarizationModel,
          system: SUMMARIZE_ISSUE_PROMPT,
          prompt: `${repositoryInfo}<issue_data>${JSON.stringify(issue.rawData)}</issue_data>`,
        });
        return result.text;
      });

      return { id: issue.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Batch update database
  console.log(`💾 Updating ${summaries.length} issue summaries in database...`);
  await batchUpdateIssues(summaries);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `✅ Done summarizing ${summaries.length}/${total} issues in ${elapsed}s.`,
  );
};

const main = async () => {
  try {
    await summarizeCommits();
    // await summarizeIssues();
    console.log("\n🎉 All summarization complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
