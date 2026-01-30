#!/usr/bin/env node
/* eslint-disable drizzle/enforce-delete-with-where */
// -*- coding: utf-8 -*-

/**
 * Database Population Script
 *
 * This script reads the fetched GitHub contributor data from a JSON file
 * and populates the PostgreSQL database using Drizzle ORM.
 *
 * Usage:
 *   pnpm db:populate [json-file-path] [--clear]
 *
 * Arguments:
 *   json-file-path: Path to the JSON file (default: ./data/github_contributors_simplified_issues_commits_v4.json)
 *   --clear: Clear existing data before populating
 */

// Load environment variables BEFORE importing env validation
import "dotenv/config";

import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
  type InsertCommit,
  type InsertContributor,
  type InsertRepository,
} from "@/server/db/schema";
import type { IngestionOutputData } from "@/types/github";
import { eq, inArray, sql } from "drizzle-orm";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";

// Batch size for inserts
const BATCH_SIZE = 500;

// --- Helper Functions ---

/**
 * Parses a GitHub repository URL to extract owner and repo name.
 */
function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.toLowerCase() !== "github.com") {
      return null;
    }
    const pathParts = urlObj.pathname.split("/").filter((part) => part);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1]?.endsWith(".git")
        ? pathParts[1].slice(0, -4)
        : pathParts[1];

      if (!owner || !repo) {
        return null;
      }

      return { owner, repo };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears all existing data from the database tables.
 */
async function clearDatabase(): Promise<void> {
  console.log("⚠️  Clearing existing data...");

  // Delete in reverse order of dependencies
  await db.delete(commits);
  console.log("  ✓ Commits cleared");

  await db.delete(repositoryWorks);
  console.log("  ✓ Repository works cleared");

  await db.delete(contributors);
  console.log("  ✓ Contributors cleared");

  await db.delete(repositories);
  console.log("  ✓ Repositories cleared");

  console.log("✅ Database cleared successfully\n");
}

/**
 * Helper function to batch process arrays in chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Populates the database with contributor data from the JSON file.
 * Optimized with batch inserts and upserts.
 */
