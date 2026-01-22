#!/usr/bin/env node
// -*- coding: utf-8 -*-

import { env } from "@/env";
import type {
  ContributorIngestionData,
  GithubCommitDetails,
  GithubUser,
  StoredCommitData,
} from "@/types/github";
import axios, { type AxiosResponse } from "axios";
import { config } from "dotenv";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";

config();

// --- Script-Specific Type Definitions ---

interface GithubRepoInfo {
  owner: string;
  repo: string;
}

interface GithubCommitSummary {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: GithubUser | null;
}

interface AxiosError {
  code?: string;
  message: string;
}

interface ApiErrorResponse {
  message?: string;
  errors?: unknown[];
}

// --- Configuration ---
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_API_VERSION = "2022-11-28";
const API_BASE_URL = "https://api.github.com";
const COMMIT_MESSAGE_MAX_LEN = 200;
const MAX_COMMITS_TO_DETAIL_PER_REPO: number | null = 1000;
// Batch size for processing commits (to avoid memory issues)
const COMMIT_BATCH_SIZE = 200;
// Concurrency limits for parallel processing
// Lower concurrency to avoid overwhelming GitHub API and causing timeouts
const CONCURRENT_COMMIT_DETAILS = 5; // Fetch 5 commit details in parallel (reduced from 20)
const CONCURRENT_REPOS = 3; // Process 3 repositories in parallel

// Repository configuration
interface RepoConfig {
  url: string;
  branch?: string;
}

const REPOSITORIES: RepoConfig[] = [
  { url: "https://github.com/shashi-ntx/test-clone-prism-reactjs", branch: "master" },
  { url: "https://github.com/jerome-marshall-ntx/prism-ui-draas", branch: "master" },
  { url: "https://github.com/jerome-marshall-ntx/prism-ui-security-dashboard", branch: "main" },
  { url: "https://github.com/jerome-marshall-ntx/flow-ui-main", branch: "flow-ui-ng-master" },
  { url: "https://github.com/jerome-marshall-ntx/iam-ui", branch: "master" },
];

// Files to ignore when collecting commit diffs (package locks, generated files, etc.)
const IGNORED_FILE_PATTERNS = [
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /bun\.lockb?$/i,
  /Gemfile\.lock$/i,
  /Cargo\.lock$/i,
  /composer\.lock$/i,
  /Pipfile\.lock$/i,
  /poetry\.lock$/i,
  /go\.sum$/i,
  /shrinkwrap\.yaml$/i,
  /\.min\.js$/i,
  /\.min\.css$/i,
  /\.bundle\.js$/i,
  /dist\//i,
  /build\//i,
  /node_modules\//i,
  /vendor\//i,
  /mock[s]?[\./\\]/i, // Matches 'mock/', 'mocks/', 'mock\', 'mocks\' (folder) or 'mock.' in files
  /\.mock\.(js|ts|json|cjs|mjs|jsx|tsx)$/i, // Matches files like '.mock.js' or '.mock.ts' etc
  /__mocks__\//i, // Jest-like convention for mock folders
  /\.snapshots?\//i, // Matches 'snapshot/' or 'snapshots/' directory
  /\.snap(\.js|\.ts|\.json|\.cjs|\.mjs|\.jsx|\.tsx)?$/i, // snapshot files (Jest, etc)
  /__snapshots__\//i, // Jest-like convention for snapshot folders
  // Image files
  /\.png$/i,
  /\.jpe?g$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.ico$/i,
  /\.webp$/i,
  /\.bmp$/i,
  /\.tiff?$/i,
];

// --- Helper Functions ---

/**
 * Checks if a file should be ignored based on patterns (lock files, minified files, etc.)
 */
