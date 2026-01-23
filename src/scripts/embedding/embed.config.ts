// Configuration constants for embedding scripts

export const EMBEDDING_BATCH_SIZE = 10; // Process embeddings in batches of 50
export const MAX_PARALLEL_CALLS = 10; // Maximum parallel API calls per embedMany batch
export const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
export const MAX_RETRIES = 2; // Built-in retries (default is 2, which means 3 total attempts)
export const EMBEDDING_DIMENSIONS = 1536; // Must match schema definition
