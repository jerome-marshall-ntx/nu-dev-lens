import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import {
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";

export interface ContributorSearchResult {
  type: "contributor";
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string;
  url: string;
  commitCount: number;
  repositoryCount: number;
}

export interface RepositorySearchResult {
  type: "repository";
  id: number;
  name: string;
  description: string | null;
  url: string;
  contributorCount: number;
  commitCount: number;
}

export type SearchResult = ContributorSearchResult | RepositorySearchResult;

/**
 * Search contributors by username or summary.
 * Returns contributors matching the query with their stats.
 */
export async function searchContributors(
  query: string,
  limit: number = 10
): Promise<ContributorSearchResult[]> {
  const searchPattern = `%${query}%`;

  // Search contributors
  const matchingContributors = await db
    .select({
      id: contributors.id,
      username: contributors.username,
      summary: contributors.summary,
      avatarUrl: contributors.avatarUrl,
      url: contributors.url,
    })
    .from(contributors)
    .where(
      or(
        ilike(contributors.username, searchPattern),
        ilike(contributors.summary, searchPattern)
      )
    )
    .limit(limit);

  if (matchingContributors.length === 0) {
    return [];
  }

  // Get stats for matching contributors
  const contributorIds = matchingContributors.map((c) => c.id);

  // Get repository counts
  const repoCounts = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      count: countDistinct(repositoryWorks.repositoryId),
    })
    .from(repositoryWorks)
    .where(
      sql`${repositoryWorks.contributorId} IN (${sql.join(
        contributorIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(repositoryWorks.contributorId);

  // Get commit counts
  const commitCounts = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      count: count(commits.id),
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(
      sql`${repositoryWorks.contributorId} IN (${sql.join(
        contributorIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(repositoryWorks.contributorId);

  // Create lookup maps
  const repoCountMap = new Map(repoCounts.map((r) => [r.contributorId, Number(r.count)]));
  const commitCountMap = new Map(commitCounts.map((c) => [c.contributorId, Number(c.count)]));

  // Build results
  const results: ContributorSearchResult[] = matchingContributors.map((c) => ({
    type: "contributor" as const,
    id: c.id,
    name: c.username,
    description: c.summary,
    avatarUrl: c.avatarUrl,
    url: c.url,
    commitCount: commitCountMap.get(c.id) ?? 0,
    repositoryCount: repoCountMap.get(c.id) ?? 0,
  }));

  // Sort by commit count
  results.sort((a, b) => b.commitCount - a.commitCount);

  return results;
}

/**
 * Search repositories by name or description.
 * Returns repositories matching the query with their stats.
 */
export async function searchRepositories(
  query: string,
  limit: number = 10
): Promise<RepositorySearchResult[]> {
  const searchPattern = `%${query}%`;

  // Search repositories
  const matchingRepos = await db
    .select({
      id: repositories.id,
      name: repositories.name,
      description: repositories.description,
      url: repositories.url,
    })
    .from(repositories)
    .where(
      or(
        ilike(repositories.name, searchPattern),
        ilike(repositories.description, searchPattern)
      )
    )
    .limit(limit);

  if (matchingRepos.length === 0) {
    return [];
  }

  // Get stats for matching repositories
  const repoIds = matchingRepos.map((r) => r.id);

  // Get contributor counts
  const contributorCounts = await db
    .select({
      repositoryId: repositoryWorks.repositoryId,
      count: countDistinct(repositoryWorks.contributorId),
    })
    .from(repositoryWorks)
    .where(
      sql`${repositoryWorks.repositoryId} IN (${sql.join(
        repoIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(repositoryWorks.repositoryId);

  // Get commit counts
  const commitCounts = await db
    .select({
      repositoryId: repositoryWorks.repositoryId,
      count: count(commits.id),
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .where(
      sql`${repositoryWorks.repositoryId} IN (${sql.join(
        repoIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(repositoryWorks.repositoryId);

  // Create lookup maps
  const contributorCountMap = new Map(
    contributorCounts.map((c) => [c.repositoryId, Number(c.count)])
  );
  const commitCountMap = new Map(
    commitCounts.map((c) => [c.repositoryId, Number(c.count)])
  );

  // Build results
  const results: RepositorySearchResult[] = matchingRepos.map((r) => ({
    type: "repository" as const,
    id: r.id,
    name: r.name,
    description: r.description,
    url: r.url,
    contributorCount: contributorCountMap.get(r.id) ?? 0,
    commitCount: commitCountMap.get(r.id) ?? 0,
  }));

  // Sort by commit count
  results.sort((a, b) => b.commitCount - a.commitCount);

  return results;
}

/**
 * Combined search across contributors and repositories.
 */
export async function search(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const [contributorResults, repositoryResults] = await Promise.all([
    searchContributors(query, limit),
    searchRepositories(query, limit),
  ]);

  return [...contributorResults, ...repositoryResults];
}
