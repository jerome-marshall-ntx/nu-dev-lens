import { db } from "@/server/db";
import {
  commits,
  contributors,
  repositories,
  repositoryWorks,
} from "@/server/db/schema";
import { count, countDistinct, desc, eq, sql } from "drizzle-orm";

export async function getDashboardStats() {
  const [repoResult, contributorResult, commitResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(repositories),
    db.select({ count: sql<number>`count(*)::int` }).from(contributors),
    db.select({ count: sql<number>`count(*)::int` }).from(commits),
  ]);

  return {
    repositoryCount: repoResult[0]?.count ?? 0,
    contributorCount: contributorResult[0]?.count ?? 0,
    commitCount: commitResult[0]?.count ?? 0,
  };
}

/**
 * Get top contributors by commit count.
 * Used for the dashboard's top contributors section.
 */
export async function getTopContributors(limit: number = 5) {
  // Get commit counts per contributor
  const contributorCommits = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      commitCount: count(commits.id),
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .groupBy(repositoryWorks.contributorId)
    .orderBy(desc(count(commits.id)))
    .limit(limit);

  if (contributorCommits.length === 0) {
    return [];
  }

  // Get contributor details
  const contributorIds = contributorCommits.map((c) => c.contributorId);
  const contributorDetails = await db
    .select({
      id: contributors.id,
      username: contributors.username,
      avatarUrl: contributors.avatarUrl,
      summary: contributors.summary,
      url: contributors.url,
    })
    .from(contributors)
    .where(
      sql`${contributors.id} IN (${sql.join(
        contributorIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  // Get repository counts
  const repoCounts = await db
    .select({
      contributorId: repositoryWorks.contributorId,
      repoCount: countDistinct(repositoryWorks.repositoryId),
    })
    .from(repositoryWorks)
    .where(
      sql`${repositoryWorks.contributorId} IN (${sql.join(
        contributorIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(repositoryWorks.contributorId);

  // Create lookup maps
  const detailsMap = new Map(contributorDetails.map((c) => [c.id, c]));
  const repoCountMap = new Map(repoCounts.map((r) => [r.contributorId, Number(r.repoCount)]));
  const commitCountMap = new Map(
    contributorCommits.map((c) => [c.contributorId, Number(c.commitCount)])
  );

  // Build results in order of commit count
  const results = contributorCommits
    .map((c) => {
      const details = detailsMap.get(c.contributorId);
      if (!details) return null;
      return {
        id: details.id,
        username: details.username,
        avatarUrl: details.avatarUrl,
        summary: details.summary,
        url: details.url,
        commitCount: commitCountMap.get(c.contributorId) ?? 0,
        repositoryCount: repoCountMap.get(c.contributorId) ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return results;
}

export type TopContributor = NonNullable<
  Awaited<ReturnType<typeof getTopContributors>>[number]
>;

/**
 * Get recent commits for the activity feed.
 * Returns commits with contributor and repository info.
 */
export async function getRecentActivity(limit: number = 10) {
  const recentCommits = await db
    .select({
      id: commits.id,
      url: commits.url,
      summary: commits.summary,
      rawData: commits.rawData,
      createdAt: commits.createdAt,
      contributorId: contributors.id,
      contributorUsername: contributors.username,
      contributorAvatarUrl: contributors.avatarUrl,
      repositoryId: repositories.id,
      repositoryName: repositories.name,
    })
    .from(commits)
    .innerJoin(repositoryWorks, eq(commits.repositoryWorkId, repositoryWorks.id))
    .innerJoin(contributors, eq(repositoryWorks.contributorId, contributors.id))
    .innerJoin(repositories, eq(repositoryWorks.repositoryId, repositories.id))
    .orderBy(desc(commits.createdAt))
    .limit(limit);

  return recentCommits.map((commit) => ({
    id: commit.id,
    url: commit.url,
    summary: commit.summary,
    message: commit.rawData?.message ?? null,
    createdAt: commit.createdAt,
    contributor: {
      id: commit.contributorId,
      username: commit.contributorUsername,
      avatarUrl: commit.contributorAvatarUrl,
    },
    repository: {
      id: commit.repositoryId,
      name: commit.repositoryName,
    },
  }));
}

export type RecentActivity = Awaited<ReturnType<typeof getRecentActivity>>[number];