function shouldIgnoreFile(filename: string): boolean {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * Parses a GitHub repository URL to extract owner and repo name.
 */
function parseGithubUrl(url: string): GithubRepoInfo | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.toLowerCase() !== "github.com") {
      console.log(`⚠️  Not a GitHub URL: ${url}`);
      return null;
    }
    const pathParts = urlObj.pathname.split("/").filter((part) => part);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1]?.endsWith(".git")
        ? pathParts[1].slice(0, -4)
        : pathParts[1];

      if (!owner || !repo) {
        console.log(`⚠️  Invalid repo path: ${urlObj.pathname}`);
        return null;
      }

      return { owner, repo };
    } else {
      console.log(`⚠️  Invalid repo path: ${urlObj.pathname}`);
      return null;
    }
  } catch (e) {
    const error = e as Error;
    console.log(`❌ URL parse error: ${error.message}`);
    return null;
  }
}

/**
 * Makes a request to the GitHub API with headers and error handling.
 */
async function makeGithubRequest(
  url: string,
  token: string | null,
  params: Record<string, string | number | boolean> = {},
  acceptHeader = "application/vnd.github+json",
): Promise<AxiosResponse | null> {
  const headers: Record<string, string> = {
    Accept: acceptHeader,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let retries = 2;
  while (retries >= 0) {
    try {
      const response = await axios.get(url, {
        headers,
        params,
        timeout: 60000,
        validateStatus: (status) => status < 600, // Don't throw on any status
      });

      // Handle rate limiting
      if (
        response.status === 403 &&
        response.headers["x-ratelimit-remaining"] === "0"
      ) {
        if (retries > 0) {
          const resetTime = parseInt(
            (response.headers["x-ratelimit-reset"] as string) ??
            (Date.now() / 1000 + 60).toString(),
          );
          const waitTime = Math.max(0, resetTime - Date.now() / 1000) + 5;
          console.log(`⏳ Rate limit hit, waiting ${waitTime.toFixed(0)}s...`);
          await sleep(waitTime * 1000);
          retries--;
          continue;
        } else {
          console.log(`❌ Rate limit exceeded, no retries left`);
          return null;
        }
      }

      // Handle various status codes
      if (response.status === 301) {
        console.log(`🔄 Resource moved permanently (301)`);
        return null;
      } else if (response.status === 404) {
        console.log(`❌ Resource not found (404)`);
        return null;
      } else if (response.status === 410) {
        console.log(`🗑️  Resource deleted (410)`);
        return null;
      } else if (response.status === 403) {
        console.log(`🚫 Forbidden (403) - check permissions`);
        return null;
      } else if (response.status === 204) {
        console.log(`📭 No content (204)`);
        return response;
      } else if (response.status === 409) {
        console.log(`⚠️  Conflict (409) - repo might be empty`);
        return null;
      } else if (response.status === 422) {
        console.log(`❌ Invalid input (422)`);
        return null;
      } else if (response.status >= 500) {
        console.log(`🔥 Server error (${response.status})`);
        return null;
      } else if (response.status >= 400) {
        console.log(`❌ HTTP error (${response.status})`);
        return null;
      }

      return response;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (
        axiosError.code === "ECONNABORTED" ||
        axiosError.code === "ETIMEDOUT"
      ) {
        console.log(`🌐 Network error: ${axiosError.message}`);
        if (retries > 0) {
          console.log("🔄 Retrying...");
          await sleep(5000);
          retries--;
          continue;
        } else {
          console.log("❌ Network error persisted");
          return null;
        }
      } else {
        console.log(`💥 Unexpected error: ${axiosError.message}`);
        return null;
      }
    }
  }
  return null;
}

/**
 * Fetches paginated data from a GitHub API endpoint.
 */
async function fetchPaginatedData<T = unknown>(
  url: string,
  token: string | null,
  params: Record<string, string | number | boolean> = {},
): Promise<T[] | null> {
  const allData: T[] = [];
  let page = 1;
  let currentUrl: string | null = url;
  const requestParams = { ...params, page };

  while (currentUrl) {
    console.log(`📄 Page ${page}...`);
    const response = await makeGithubRequest(
      currentUrl,
      token,
      page === 1 ? requestParams : {},
    );

    if (!response) return null;
    if (response.status === 204) break;

    try {
      const pageData = response.data as T[];
      if (!Array.isArray(pageData)) {
        console.log(`⚠️  Expected array, got ${typeof pageData}`);
        if (
          typeof pageData === "object" &&
          pageData !== null &&
          ((pageData as unknown as ApiErrorResponse).message ??
            (pageData as unknown as ApiErrorResponse).errors)
        ) {
          console.log(`❌ API error detected, stopping`);
          return allData.length > 0 ? allData : null;
        }
        break;
      }
      if (pageData.length === 0) break;

      allData.push(...pageData);

      // Check for Link header pagination
      const linkHeader = response.headers.link as string | undefined;
      if (linkHeader) {
        const nextMatch = /<([^>]+)>;\s*rel="next"/.exec(linkHeader);
        if (nextMatch?.[1]) {
          currentUrl = nextMatch[1];
          page++;
          await sleep(100);
        } else {
          currentUrl = null;
        }
      } else {
        currentUrl = null;
      }
    } catch (e) {
      const error = e as Error;
      console.log(`❌ Page ${page} error: ${error.message}`);
      return allData.length > 0 ? allData : null;
    }
  }

  console.log(`✅ Fetched ${allData.length} items`);
  return allData;
}

// --- Functions to Fetch Data ---

/**
 * Fetches the list of contributors for a specific repository.
 */
async function fetchContributorsFromRepo(
  owner: string,
  repo: string,
  token: string | null = null,
): Promise<GithubUser[] | null> {
  const contributorsUrl = `${API_BASE_URL}/repos/${owner}/${repo}/contributors`;
  console.log(`👥 Fetching contributors for ${owner}/${repo}`);
  return await fetchPaginatedData<GithubUser>(contributorsUrl, token, {
    per_page: 100,
    anon: "false",
  });
}

/**
 * Fetches commit summaries for a specific repository.
 */
async function fetchRepositoryCommits(
  owner: string,
  repo: string,
  token: string | null = null,
  branch = "master",
): Promise<GithubCommitSummary[] | null> {
  const commitsUrl = `${API_BASE_URL}/repos/${owner}/${repo}/commits`;
  const params = { per_page: 100, sha: branch };
  console.log(`💾 Fetching commits for ${owner}/${repo} (branch: ${branch})`);
  return await fetchPaginatedData<GithubCommitSummary>(
    commitsUrl,
    token,
    params,
  );
}

/**
 * Fetches detailed information for a single commit with timeout.
 */
async function fetchCommitDetails(
  owner: string,
  repo: string,
  commitSha: string,
  token: string | null = null,
): Promise<GithubCommitDetails | null> {
  const commitUrl = `${API_BASE_URL}/repos/${owner}/${repo}/commits/${commitSha}`;

  // Add timeout to prevent hanging
  const timeoutMs = 60000; // 60 second timeout (some large commits take longer)
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout fetching commit ${commitSha}`)), timeoutMs);
  });

  try {
    const response = await Promise.race([
      makeGithubRequest(commitUrl, token),
      timeoutPromise,
    ]);

    if (response?.status === 200) {
      // Small delay to avoid overwhelming the API with parallel requests
      await sleep(100);
      return response.data as GithubCommitDetails;
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ Failed to fetch commit ${commitSha.slice(0, 7)}: ${(error as Error).message}`);
    return null;
  }
}

