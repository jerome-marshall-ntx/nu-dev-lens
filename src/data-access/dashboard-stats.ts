import { db } from "@/server/db";
import { commits, contributors, repositories } from "@/server/db/schema";
import { sql } from "drizzle-orm";

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