async function populateDatabase(
  data: IngestionOutputData,
  verbose = false,
): Promise<void> {
  const contributorsData = data.contributors;
  const totalContributors = contributorsData.length;

  console.log(
    `📊 Starting population with ${totalContributors} contributors\n`,
  );

  // Statistics
  const stats = {
    contributorsProcessed: 0,
    contributorsCreated: 0,
    repositoriesCreated: 0,
    repositoryWorksCreated: 0,
    commitsCreated: 0,
  };

  // Step 1: Collect all unique contributors and repositories
  console.log("📦 Step 1: Collecting unique contributors and repositories...");
  const uniqueContributors = new Map<
    string,
    { username: string; url: string; avatar_url: string }
  >();
  const uniqueRepositories = new Map<string, { url: string; name: string }>();

  for (const contributorData of contributorsData) {
    const username = contributorData.username;
    if (!username) continue;

    uniqueContributors.set(username, {
      username,
      url: contributorData.url || "",
      avatar_url: contributorData.avatar_url || "",
    });

    const worksData = contributorData.works || [];
    for (const workData of worksData) {
      const repoUrl = workData.repository_url;
      if (!repoUrl) continue;

      const parsed = parseGithubUrl(repoUrl);
      if (!parsed) continue;

      const fullName = `${parsed.owner}/${parsed.repo}`;
      uniqueRepositories.set(repoUrl, { url: repoUrl, name: fullName });
    }
  }

  console.log(
    `  Found ${uniqueContributors.size} unique contributors and ${uniqueRepositories.size} unique repositories`,
  );

  // Step 2: Batch upsert all contributors
  console.log("👥 Step 2: Upserting contributors...");
  const contributorCache = new Map<string, number>(); // username -> contributor ID
  const contributorsToInsert: InsertContributor[] = Array.from(
    uniqueContributors.values(),
  ).map((c) => ({
    username: c.username,
    url: c.url,
    avatarUrl: c.avatar_url,
    summary: null,
  }));

  // Process in batches
  for (const batch of chunk(contributorsToInsert, BATCH_SIZE)) {
    const result = await db
      .insert(contributors)
      .values(batch)
      .onConflictDoUpdate({
        target: contributors.username,
        set: {
          url: sql`EXCLUDED.url`,
          avatarUrl: sql`EXCLUDED."avatarUrl"`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ id: contributors.id, username: contributors.username });

    for (const row of result) {
      contributorCache.set(row.username, row.id);
    }
    stats.contributorsCreated += batch.length;
  }

  // Fetch existing contributors that weren't inserted
  const contributorUsernames = Array.from(uniqueContributors.keys());
  if (contributorUsernames.length > 0) {
    const existingContributors = await db
      .select()
      .from(contributors)
      .where(inArray(contributors.username, contributorUsernames));

    for (const existing of existingContributors) {
      contributorCache.set(existing.username, existing.id);
    }
  }

  console.log(`  ✓ Processed ${contributorCache.size} contributors`);

  // Step 3: Batch upsert all repositories
  // Note: repositories.url doesn't have a unique constraint, so we need to check first
  console.log("📚 Step 3: Upserting repositories...");
  const repoCache = new Map<string, number>(); // URL -> repo ID
  const repositoryUrls = Array.from(uniqueRepositories.keys());

  // First, fetch all existing repositories
  if (repositoryUrls.length > 0) {
    const existingRepos = await db
      .select()
      .from(repositories)
      .where(inArray(repositories.url, repositoryUrls));

    for (const existing of existingRepos) {
      repoCache.set(existing.url, existing.id);
    }
  }

  // Separate into existing (to update) and new (to insert)
  const repositoriesToUpdate: Array<{ id: number; name: string }> = [];
  const repositoriesToInsert: InsertRepository[] = [];

  for (const repoData of uniqueRepositories.values()) {
    const existingId = repoCache.get(repoData.url);
    if (existingId) {
      repositoriesToUpdate.push({ id: existingId, name: repoData.name });
    } else {
      repositoriesToInsert.push({
        name: repoData.name,
        url: repoData.url,
      });
    }
  }

  // Update existing repositories (batch by ID for efficiency)
  if (repositoriesToUpdate.length > 0) {
    // Group updates by ID and process
    for (const repo of repositoriesToUpdate) {
      await db
        .update(repositories)
        .set({
          name: repo.name,
          updatedAt: new Date(),
        })
        .where(eq(repositories.id, repo.id));
    }
  }

  // Insert new repositories in batches
  if (repositoriesToInsert.length > 0) {
    for (const batch of chunk(repositoriesToInsert, BATCH_SIZE)) {
      const result = await db
        .insert(repositories)
        .values(batch)
        .returning({ id: repositories.id, url: repositories.url });

      for (const row of result) {
        repoCache.set(row.url, row.id);
      }
      stats.repositoriesCreated += batch.length;
    }
  }

  console.log(`  ✓ Processed ${repoCache.size} repositories`);

  // Step 4: Process repository works and commits
  console.log("🔗 Step 4: Processing repository works and commits...");
  const repositoryWorkCache = new Map<string, number>(); // "repoId-contributorId" -> work ID
  const commitsToInsert: InsertCommit[] = [];

  for (const contributorData of contributorsData) {
    const username = contributorData.username;
    if (!username) continue;

    const contributorId = contributorCache.get(username);
    if (!contributorId) {
      if (verbose) {
        console.log(`⚠️  Contributor ${username} not found in cache`);
      }
      continue;
    }

    stats.contributorsProcessed++;

    if (stats.contributorsProcessed % 50 === 0) {
      console.log(
        `  📝 Processed ${stats.contributorsProcessed}/${totalContributors} contributors...`,
      );
    }

    const worksData = contributorData.works || [];

    for (const workData of worksData) {
      const repoUrl = workData.repository_url;
      if (!repoUrl) continue;

      const repositoryId = repoCache.get(repoUrl);
      if (!repositoryId) {
        if (verbose) {
          console.log(`⚠️  Repository ${repoUrl} not found in cache`);
        }
        continue;
      }

      const workKey = `${repositoryId}-${contributorId}`;
      let repositoryWorkId = repositoryWorkCache.get(workKey);

      if (!repositoryWorkId) {
        // Try to find existing repository work
        const existing = await db
          .select()
          .from(repositoryWorks)
          .where(
            sql`${repositoryWorks.repositoryId} = ${repositoryId} AND ${repositoryWorks.contributorId} = ${contributorId}`,
          )
          .limit(1);

        if (existing.length > 0) {
          repositoryWorkId = existing[0]!.id;
        } else {
          // Insert new repository work
          const [inserted] = await db
            .insert(repositoryWorks)
            .values({
              repositoryId: repositoryId,
              contributorId: contributorId,
              summary: null,
            })
            .returning({ id: repositoryWorks.id });

          repositoryWorkId = inserted!.id;
          stats.repositoryWorksCreated++;
        }

        repositoryWorkCache.set(workKey, repositoryWorkId);
      }

      // Collect commits for batch insert
      const commitsData = workData.commits || [];
      for (const commitData of commitsData) {
        const commitUrl = commitData.url;
        if (!commitUrl) continue;

        commitsToInsert.push({
          repositoryWorkId: repositoryWorkId,
          url: commitUrl,
          rawData: commitData,
          authoredAt: commitData.authored_date
            ? new Date(commitData.authored_date)
            : null,
          summary: null,
        });
      }
    }
  }

  // Step 5: Batch insert commits
  // Deduplicate by (repositoryWorkId, url) before inserting to avoid duplicates
  console.log(
    `💾 Step 5: Batch inserting ${commitsToInsert.length} commits...`,
  );
  const commitsMap = new Map<string, InsertCommit>();
  for (const commit of commitsToInsert) {
    const key = `${commit.repositoryWorkId}-${commit.url}`;
    if (!commitsMap.has(key)) {
      commitsMap.set(key, commit);
    }
  }

  const uniqueCommits = Array.from(commitsMap.values());
  for (const batch of chunk(uniqueCommits, BATCH_SIZE)) {
    await db.insert(commits).values(batch);
    stats.commitsCreated += batch.length;
  }

  console.log(`  ✓ Inserted ${stats.commitsCreated} commits`);

  // Print statistics
  console.log("\n✅ Database population completed successfully!\n");
  console.log("📊 Statistics:");
  console.log(`  • Contributors processed: ${stats.contributorsProcessed}`);
  console.log(`  • Contributors upserted: ${stats.contributorsCreated}`);
  console.log(`  • Repositories upserted: ${stats.repositoriesCreated}`);
  console.log(`  • Repository works created: ${stats.repositoryWorksCreated}`);
  console.log(`  • Commits upserted: ${stats.commitsCreated}`);
  console.log();
}

// --- Main Execution ---

async function main(): Promise<void> {
  console.log("🚀 Starting database population script\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");
  const verboseMode = args.includes("--verbose") || args.includes("-v");

  // Get JSON file path (default or from arguments)
  let jsonFilePath =
    "./data/github_contributors_simplified_issues_commits_v4.json";

  const pathArg = args.find((arg) => !arg.startsWith("--"));
  if (pathArg) {
    jsonFilePath = pathArg;
  }

  console.log(`📁 Reading data from: ${jsonFilePath}`);

  // Check if file exists
  try {
    await fs.access(jsonFilePath);
  } catch {
    console.error(`❌ Error: File not found at ${jsonFilePath}`);
    process.exit(1);
  }

  // Read and parse JSON file
  let data: IngestionOutputData;
  try {
    const fileContent = await fs.readFile(jsonFilePath, "utf-8");
    data = JSON.parse(fileContent) as IngestionOutputData;
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Error reading/parsing JSON file: ${err.message}`);
    process.exit(1);
  }

  // Validate JSON structure
  if (!data.contributors || !Array.isArray(data.contributors)) {
    console.error(
      "❌ Error: Invalid JSON format. Expected 'contributors' array.",
    );
    process.exit(1);
  }

  console.log(`✅ JSON file loaded successfully`);
  console.log(`📊 Found ${data.contributors.length} contributors\n`);

  // Clear database if requested
  if (shouldClear) {
    await clearDatabase();
  }

  // Populate database
  await populateDatabase(data, verboseMode);

  // Print metadata if available
  if (data.metadata) {
    console.log("📋 Metadata from ingestion:");
    console.log(
      `  • Processed repos: ${data.metadata.processed_repos.join(", ")}`,
    );
    console.log(
      `  • Processing time: ${data.metadata.processing_time_seconds}s`,
    );
    console.log(
      `  • Commit limit per repo: ${data.metadata.commit_detail_limit_per_repo ?? "ALL"}`,
    );
  }

  console.log("\n🎉 All done!");
}

// Run the script if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { clearDatabase, parseGithubUrl, populateDatabase };
