// Configuration constants for summarization scripts

export const CONCURRENT_REQUESTS = 15; // Process 15 summaries in parallel
export const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
export const BACKUP_DIR = "data/summaries-backup";
