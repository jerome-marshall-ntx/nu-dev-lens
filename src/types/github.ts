// Common type definitions for GitHub API data structures
// --- GitHub API Response Types ---

export interface GithubUser {
  id: number;
  login: string;
  html_url: string;
  avatar_url: string;
  type: string;
}

export interface GithubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GithubCommit {
  message: string;
  author: GithubCommitAuthor;
  comment_count: number;
}

export interface GithubFile {
  filename: string;
  status: string;
  patch?: string;
}

export interface GithubCommitDetails {
  sha: string;
  html_url: string;
  commit: GithubCommit;
  author: GithubUser | null;
  files: GithubFile[];
}

export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: GithubUser;
}

// --- Simplified/Stored Data Types ---
// These are the structures we store in the database

/**
 * Simplified commit data stored in database
 * Contains commit message, file changes, and diff patches for AI summarization
 */
export interface StoredCommitData {
  sha: string;
  url: string;
  message: string;
  authored_date: string; // ISO date string from GitHub
  files_changed: Array<{ filename: string; status: string }> | null;
  comment_count: number | null;
  diff_patch: string | null;
}

/**
 * Repository metadata stored in database
 * Contains basic repository information from GitHub API
 */
export interface StoredRepositoryData {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
}

// --- Data Ingestion Types ---
// These types are used during the data ingestion phase

export interface RepositoryWork {
  repository_url: string;
  commits: StoredCommitData[];
}

export interface ContributorIngestionData {
  id: number | null;
  username: string;
  url: string;
  avatar_url: string;
  works: RepositoryWork[];
}

export interface IngestionOutputData {
  contributors: ContributorIngestionData[];
  metadata: {
    processed_repos: string[];
    processing_time_seconds: string;
    commit_detail_limit_per_repo: number | null;
  };
}
