/**
 * Shared utilities for script processing.
 * Used by both summarization and embedding scripts.
 */

/**
 * Processes items in parallel with a concurrency limit.
 * This allows you to process many items efficiently without overwhelming the system.
 */
export async function processInParallel<T, R>(
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
 * If a function fails, it waits a bit longer each time before trying again.
 * This helps handle temporary network issues or rate limits gracefully.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
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
