// Configuration constants for summarization scripts

export const CONCURRENT_REQUESTS = 15; // Process 15 summaries in parallel
export const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
export const BACKUP_DIR = "data/summaries-backup";

// Token limits for context window management
export const MAX_INPUT_TOKENS = 120000; // Safe threshold (128k limit with buffer for output)
export const TOKEN_BUFFER = 2000; // Reserved for system prompt and repository info
