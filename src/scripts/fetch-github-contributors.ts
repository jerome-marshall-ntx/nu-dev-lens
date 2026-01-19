#!/usr/bin/env node
// -*- coding: utf-8 -*-

import { env } from "@/env";
import type {
  ContributorIngestionData,
  GithubCommitDetails,
  GithubIssue,
  GithubUser,
  IngestionOutputData,
  StoredCommitData,
  StoredIssueData,
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
const MAX_COMMITS_TO_DETAIL_PER_REPO: number | null = 500;
const MAX_ISSUES_TO_DETAIL_PER_REPO: number | null = 500;
// Concurrency limits for parallel processing
// Rate limiter handles throttling, so we can use higher concurrency
const CONCURRENT_ISSUE_DETAILS = 20; // Fetch 20 issue details in parallel
const CONCURRENT_COMMIT_DETAILS = 20; // Fetch 20 commit details in parallel
const CONCURRENT_REPOS = 3; // Process 3 repositories in parallel

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
 * Fetches a list of issue summaries for a specific repository.
 */
async function fetchRepositoryIssuesList(
  owner: string,
  repo: string,
  token: string | null = null,
  state = "closed",
): Promise<GithubIssue[] | null> {
  const issuesUrl = `${API_BASE_URL}/repos/${owner}/${repo}/issues`;
  const params = { state, per_page: 100 };
  console.log(`📋 Fetching ${state} issues for ${owner}/${repo}`);
  return await fetchPaginatedData<GithubIssue>(issuesUrl, token, params);
}

/**
 * Fetches detailed information for a single issue.
 */
async function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string | null = null,
): Promise<GithubIssue | null> {
  const issueUrl = `${API_BASE_URL}/repos/${owner}/${repo}/issues/${issueNumber}`;
  const acceptHeader = "application/vnd.github.raw+json";
  const response = await makeGithubRequest(issueUrl, token, {}, acceptHeader);

  if (response?.status === 200) {
    // Small delay to avoid overwhelming the API with parallel requests
    await sleep(100);
    return response.data as GithubIssue;
  }
  return null;
}

/**
 * Fetches commit summaries for a specific repository.
 */
async function fetchRepositoryCommits(
  owner: string,
  repo: string,
  token: string | null = null,
): Promise<GithubCommitSummary[] | null> {
  const commitsUrl = `${API_BASE_URL}/repos/${owner}/${repo}/commits`;
  const params = { per_page: 100 };
  console.log(`💾 Fetching commits for ${owner}/${repo}`);
  return await fetchPaginatedData<GithubCommitSummary>(
    commitsUrl,
    token,
    params,
  );
}

/**
 * Fetches detailed information for a single commit.
 */
async function fetchCommitDetails(
  owner: string,
  repo: string,
  commitSha: string,
  token: string | null = null,
): Promise<GithubCommitDetails | null> {
  const commitUrl = `${API_BASE_URL}/repos/${owner}/${repo}/commits/${commitSha}`;
  const response = await makeGithubRequest(commitUrl, token);

  if (response?.status === 200) {
    // Small delay to avoid overwhelming the API with parallel requests
    await sleep(100);
    return response.data as GithubCommitDetails;
  }
  return null;
}

// --- Main Processing Function ---

/**
 * Processes a single repository and fetches contributor data.
 */
