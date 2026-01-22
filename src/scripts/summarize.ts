import { summarizationModel } from "@/ai/models";
import {
  SUMMARIZE_COMMIT_PROMPT,
  SUMMARIZE_CONTRIBUTOR_PROMPT,
  SUMMARIZE_REPOSITORY_WORK_PROMPT,
} from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, contributors, repositories, repositoryWorks } from "@/server/db/schema";
import { generateText } from "ai";
import { config } from "dotenv";
import { eq, isNull } from "drizzle-orm";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  batchUpdateCommits,
  batchUpdateContributors,
  batchUpdateRepositoryWorks,
  buildCommitInfo,
  buildContributorInput,
  buildRepositoryInfo,
  buildRepositoryWorkInput,
  processInParallel,
  retryWithBackoff,
} from "./summarize.utils";

config();

// Directory for backup JSON files
const BACKUP_DIR = "data/summaries-backup";

// Configuration
const CONCURRENT_REQUESTS = 15; // Process 15 summaries in parallel
const BATCH_UPDATE_SIZE = 50; // Update database in batches of 50
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const summarizeCommits = async () => {
  // Fetch commits with their associated repository info via repositoryWork
  const commitsWithRepo = await db
    .select({
      commit: commits,
      repository: {
        name: repositories.name,
        description: repositories.description,
      },
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
  // .where(isNull(commits.summary));

  const total = commitsWithRepo.length;
  console.log(`Found ${total} commits without summaries.`);

  if (total === 0) {
    console.log("✅ No commits to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process commits in parallel
  const summaries = await processInParallel(
    commitsWithRepo,
    async ({ commit, repository }, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing commit ID ${commit.id}...`,
      );

      const repositoryInfo = buildRepositoryInfo(repository);
      const commitInfo = buildCommitInfo(commit.rawData);
      const prompt = `${repositoryInfo}${commitInfo}`;
      // console.log(`Prompt: ${prompt}`);

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_COMMIT_PROMPT,
            prompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      return { id: commit.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Save summaries to JSON file as backup (before database save)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `commit-summaries-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    generatedAt: new Date().toISOString(),
    totalCommits: total,
    successfulSummaries: summaries.length,
    summaries: summaries,
  };

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📁 Backup saved to: ${backupPath}`);

  // Batch update database
  console.log(
    `💾 Updating ${summaries.length} commit summaries in database...`,
  );

  try {
    await batchUpdateCommits(summaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - summaries.length;

  console.log(
    `✅ Done summarizing ${summaries.length}/${total} commits in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} commits failed to summarize.`);
  }
};

const summarizeRepositoryWorks = async () => {
  // Fetch repository works that need summaries, with their repository info
  const repoWorksToProcess = await db
    .select({
      repoWork: repositoryWorks,
      repository: {
        name: repositories.name,
      },
    })
    .from(repositoryWorks)
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .where(isNull(repositoryWorks.summary));

  const total = repoWorksToProcess.length;
  console.log(`\n📦 Found ${total} repository works without summaries.`);

  if (total === 0) {
    console.log("✅ No repository works to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process repository works in parallel
  const summaries = await processInParallel(
    repoWorksToProcess,
    async ({ repoWork, repository }, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing repository work ID ${repoWork.id}...`,
      );

      // Fetch all commit summaries for this repository work
      const commitSummariesData = await db
        .select({ summary: commits.summary })
        .from(commits)
        .where(eq(commits.repositoryWorkId, repoWork.id));

      const commitSummaries = commitSummariesData
        .map((c) => c.summary)
        .filter((s): s is string => !!s);

      if (commitSummaries.length === 0) {
        console.log(
          `⚠️  Repository work ${repoWork.id} has no commit summaries, skipping...`,
        );
        return undefined;
      }

      const prompt = buildRepositoryWorkInput(repository.name, commitSummaries);

      if (!prompt) {
        console.log(
          `⚠️  Repository work ${repoWork.id} has no valid commit summaries, skipping...`,
        );
        return undefined;
      }

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_REPOSITORY_WORK_PROMPT,
            prompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      return { id: repoWork.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Filter out undefined results
  const validSummaries = summaries.filter(
    (s): s is { id: number; summary: string } => s !== undefined,
  );

  // Save summaries to JSON file as backup (before database save)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `repository-work-summaries-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    generatedAt: new Date().toISOString(),
    totalRepositoryWorks: total,
    successfulSummaries: validSummaries.length,
    summaries: validSummaries,
  };

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📁 Backup saved to: ${backupPath}`);

  // Batch update database
  console.log(
    `💾 Updating ${validSummaries.length} repository work summaries in database...`,
  );

  try {
    await batchUpdateRepositoryWorks(validSummaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - validSummaries.length;

  console.log(
    `✅ Done summarizing ${validSummaries.length}/${total} repository works in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} repository works failed to summarize.`);
  }
};

const summarizeContributors = async () => {
  // Fetch contributors that need summaries
  const contributorsToProcess = await db
    .select()
    .from(contributors)
    .where(isNull(contributors.summary));

  const total = contributorsToProcess.length;
  console.log(`\n👤 Found ${total} contributors without summaries.`);

  if (total === 0) {
    console.log("✅ No contributors to summarize.");
    return;
  }

  const startTime = Date.now();

  // Process contributors in parallel
  const summaries = await processInParallel(
    contributorsToProcess,
    async (contributor, index) => {
      const progress = ((index + 1) / total) * 100;
      console.log(
        `📝 [${index + 1}/${total}] (${progress.toFixed(1)}%) Processing contributor ID ${contributor.id} (${contributor.username})...`,
      );

      // Fetch all repository work summaries for this contributor
      const workSummariesData = await db
        .select({
          summary: repositoryWorks.summary,
          repoName: repositories.name,
        })
        .from(repositoryWorks)
        .innerJoin(
          repositories,
          eq(repositoryWorks.repositoryId, repositories.id),
        )
        .where(eq(repositoryWorks.contributorId, contributor.id));

      const workSummaries = workSummariesData
        .map((w) => ({ repoName: w.repoName, summary: w.summary }))
        .filter((w) => w.summary !== null) as Array<{
          repoName: string;
          summary: string;
        }>;

      if (workSummaries.length === 0) {
        console.log(
          `⚠️  Contributor ${contributor.username} has no repository work summaries, skipping...`,
        );
        return undefined;
      }

      const prompt = buildContributorInput(workSummaries);

      if (!prompt) {
        console.log(
          `⚠️  Contributor ${contributor.username} has no valid repository work summaries, skipping...`,
        );
        return undefined;
      }

      const summary = await retryWithBackoff(
        async () => {
          const result = await generateText({
            model: summarizationModel,
            system: SUMMARIZE_CONTRIBUTOR_PROMPT,
            prompt,
          });
          return result.text;
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
      );

      return { id: contributor.id, summary };
    },
    CONCURRENT_REQUESTS,
  );

  // Filter out undefined results
  const validSummaries = summaries.filter(
    (s): s is { id: number; summary: string } => s !== undefined,
  );

  // Save summaries to JSON file as backup (before database save)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `contributor-summaries-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    generatedAt: new Date().toISOString(),
    totalContributors: total,
    successfulSummaries: validSummaries.length,
    summaries: validSummaries,
  };

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`📁 Backup saved to: ${backupPath}`);

  // Batch update database
  console.log(
    `💾 Updating ${validSummaries.length} contributor summaries in database...`,
  );

  try {
    await batchUpdateContributors(validSummaries, BATCH_UPDATE_SIZE);
  } catch (dbError) {
    console.error(`\n❌ Database save failed:`, dbError);
    console.log(`\n💡 Your summaries are safe! Use the backup file to retry:`);
    console.log(`   ${backupPath}`);
    throw dbError;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const failedCount = total - validSummaries.length;

  console.log(
    `✅ Done summarizing ${validSummaries.length}/${total} contributors in ${elapsed}s.`,
  );

  if (failedCount > 0) {
    console.log(`⚠️  ${failedCount} contributors failed to summarize.`);
  }
};

const main = async () => {
  try {
    // Phase 1: Summarize commits (Level 1)
    // await summarizeCommits();

    // Phase 2: Summarize repository works (Level 2) - depends on Level 1
    await summarizeRepositoryWorks();

    // Phase 3: Summarize contributors (Level 3) - depends on Level 2
    // await summarizeContributors();

    console.log("\n🎉 All summarization complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  }
};

void main();
