#!/usr/bin/env node
// -*- coding: utf-8 -*-

import axios, { type AxiosResponse } from "axios";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { env } from "@/env";

config();

// --- Type Definitions ---

interface GithubRepoInfo {
  owner: string;
  repo: string;
}

interface GithubUser {
  id: number;
  login: string;
  html_url: string;
  avatar_url: string;
  type: string;
}

interface GithubLabel {
  id: number;
  name: string;
  color: string;
}

interface GithubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  state_reason: string | null;
  labels: GithubLabel[];
  comments: number;
  assignees: GithubUser[];
  assignee: GithubUser | null;
  user: GithubUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface GithubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

interface GithubCommit {
  message: string;
  author: GithubCommitAuthor;
  comment_count: number;
}

interface GithubFile {
  filename: string;
  status: string;
  patch?: string;
}

interface GithubCommitDetails {
  sha: string;
  html_url: string;
  commit: GithubCommit;
  author: GithubUser | null;
  files: GithubFile[];
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

interface SimplifiedIssue {
  html_url: string;
  number: number;
  title: string;
  body: string | null;
  labels: GithubLabel[];
  comments: number;
  state_reason: string | null;
}

interface SimplifiedCommit {
  sha: string;
  url: string;
  message: string;
  files_changed: Array<{ filename: string; status: string }> | null;
  comment_count: number | null;
  diff_patch: string | null;
}

interface RepositoryWork {
  repository_url: string;
  issues: SimplifiedIssue[];
  commits: SimplifiedCommit[];
}

interface Contributor {
  id: number | null;
  username: string;
  url: string;
  avatar_url: string;
  works: RepositoryWork[];
}

interface OutputData {
  contributors: Contributor[];
  metadata: {
    processed_repos: string[];
    processing_time_seconds: string;
    commit_detail_limit_per_repo: number | null;
    issue_detail_limit_per_repo: number | null;
  };
}

// --- Configuration ---
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_API_VERSION = "2022-11-28";
const API_BASE_URL = "https://api.github.com";
const COMMIT_MESSAGE_MAX_LEN = 200;
const MAX_COMMITS_TO_DETAIL_PER_REPO: number | null = 500;
const MAX_ISSUES_TO_DETAIL_PER_REPO: number | null = 500;

// --- Helper Functions ---

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
          await sleep(300);
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
    await sleep(500);
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
    await sleep(500);
    return response.data as GithubCommitDetails;
  }
  return null;
}

// --- Main Processing Function ---

/**
 * Processes multiple repositories and fetches contributor data.
 */
