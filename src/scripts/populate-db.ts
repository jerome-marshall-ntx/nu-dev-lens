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
 *   bun run src/scripts/populate-db.ts [json-file-path] [--clear]
 *
 * Arguments:
 *   json-file-path: Path to the JSON file (default: ./data/github_contributors_simplified_issues_commits_v4.json)
 *   --clear: Clear existing data before populating
 */

import { db } from "@/server/db";
import {
  commits,
  contributors,
  issues,
  repositories,
  repositoryWorks,
  type InsertCommit,
  type InsertContributor,
  type InsertIssue,
  type InsertRepository,
  type InsertRepositoryWork,
} from "@/server/db/schema";
import type { IngestionOutputData } from "@/types/github";
import { and, eq } from "drizzle-orm";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";

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

  await db.delete(issues);
  console.log("  ✓ Issues cleared");

  await db.delete(repositoryWorks);
  console.log("  ✓ Repository works cleared");

  await db.delete(contributors);
  console.log("  ✓ Contributors cleared");

  await db.delete(repositories);
  console.log("  ✓ Repositories cleared");

  console.log("✅ Database cleared successfully\n");
}

/**
 * Populates the database with contributor data from the JSON file.
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

  // Caches to avoid duplicate queries
  const repoCache = new Map<string, number>(); // URL -> repo ID
  const contributorCache = new Map<string, number>(); // username -> contributor ID

  // Statistics
  const stats = {
    contributorsProcessed: 0,
    contributorsCreated: 0,
    repositoriesCreated: 0,
    repositoryWorksCreated: 0,
    issuesCreated: 0,
    commitsCreated: 0,
  };

  for (const contributorData of contributorsData) {
    const username = contributorData.username;
    if (!username) {
      if (verbose) {
        console.log("⚠️  Skipping contributor with missing username");
      }
      continue;
    }

    // --- 1. Create or Update Contributor ---
    let contributorId = contributorCache.get(username);

    if (!contributorId) {
      // Check if contributor exists
      const existingContributor = await db
        .select()
        .from(contributors)
        .where(eq(contributors.username, username))
        .limit(1);

      if (existingContributor.length > 0) {
        contributorId = existingContributor[0]!.id;

        // Update existing contributor
        await db
          .update(contributors)
          .set({
            url: contributorData.url || "",
            avatarUrl: contributorData.avatar_url || "",
            updatedAt: new Date(),
          })
          .where(eq(contributors.id, contributorId));
      } else {
        // Create new contributor
        const newContributor: InsertContributor = {
          username: username,
          url: contributorData.url || "",
          avatarUrl: contributorData.avatar_url || "",
          summary: null, // Initially empty, to be populated by AI
        };

        const [inserted] = await db
          .insert(contributors)
          .values(newContributor)
          .returning({ id: contributors.id });

        contributorId = inserted!.id;
        stats.contributorsCreated++;
      }

      contributorCache.set(username, contributorId);
    }

    stats.contributorsProcessed++;

    if (stats.contributorsProcessed % 10 === 0) {
      console.log(
        `📝 Processed ${stats.contributorsProcessed}/${totalContributors} contributors...`,
      );
    }

    // --- 2. Process Works (Repositories) for this Contributor ---
    const worksData = contributorData.works || [];

    for (const workData of worksData) {
      const repoUrl = workData.repository_url;
      if (!repoUrl) {
        if (verbose) {
          console.log(
            `⚠️  Skipping work for ${username} - missing repository_url`,
          );
        }
        continue;
      }

      // --- 3. Create or Update Repository ---
      let repositoryId = repoCache.get(repoUrl);

      if (!repositoryId) {
        const parsed = parseGithubUrl(repoUrl);
        if (!parsed) {
          if (verbose) {
            console.log(`⚠️  Invalid repository URL: ${repoUrl}`);
          }
          continue;
        }

        const fullName = `${parsed.owner}/${parsed.repo}`;

        // Check if repository exists
        const existingRepo = await db
          .select()
          .from(repositories)
          .where(eq(repositories.url, repoUrl))
          .limit(1);

        if (existingRepo.length > 0) {
          repositoryId = existingRepo[0]!.id;

          // Update existing repository
          await db
            .update(repositories)
            .set({
              name: fullName,
              updatedAt: new Date(),
            })
            .where(eq(repositories.id, repositoryId));
        } else {
          // Create new repository
          const newRepository: InsertRepository = {
            name: fullName,
            url: repoUrl,
            avatarUrl: "", // Not available in input JSON
            summary: null, // Initially empty, to be populated by AI
            rawData: null, // Could store full repo details if needed
          };

          const [inserted] = await db
            .insert(repositories)
            .values(newRepository)
            .returning({ id: repositories.id });

          repositoryId = inserted!.id;
          stats.repositoriesCreated++;
        }

        repoCache.set(repoUrl, repositoryId);
      }

      // --- 4. Create or Update RepositoryWork ---
      const existingWork = await db
        .select()
        .from(repositoryWorks)
        .where(
          and(
            eq(repositoryWorks.repositoryId, repositoryId),
            eq(repositoryWorks.contributorId, contributorId),
          ),
        )
        .limit(1);

      let repositoryWorkId: number;

      if (existingWork.length > 0) {
        repositoryWorkId = existingWork[0]!.id;

        // Update existing work
        await db
          .update(repositoryWorks)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(repositoryWorks.id, repositoryWorkId));
      } else {
        // Create new repository work
        const newWork: InsertRepositoryWork = {
          repositoryId: repositoryId,
          contributorId: contributorId,
          summary: null, // Initially empty, to be populated by AI
        };

        const [inserted] = await db
          .insert(repositoryWorks)
          .values(newWork)
          .returning({ id: repositoryWorks.id });

        repositoryWorkId = inserted!.id;
        stats.repositoryWorksCreated++;
      }

      // --- 5. Create or Update Issues for this RepositoryWork ---
      const issuesData = workData.issues || [];

      for (const issueData of issuesData) {
        const issueUrl = issueData.html_url;
        if (!issueUrl) {
          if (verbose) {
            console.log(`⚠️  Skipping issue - missing html_url`);
          }
          continue;
        }

        // Check if issue exists
        const existingIssue = await db
          .select()
          .from(issues)
          .where(
            and(
              eq(issues.repositoryWorkId, repositoryWorkId),
              eq(issues.url, issueUrl),
            ),
          )
          .limit(1);

        if (existingIssue.length === 0) {
          // Create new issue
          const newIssue: InsertIssue = {
            repositoryWorkId: repositoryWorkId,
            url: issueUrl,
            rawData: issueData, // Store the complete issue data
            summary: null, // Initially empty, to be populated by AI
          };

          await db.insert(issues).values(newIssue);
          stats.issuesCreated++;
        } else {
          // Update existing issue
          await db
            .update(issues)
            .set({
              rawData: issueData,
              updatedAt: new Date(),
            })
            .where(eq(issues.id, existingIssue[0]!.id));
        }
      }

      // --- 6. Create or Update Commits for this RepositoryWork ---
      const commitsData = workData.commits || [];

      for (const commitData of commitsData) {
        const commitUrl = commitData.url;
        if (!commitUrl) {
          if (verbose) {
            console.log(`⚠️  Skipping commit - missing url`);
          }
          continue;
        }

        // Check if commit exists
        const existingCommit = await db
          .select()
          .from(commits)
          .where(
            and(
              eq(commits.repositoryWorkId, repositoryWorkId),
              eq(commits.url, commitUrl),
            ),
          )
          .limit(1);

        if (existingCommit.length === 0) {
          // Create new commit
          const newCommit: InsertCommit = {
            repositoryWorkId: repositoryWorkId,
            url: commitUrl,
            rawData: commitData, // Store the complete commit data
            summary: null, // Initially empty, to be populated by AI
          };

          await db.insert(commits).values(newCommit);
          stats.commitsCreated++;
        } else {
          // Update existing commit
          await db
            .update(commits)
            .set({
              rawData: commitData,
              updatedAt: new Date(),
            })
            .where(eq(commits.id, existingCommit[0]!.id));
        }
      }
    }
  }

  // Print statistics
  console.log("\n✅ Database population completed successfully!\n");
  console.log("📊 Statistics:");
  console.log(`  • Contributors processed: ${stats.contributorsProcessed}`);
  console.log(`  • Contributors created: ${stats.contributorsCreated}`);
  console.log(`  • Repositories created: ${stats.repositoriesCreated}`);
  console.log(`  • Repository works created: ${stats.repositoryWorksCreated}`);
  console.log(`  • Issues created: ${stats.issuesCreated}`);
  console.log(`  • Commits created: ${stats.commitsCreated}`);
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
    console.log(
      `  • Issue limit per repo: ${data.metadata.issue_detail_limit_per_repo ?? "ALL"}`,
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
