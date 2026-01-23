import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { BACKUP_DIR } from "./summarize.config";

/**
 * Saves summaries to a JSON backup file before database updates.
 * This ensures data is preserved even if database operations fail.
 */
export function saveBackup<T extends { id: number; summary: string }>({
  summaries,
  filename,
  metadata,
}: {
  summaries: T[];
  filename: string;
  metadata: Record<string, unknown>;
}): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `${filename}-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    generatedAt: new Date().toISOString(),
    successfulSummaries: summaries.length,
    summaries,
    ...metadata,
  };

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📁 Backup saved to: ${backupPath}`);

  return backupPath;
}