async function processRepositories(
  repoUrls: string[],
  token: string | null = null,
): Promise<Record<string, Contributor>> {
  const allContributorsMap: Record<string, Contributor> = {};

  for (const repoUrl of repoUrls) {
    console.log(`\n🔍 Processing: ${repoUrl}`);
    const parsedInfo = parseGithubUrl(repoUrl);
    if (!parsedInfo) continue;

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

    // Step 2: Fetch and Process Closed Issues
    const repoClosedIssuesList = await fetchRepositoryIssuesList(
      owner,
      repo,
      token,
      "closed",
    );
    const issuesAssignedToUserInRepo: Record<string, SimplifiedIssue[]> = {};
    const assigneeDetailsCache: Record<
      string,
      { id: number | null; url: string; avatar_url: string }
    > = {};
    let issuesDetailedCount = 0;

    if (repoClosedIssuesList) {
      const limitStr =
        MAX_ISSUES_TO_DETAIL_PER_REPO !== null
          ? `${MAX_ISSUES_TO_DETAIL_PER_REPO}`
          : "all";
      console.log(
        `📋 Processing ${repoClosedIssuesList.length} issues (limit: ${limitStr})`,
      );

      for (const issueSummaryData of repoClosedIssuesList) {
        if ("pull_request" in issueSummaryData) continue;
        if (issueSummaryData.state !== "closed") continue;

        const issueNumber = issueSummaryData.number;
        if (!issueNumber) {
          console.log(`⚠️  Skipping issue without number`);
          continue;
        }

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

        console.log(
          `📋 [${issuesDetailedCount + 1}/${limitStr}] Issue #${issueNumber}`,
        );
        const detailedIssueData = await fetchIssueDetails(
          owner,
          repo,
          issueNumber,
          token,
        );

        if (detailedIssueData) {
          issuesDetailedCount++;

          // Create simplified issue object
          const simplifiedIssueData: SimplifiedIssue = {
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
              const isDuplicate = issuesAssignedToUserInRepo[
                assigneeUsername
              ].some((i) => i.number === issueDataToStore.number);
              if (!isDuplicate) {
                issuesAssignedToUserInRepo[assigneeUsername].push(
                  issueDataToStore,
                );
              }

              assigneeDetailsCache[assigneeUsername] ??= {
                id: assignee.id,
                url: assignee.html_url,
                avatar_url: assignee.avatar_url,
              };
            }
          }
        } else {
          console.log(`❌ Failed to fetch issue #${issueNumber}`);
        }
      }
    } else {
      console.log(`📭 No closed issues found`);
    }

    // Step 3: Fetch and Process Commits (IMPROVED VERSION)
    const repoCommitsList = await fetchRepositoryCommits(owner, repo, token);
    const commitsAuthoredByUserInRepo: Record<string, SimplifiedCommit[]> = {};
    const authorDetailsCache: Record<
      string,
      {
        id: number | null;
        url: string;
        avatar_url: string;
        is_github_user: boolean;
      }
    > = {};
    let commitsDetailedCount = 0;

    if (repoCommitsList) {
      const limitStrCommits =
        MAX_COMMITS_TO_DETAIL_PER_REPO !== null
          ? `${MAX_COMMITS_TO_DETAIL_PER_REPO}`
          : "all";
      console.log(
        `💾 Processing ${repoCommitsList.length} commits (limit: ${limitStrCommits})`,
      );

      for (const commitSummaryData of repoCommitsList) {
        const commitSha = commitSummaryData.sha;
        if (!commitSha) continue;

        // *** IMPROVED: Try to get GitHub user first, fallback to git commit author ***
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
          // This is a linked GitHub user
          authorUsername = commitAuthorInfo.login;
          authorId = commitAuthorInfo.id;
          authorUrl = commitAuthorInfo.html_url;
          authorAvatarUrl = commitAuthorInfo.avatar_url;
          isGitHubUser = true;
        } else if (commitSummaryData.commit?.author?.name) {
          // Use git commit author name as username (not linked to GitHub)
          // Create a synthetic username from the name
          const gitAuthorName = commitSummaryData.commit.author.name;
          // const gitAuthorEmail = commitSummaryData.commit.author.email;
          // Use name as identifier, sanitize it for use as username
          authorUsername = gitAuthorName.replace(/\s+/g, "-").toLowerCase();
          authorId = null; // No GitHub ID available
          authorUrl = null; // No profile URL
          authorAvatarUrl = null; // No avatar
          isGitHubUser = false;

          console.log(
            `👤 Commit ${commitSha.slice(0, 7)} by ${gitAuthorName} (not linked to GitHub)`,
          );
        } else {
          // No author information at all, skip
          continue;
        }

        if (!authorUsername) continue;

        const commitMessage =
          commitSummaryData.commit?.message ?? "No commit message";
        let commitMessageSummary = commitMessage.split("\n")[0] ?? "";
        if (commitMessageSummary.length > COMMIT_MESSAGE_MAX_LEN) {
          commitMessageSummary =
            commitMessageSummary.slice(0, COMMIT_MESSAGE_MAX_LEN - 3) + "...";
        }

        const simplifiedCommit: SimplifiedCommit = {
          sha: commitSha,
          url: commitSummaryData.html_url,
          message: commitMessageSummary,
          files_changed: null,
          comment_count: null,
          diff_patch: null,
        };

        if (!simplifiedCommit.url) continue;

        const shouldFetchDetails =
          MAX_COMMITS_TO_DETAIL_PER_REPO === null ||
          commitsDetailedCount < MAX_COMMITS_TO_DETAIL_PER_REPO;
        let detailedCommitData: GithubCommitDetails | null = null;

        if (shouldFetchDetails) {
          console.log(
            `💾 [${commitsDetailedCount + 1}/${limitStrCommits}] Commit ${commitSha.slice(0, 7)} by ${authorUsername}`,
          );
          detailedCommitData = await fetchCommitDetails(
            owner,
            repo,
            commitSha,
            token,
          );
          if (detailedCommitData) {
            commitsDetailedCount++;
          } else {
            console.log(`❌ Failed to fetch commit ${commitSha.slice(0, 7)}`);
          }
        }

        if (detailedCommitData) {
          const files = detailedCommitData.files ?? [];
          const commentCount = detailedCommitData.commit?.comment_count ?? 0;

          simplifiedCommit.comment_count = commentCount;
          simplifiedCommit.files_changed = files
            .map((f) => ({
              filename: f.filename,
              status: f.status,
            }))
            .filter((f) => f.filename);

          let combinedPatch = "";
          for (const f of files) {
            if (f?.patch && typeof f.patch === "string" && f.patch) {
              combinedPatch += `--- File: ${f.filename ?? "Unknown"} ---\n`;
              combinedPatch += f.patch;
              combinedPatch += "\n\n";
            }
          }
          simplifiedCommit.diff_patch = combinedPatch.trim() || null;
        }

        commitsAuthoredByUserInRepo[authorUsername] ??= [];

        const isDuplicate = commitsAuthoredByUserInRepo[authorUsername]!.some(
          (c) => c.sha === simplifiedCommit.sha,
        );
        if (!isDuplicate) {
          commitsAuthoredByUserInRepo[authorUsername]!.push(simplifiedCommit);
        }

        // *** IMPROVED: Store author details with all available information ***
        authorDetailsCache[authorUsername] ??= {
          id: authorId,
          url: authorUrl ?? "",
          avatar_url: authorAvatarUrl ?? "",
          is_github_user: isGitHubUser,
        };
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
  }

  return allContributorsMap;
}

// --- Utility Functions ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main Execution ---

async function main(): Promise<void> {
  const repositoryUrls: string[] = [
    // "https://github.com/meta-llama/llama-models",
    // "https://github.com/meta-llama/codellama"
    // "https://github.com/shashi-ntx/demo-repository-1",
    "https://github.com/jerome-marshall/jerome-marshall.github.io",
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

  const outputData: OutputData = {
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
  parseGithubUrl,
  makeGithubRequest,
  fetchPaginatedData,
  fetchContributorsFromRepo,
  fetchRepositoryIssuesList,
  fetchIssueDetails,
  fetchRepositoryCommits,
  fetchCommitDetails,
  processRepositories,
};