// --- Main Processing Function ---

/**
 * Processes a single repository and fetches contributor data.
 */
async function processSingleRepository(
  repoConfig: RepoConfig,
  token: string | null = null,
): Promise<Record<string, ContributorIngestionData>> {
  const allContributorsMap: Record<string, ContributorIngestionData> = {};
  const { url: repoUrl, branch = "master" } = repoConfig;

  console.log(`\n🔍 Processing: ${repoUrl} (branch: ${branch})`);
  const parsedInfo = parseGithubUrl(repoUrl);
  if (!parsedInfo) return allContributorsMap;

  const { owner, repo } = parsedInfo;
  const canonicalRepoUrl = `https://github.com/${owner}/${repo}`;

  // Step 1: Fetch Contributors
  const repoContributors =
    (await fetchContributorsFromRepo(owner, repo, token)) ?? [];

  for (const contributorData of repoContributors) {
    const requiredKeys = ["login", "id", "html_url", "avatar_url"];
    if (
      !requiredKeys.every((k) => k in contributorData) ||
      contributorData.type !== "User"
    ) {
      continue;
    }

    const username = contributorData.login;
    if (!username) continue;

    allContributorsMap[username] ??= {
      id: contributorData.id,
      username: username,
      url: contributorData.html_url,
      avatar_url: contributorData.avatar_url,
      works: [],
    };
    allContributorsMap[username].works ??= [];
  }

  // Step 2: Fetch and Process Commits (PARALLELIZED VERSION)
  const repoCommitsList = await fetchRepositoryCommits(owner, repo, token, branch);
  const commitsAuthoredByUserInRepo: Record<string, StoredCommitData[]> = {};
  const authorDetailsCache: Record<
    string,
    {
      id: number | null;
      url: string;
      avatar_url: string;
      is_github_user: boolean;
    }
  > = {};

  if (repoCommitsList) {
    const limitStrCommits =
      MAX_COMMITS_TO_DETAIL_PER_REPO !== null
        ? `${MAX_COMMITS_TO_DETAIL_PER_REPO}`
        : "all";
    console.log(
      `💾 Processing ${repoCommitsList.length} commits (limit: ${limitStrCommits})`,
    );

    // First pass: Extract author info and prepare commits for parallel fetching
    interface CommitToProcess {
      commitSha: string;
      commitSummary: GithubCommitSummary;
      authorUsername: string;
      authorId: number | null;
      authorUrl: string | null;
      authorAvatarUrl: string | null;
      isGitHubUser: boolean;
      commitMessageSummary: string;
      index: number;
    }

    const commitsToProcess: CommitToProcess[] = [];
    let commitsDetailedCount = 0;

    for (const commitSummaryData of repoCommitsList) {
      const commitSha = commitSummaryData.sha;
      if (!commitSha) continue;

      // Extract author information
      const commitAuthorInfo = commitSummaryData.author;
      let authorUsername: string | null = null;
      let authorId: number | null = null;
      let authorUrl: string | null = null;
      let authorAvatarUrl: string | null = null;
      let isGitHubUser = false;

      if (
        commitAuthorInfo &&
        typeof commitAuthorInfo === "object" &&
        commitAuthorInfo.login &&
        commitAuthorInfo.type === "User"
      ) {
        authorUsername = commitAuthorInfo.login;
        authorId = commitAuthorInfo.id;
        authorUrl = commitAuthorInfo.html_url;
        authorAvatarUrl = commitAuthorInfo.avatar_url;
        isGitHubUser = true;
      } else if (commitSummaryData.commit?.author?.name) {
        const gitAuthorName = commitSummaryData.commit.author.name;
        authorUsername = gitAuthorName.replace(/\s+/g, "-").toLowerCase();
        authorId = null;
        authorUrl = null;
        authorAvatarUrl = null;
        isGitHubUser = false;
      } else {
        continue;
      }

      if (!authorUsername || !commitSummaryData.html_url) continue;

      const commitMessage =
        commitSummaryData.commit?.message ?? "No commit message";
      let commitMessageSummary = commitMessage.split("\n")[0] ?? "";
      if (commitMessageSummary.length > COMMIT_MESSAGE_MAX_LEN) {
        commitMessageSummary =
          commitMessageSummary.slice(0, COMMIT_MESSAGE_MAX_LEN - 3) + "...";
      }

      const shouldFetchDetails =
        MAX_COMMITS_TO_DETAIL_PER_REPO === null ||
        commitsDetailedCount < MAX_COMMITS_TO_DETAIL_PER_REPO;

      if (shouldFetchDetails) {
        commitsToProcess.push({
          commitSha,
          commitSummary: commitSummaryData,
          authorUsername,
          authorId,
          authorUrl,
          authorAvatarUrl,
          isGitHubUser,
          commitMessageSummary,
          index: commitsDetailedCount,
        });
        commitsDetailedCount++;
      }
    }

    // Process commits in batches to avoid memory issues
    const totalCommits = commitsToProcess.length;
    const totalBatches = Math.ceil(totalCommits / COMMIT_BATCH_SIZE);
    console.log(
      `💾 Processing ${totalCommits} commits in ${totalBatches} batches of ${COMMIT_BATCH_SIZE}...`,
    );

    let totalFailedCount = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * COMMIT_BATCH_SIZE;
      const batchEnd = Math.min(batchStart + COMMIT_BATCH_SIZE, totalCommits);
      const batchCommits = commitsToProcess.slice(batchStart, batchEnd);

      console.log(
        `\n📦 Batch ${batchIndex + 1}/${totalBatches}: Processing commits ${batchStart + 1}-${batchEnd}...`,
      );

      // Fetch commit details for this batch in parallel
      const batchResults = await processInParallel(
        batchCommits,
        async ({ commitSha, authorUsername }, index) => {
          const globalIndex = batchStart + index + 1;
          console.log(
            `💾 [${repo}] [${globalIndex}/${totalCommits}] Commit ${commitSha.slice(0, 7)} by ${authorUsername}`,
          );
          return await fetchCommitDetails(owner, repo, commitSha, token);
        },
        CONCURRENT_COMMIT_DETAILS,
      );

      // Process this batch's results immediately
      for (let i = 0; i < batchCommits.length; i++) {
        const commitInfo = batchCommits[i];
        if (!commitInfo) continue;
        const detailedCommitData = batchResults[i];

        const simplifiedCommit: StoredCommitData = {
          sha: commitInfo.commitSha,
          url: commitInfo.commitSummary.html_url,
          message: commitInfo.commitMessageSummary,
          files_changed: null,
          comment_count: null,
          diff_patch: null,
        };

        if (detailedCommitData) {
          const files = detailedCommitData.files ?? [];
          const commentCount = detailedCommitData.commit?.comment_count ?? 0;

          simplifiedCommit.comment_count = commentCount;

          // Filter out ignored files
          const relevantFiles = files.filter(
            (f) => f.filename && !shouldIgnoreFile(f.filename),
          );

          simplifiedCommit.files_changed = relevantFiles
            .map((f) => ({
              filename: f.filename,
              status: f.status,
            }))
            .filter((f) => f.filename);

          let combinedPatch = "";
          for (const f of relevantFiles) {
            if (f?.patch && typeof f.patch === "string" && f.patch) {
              combinedPatch += `--- File: ${f.filename ?? "Unknown"} ---\n`;
              combinedPatch += f.patch;
              combinedPatch += "\n\n";
            }
          }
          simplifiedCommit.diff_patch = combinedPatch.trim() || null;

          const ignoredCount = files.length - relevantFiles.length;
          if (ignoredCount > 0) {
            console.log(
              `   🚫 Commit ${commitInfo.commitSha.slice(0, 7)}: Filtered ${ignoredCount} ignored file(s)`,
            );
          }
        }

        commitsAuthoredByUserInRepo[commitInfo.authorUsername] ??= [];

        const isDuplicate = commitsAuthoredByUserInRepo[
          commitInfo.authorUsername
        ]!.some((c) => c.sha === simplifiedCommit.sha);
        if (!isDuplicate) {
          commitsAuthoredByUserInRepo[commitInfo.authorUsername]!.push(
            simplifiedCommit,
          );
        }

        // Store author details
        authorDetailsCache[commitInfo.authorUsername] ??= {
          id: commitInfo.authorId,
          url: commitInfo.authorUrl ?? "",
          avatar_url: commitInfo.authorAvatarUrl ?? "",
          is_github_user: commitInfo.isGitHubUser,
        };
      }

      const batchFailedCount = batchResults.filter((r) => r === null).length;
      totalFailedCount += batchFailedCount;

      console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} complete`);

      // Clear batch data from memory
      batchResults.length = 0;
    }

    if (totalFailedCount > 0) {
      console.log(`⚠️  Failed to fetch ${totalFailedCount} commit(s) total`);
    }
  } else {
    console.log(`📭 No commits found`);
  }

  // Step 3: Integrate Commits into Contributor Works
  const involvedUsersInRepo = new Set<string>();
  if (repoContributors) {
    repoContributors.forEach((c) => {
      if (c.login) involvedUsersInRepo.add(c.login);
    });
  }
  Object.keys(commitsAuthoredByUserInRepo).forEach((u) =>
    involvedUsersInRepo.add(u),
  );

  console.log(`🔗 Integrating ${involvedUsersInRepo.size} users`);

  for (const username of involvedUsersInRepo) {
    if (!allContributorsMap[username]) {
      const details = authorDetailsCache[username];
      // *** IMPROVED: Accept details even without GitHub ID/URL ***
      if (details) {
        console.log(`➕ Adding contributor: ${username}`);
        allContributorsMap[username] = {
          id: details.id ?? null,
          username: username,
          url: details.url ?? "",
          avatar_url: details.avatar_url ?? "",
          works: [],
        };
      } else {
        console.log(`⚠️  Skipping user: ${username} (no details)`);
        continue;
      }
    }

    allContributorsMap[username].works ??= [];
    const contributorWorks = allContributorsMap[username].works;

    const userCommitsInRepo = commitsAuthoredByUserInRepo[username] ?? [];

    if (userCommitsInRepo.length > 0) {
      let repoWorkEntry = contributorWorks.find(
        (work) => work.repository_url === canonicalRepoUrl,
      );

      if (!repoWorkEntry) {
        repoWorkEntry = {
          repository_url: canonicalRepoUrl,
          commits: userCommitsInRepo,
        };
        contributorWorks.push(repoWorkEntry);
      } else {
        repoWorkEntry.commits = userCommitsInRepo;
      }
    }
  }

  return allContributorsMap;
}

/**
 * Processes multiple repositories and fetches contributor data in parallel.
 */
async function processRepositories(
  repoConfigs: RepoConfig[],
  token: string | null = null,
): Promise<Record<string, ContributorIngestionData>> {
  console.log(
    `🚀 Processing ${repoConfigs.length} repositories in parallel (concurrency: ${CONCURRENT_REPOS})...`,
  );

  const repoResults = await processInParallel(
    repoConfigs,
    async (repoConfig) => await processSingleRepository(repoConfig, token),
    CONCURRENT_REPOS,
  );

  // Merge all contributor maps
  const allContributorsMap: Record<string, ContributorIngestionData> = {};

  for (const repoContributorsMap of repoResults) {
    if (!repoContributorsMap) continue; // Skip null results from failed repos
    for (const [username, contributorData] of Object.entries(
      repoContributorsMap,
    )) {
      if (!allContributorsMap[username]) {
        allContributorsMap[username] = contributorData;
      } else {
        // Merge works from different repositories
        const existingWorks = allContributorsMap[username].works ?? [];
        const newWorks = contributorData.works ?? [];
        const mergedWorks = [...existingWorks];

        for (const newWork of newWorks) {
          const existingWorkIndex = mergedWorks.findIndex(
            (w) => w.repository_url === newWork.repository_url,
          );
          if (existingWorkIndex >= 0) {
            // Merge commits for the same repo
            mergedWorks[existingWorkIndex] = {
              repository_url: newWork.repository_url,
              commits: newWork.commits,
            };
          } else {
            mergedWorks.push(newWork);
          }
        }

        allContributorsMap[username].works = mergedWorks;
      }
    }
  }

  return allContributorsMap;
}

// --- Utility Functions ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes items in parallel with a concurrency limit.
 * @param items Array of items to process
 * @param processor Function that processes each item
 * @param concurrency Maximum number of concurrent operations
 * @returns Array of results in the same order as input
 */
async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array<R | null>(items.length).fill(null);
  let index = 0;

  const executeNext = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      if (item === undefined) continue;

      try {
        const result = await processor(item, currentIndex);
        results[currentIndex] = result;
      } catch (error) {
        console.error(`   ⚠️ Error processing item ${currentIndex}:`, (error as Error).message);
        results[currentIndex] = null;
      }
    }
  };

  // Start concurrent workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(executeNext());
  }

  await Promise.all(workers);
  return results;
}

// --- Main Execution ---

async function main(): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.log("⚠️  No GitHub token found - using unauthenticated requests");
    console.log("📉 Rate limits will be much lower");
  } else {
    if (
      GITHUB_TOKEN.startsWith("ghp_") ||
      GITHUB_TOKEN.startsWith("ghu_") ||
      GITHUB_TOKEN.startsWith("github_pat")
    ) {
      console.log("🔑 GitHub token loaded successfully");
    } else {
      console.log("⚠️  Token format looks unusual");
    }
  }

  if (MAX_COMMITS_TO_DETAIL_PER_REPO !== null) {
    console.log(`📊 Commit limit: ${MAX_COMMITS_TO_DETAIL_PER_REPO} per repo`);
  } else {
    console.log("📊 Commit limit: ALL commits");
  }

  const startTime = Date.now();
  console.log(`🔄 Starting repository processing...`);

  let contributorsMap: Record<string, ContributorIngestionData>;
  try {
    contributorsMap = await processRepositories(
      REPOSITORIES,
      GITHUB_TOKEN,
    );
    console.log(`✅ Repository processing complete`);
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Processing failed: ${err.message}`);
    console.error(err.stack);
    return;
  }

  const endTime = Date.now();

  console.log(`🔄 Sorting contributors...`);
  const finalContributorList = Object.values(contributorsMap);
  finalContributorList.sort((a, b) =>
    (a.username || "")
      .toLowerCase()
      .localeCompare((b.username || "").toLowerCase()),
  );

  console.log(
    `\n✅ Processing completed in ${((endTime - startTime) / 1000).toFixed(1)}s`,
  );
  console.log(`👥 Found ${finalContributorList.length} contributors`);

  const outputFilename =
    "github_contributors_simplified_issues_commits_v4.json";
  const outputPath = `./data/${outputFilename}`;

  try {
    console.log(`💾 Saving data to ${outputFilename} (streaming)...`);

    // Stream write to avoid memory issues with large JSON
    const writeStream = await fs.open(outputPath, "w");

    // Write opening
    await writeStream.write('{\n  "contributors": [\n');

    // Write each contributor individually
    for (let i = 0; i < finalContributorList.length; i++) {
      const contributor = finalContributorList[i];
      const contributorJson = JSON.stringify(contributor, null, 4)
        .split('\n')
        .map(line => '    ' + line)
        .join('\n');

      await writeStream.write(contributorJson);

      if (i < finalContributorList.length - 1) {
        await writeStream.write(',\n');
      } else {
        await writeStream.write('\n');
      }

      // Log progress every 10 contributors
      if ((i + 1) % 10 === 0) {
        console.log(`   📝 Written ${i + 1}/${finalContributorList.length} contributors`);
      }
    }

    // Write metadata and close
    const metadata = {
      processed_repos: REPOSITORIES,
      processing_time_seconds: ((endTime - startTime) / 1000).toFixed(2),
      commit_detail_limit_per_repo: MAX_COMMITS_TO_DETAIL_PER_REPO,
    };

    await writeStream.write('  ],\n');
    await writeStream.write(`  "metadata": ${JSON.stringify(metadata, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')}\n`);
    await writeStream.write('}\n');

    await writeStream.close();
    console.log(`✅ Data saved successfully`);
  } catch (error) {
    const err = error as Error;
    console.log(`❌ Save error: ${err.message}`);
    console.error(err.stack);
  }

  const usersWithNoWorks = finalContributorList.filter((c) => !c.works?.length);
  if (usersWithNoWorks.length > 0) {
    console.log(
      `\n📝 Note: ${usersWithNoWorks.length} contributors had no recorded activity`,
    );
  }
}

// Run the script if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export {
  fetchCommitDetails,
  fetchContributorsFromRepo,
  fetchPaginatedData,
  fetchRepositoryCommits,
  makeGithubRequest,
  parseGithubUrl,
  processRepositories
};