async function processSingleRepository(
  repoUrl: string,
  token: string | null = null,
): Promise<Record<string, ContributorIngestionData>> {
  const allContributorsMap: Record<string, ContributorIngestionData> = {};

  console.log(`\n🔍 Processing: ${repoUrl}`);
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

  // Step 2: Fetch and Process Closed Issues (PARALLELIZED)
  const repoClosedIssuesList = await fetchRepositoryIssuesList(
    owner,
    repo,
    token,
    "closed",
  );
  const issuesAssignedToUserInRepo: Record<string, StoredIssueData[]> = {};
  const assigneeDetailsCache: Record<
    string,
    { id: number | null; url: string; avatar_url: string }
  > = {};

  if (repoClosedIssuesList) {
    const limitStr =
      MAX_ISSUES_TO_DETAIL_PER_REPO !== null
        ? `${MAX_ISSUES_TO_DETAIL_PER_REPO}`
        : "all";
    console.log(
      `📋 Processing ${repoClosedIssuesList.length} issues (limit: ${limitStr})`,
    );

    // Filter and prepare issues for parallel fetching
    const issuesToFetch: Array<{
      issueNumber: number;
      index: number;
    }> = [];
    let issuesDetailedCount = 0;

    for (const issueSummaryData of repoClosedIssuesList) {
      if ("pull_request" in issueSummaryData) continue;
      if (issueSummaryData.state !== "closed") continue;

      const issueNumber = issueSummaryData.number;
      if (!issueNumber) continue;

      const shouldFetchDetails =
        MAX_ISSUES_TO_DETAIL_PER_REPO === null ||
        issuesDetailedCount < MAX_ISSUES_TO_DETAIL_PER_REPO;

      if (!shouldFetchDetails) {
        if (issuesDetailedCount === MAX_ISSUES_TO_DETAIL_PER_REPO) {
          console.log(
            `⏹️  Reached limit (${MAX_ISSUES_TO_DETAIL_PER_REPO}), skipping remaining issues`,
          );
          issuesDetailedCount++;
        }
        continue;
      }

      issuesToFetch.push({ issueNumber, index: issuesDetailedCount });
      issuesDetailedCount++;
    }

    console.log(
      `📋 Fetching ${issuesToFetch.length} issue details in parallel (concurrency: ${CONCURRENT_ISSUE_DETAILS})...`,
    );

    // Fetch issue details in parallel
    const issueDetailsResults = await processInParallel(
      issuesToFetch,
      async ({ issueNumber }, index) => {
        const limitStr =
          MAX_ISSUES_TO_DETAIL_PER_REPO !== null
            ? `${MAX_ISSUES_TO_DETAIL_PER_REPO}`
            : "all";
        console.log(`📋 [${index + 1}/${limitStr}] Issue #${issueNumber}`);
        return await fetchIssueDetails(owner, repo, issueNumber, token);
      },
      CONCURRENT_ISSUE_DETAILS,
    );

    // Process fetched issue details
    for (const detailedIssueData of issueDetailsResults) {
      if (!detailedIssueData) continue;

      // Create simplified issue object
      const simplifiedIssueData: StoredIssueData = {
        html_url: detailedIssueData.html_url,
        number: detailedIssueData.number,
        title: detailedIssueData.title,
        body: detailedIssueData.body,
        labels: detailedIssueData.labels ?? [],
        comments: detailedIssueData.comments ?? 0,
        state_reason: detailedIssueData.state_reason,
      };

      const issueDataToStore = simplifiedIssueData;

      let assigneesList = detailedIssueData.assignees ?? [];
      if (assigneesList.length === 0 && detailedIssueData.assignee) {
        assigneesList = [detailedIssueData.assignee];
      }

      if (assigneesList.length === 0) continue;

      for (const assignee of assigneesList) {
        if (
          assignee &&
          typeof assignee === "object" &&
          assignee.login &&
          assignee.type === "User"
        ) {
          const assigneeUsername = assignee.login;
          if (!assigneeUsername) continue;

          issuesAssignedToUserInRepo[assigneeUsername] ??= [];

          // Avoid adding duplicate issues
          const isDuplicate = issuesAssignedToUserInRepo[assigneeUsername].some(
            (i) => i.number === issueDataToStore.number,
          );
          if (!isDuplicate) {
            issuesAssignedToUserInRepo[assigneeUsername].push(issueDataToStore);
          }

          assigneeDetailsCache[assigneeUsername] ??= {
            id: assignee.id,
            url: assignee.html_url,
            avatar_url: assignee.avatar_url,
          };
        }
      }
    }

    const failedCount =
      issueDetailsResults.length -
      issueDetailsResults.filter((r) => r !== null).length;
    if (failedCount > 0) {
      console.log(`⚠️  Failed to fetch ${failedCount} issue(s)`);
    }
  } else {
    console.log(`📭 No closed issues found`);
  }

  // Step 3: Fetch and Process Commits (PARALLELIZED VERSION)
  const repoCommitsList = await fetchRepositoryCommits(owner, repo, token);
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

    console.log(
      `💾 Fetching ${commitsToProcess.length} commit details in parallel (concurrency: ${CONCURRENT_COMMIT_DETAILS})...`,
    );

    // Fetch commit details in parallel
    const commitDetailsResults = await processInParallel(
      commitsToProcess,
      async ({ commitSha, authorUsername }, index) => {
        const limitStrCommits =
          MAX_COMMITS_TO_DETAIL_PER_REPO !== null
            ? `${MAX_COMMITS_TO_DETAIL_PER_REPO}`
            : "all";
        console.log(
          `💾 [${index + 1}/${limitStrCommits}] Commit ${commitSha.slice(0, 7)} by ${authorUsername}`,
        );
        return await fetchCommitDetails(owner, repo, commitSha, token);
      },
      CONCURRENT_COMMIT_DETAILS,
    );

    // Process fetched commit details
    for (let i = 0; i < commitsToProcess.length; i++) {
      const commitInfo = commitsToProcess[i];
      if (!commitInfo) continue;
      const detailedCommitData = commitDetailsResults[i];

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

    const failedCount =
      commitDetailsResults.length -
      commitDetailsResults.filter((r) => r !== null).length;
    if (failedCount > 0) {
      console.log(`⚠️  Failed to fetch ${failedCount} commit(s)`);
    }
  } else {
    console.log(`📭 No commits found`);
  }

  // Step 4: Integrate Issues and Commits into Contributor Works
  const involvedUsersInRepo = new Set<string>();
  if (repoContributors) {
    repoContributors.forEach((c) => {
      if (c.login) involvedUsersInRepo.add(c.login);
    });
  }
  Object.keys(issuesAssignedToUserInRepo).forEach((u) =>
    involvedUsersInRepo.add(u),
  );
  Object.keys(commitsAuthoredByUserInRepo).forEach((u) =>
    involvedUsersInRepo.add(u),
  );

  console.log(`🔗 Integrating ${involvedUsersInRepo.size} users`);

  for (const username of involvedUsersInRepo) {
    if (!allContributorsMap[username]) {
      const details =
        assigneeDetailsCache[username] ?? authorDetailsCache[username];
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

    const userIssuesInRepo = issuesAssignedToUserInRepo[username] ?? [];
    const userCommitsInRepo = commitsAuthoredByUserInRepo[username] ?? [];

    if (userIssuesInRepo.length > 0 || userCommitsInRepo.length > 0) {
      let repoWorkEntry = contributorWorks.find(
        (work) => work.repository_url === canonicalRepoUrl,
      );

      if (!repoWorkEntry) {
        repoWorkEntry = {
          repository_url: canonicalRepoUrl,
          issues: userIssuesInRepo,
          commits: userCommitsInRepo,
        };
        contributorWorks.push(repoWorkEntry);
      } else {
        repoWorkEntry.issues = userIssuesInRepo;
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
  repoUrls: string[],
  token: string | null = null,
): Promise<Record<string, ContributorIngestionData>> {
  console.log(
    `🚀 Processing ${repoUrls.length} repositories in parallel (concurrency: ${CONCURRENT_REPOS})...`,
  );

  const repoResults = await processInParallel(
    repoUrls,
    async (repoUrl) => await processSingleRepository(repoUrl, token),
    CONCURRENT_REPOS,
  );

  // Merge all contributor maps
  const allContributorsMap: Record<string, ContributorIngestionData> = {};

  for (const repoContributorsMap of repoResults) {
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
            // Merge issues and commits for the same repo
            mergedWorks[existingWorkIndex] = {
              repository_url: newWork.repository_url,
              issues: newWork.issues,
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
  // All positions are filled by the processor, so we can safely assert the type
  return results as R[];
}

// --- Main Execution ---

async function main(): Promise<void> {
  const repositoryUrls: string[] = [
    // "https://github.com/shashi-ntx/demo-repository-1",
    "https://github.com/remeda/remeda",
  ];

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

  if (MAX_ISSUES_TO_DETAIL_PER_REPO !== null) {
    console.log(`📊 Issue limit: ${MAX_ISSUES_TO_DETAIL_PER_REPO} per repo`);
  } else {
    console.log("📊 Issue limit: ALL issues");
  }

  const startTime = Date.now();
  const contributorsMap = await processRepositories(
    repositoryUrls,
    GITHUB_TOKEN,
  );
  const endTime = Date.now();

  const finalContributorList = Object.values(contributorsMap);
  finalContributorList.sort((a, b) =>
    (a.username || "")
      .toLowerCase()
      .localeCompare((b.username || "").toLowerCase()),
  );

  const outputData: IngestionOutputData = {
    contributors: finalContributorList,
    metadata: {
      processed_repos: repositoryUrls,
      processing_time_seconds: ((endTime - startTime) / 1000).toFixed(2),
      commit_detail_limit_per_repo: MAX_COMMITS_TO_DETAIL_PER_REPO,
      issue_detail_limit_per_repo: MAX_ISSUES_TO_DETAIL_PER_REPO,
    },
  };

  console.log(
    `\n✅ Processing completed in ${((endTime - startTime) / 1000).toFixed(1)}s`,
  );
  console.log(`👥 Found ${finalContributorList.length} contributors`);

  const outputFilename =
    "github_contributors_simplified_issues_commits_v4.json";
  try {
    console.log(`💾 Saving data to ${outputFilename}...`);
    await fs.writeFile(
      `./data/${outputFilename}`,
      JSON.stringify(outputData, null, 2),
      "utf-8",
    );
    console.log(`✅ Data saved successfully`);
  } catch (error) {
    const err = error as Error;
    console.log(`❌ Save error: ${err.message}`);
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
  fetchIssueDetails,
  fetchPaginatedData,
  fetchRepositoryCommits,
  fetchRepositoryIssuesList,
  makeGithubRequest,
  parseGithubUrl,
  processRepositories,
};
