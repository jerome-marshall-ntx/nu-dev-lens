// Database schema for nu-dev-lens
// Based on the three-phase system: Data Ingestion → AI Summarization → API Serving

import type { StoredCommitData, StoredRepositoryData } from "@/types/github";
import { relations, sql } from "drizzle-orm";
import { index, jsonb, pgTableCreator, vector } from "drizzle-orm/pg-core";

/**
 * Multi-project schema feature of Drizzle ORM
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `${name}`);

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Repository - A GitHub repository
 * Summary: "What is this repo about?" (Level 3)
 */
export const repositories = createTable(
  "repository",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 255 }).notNull(),
    description: d.text(),
    avatarUrl: d.varchar({ length: 500 }).notNull(),
    url: d.varchar({ length: 500 }).notNull(),
    summary: d.text(), // Initially empty, populated by AI processing
    embedding: vector('embedding', { dimensions: 1536 }),
    rawData: jsonb().$type<StoredRepositoryData>(), // Structured GitHub API response
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("repository_name_idx").on(t.name),
    index("repository_url_idx").on(t.url),
  ],
);

/**
 * Contributor - A GitHub user
 * Summary: "Who is this person as an engineer?" (Level 3)
 */
export const contributors = createTable(
  "contributor",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    username: d.varchar({ length: 255 }).notNull().unique(),
    url: d.varchar({ length: 500 }).notNull(), // URLField
    avatarUrl: d.varchar({ length: 500 }).notNull(), // URLField
    summary: d.text(), // Initially empty, populated by AI processing
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("contributor_username_idx").on(t.username),
    index("contributor_url_idx").on(t.url),
  ],
);

/**
 * RepositoryWork - The join table with business logic
 * Summary: "What did this person do in THIS repo?" (Level 2)
 * This is the critical relationship that allows the same contributor
 * to have different summaries in different repos
 */
export const repositoryWorks = createTable(
  "repository_work",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    repositoryId: d
      .integer()
      .notNull()
      .references(() => repositories.id, {
        onDelete: "cascade",
      }),
    contributorId: d
      .integer()
      .notNull()
      .references(() => contributors.id, {
        onDelete: "cascade",
      }),
    summary: d.text(), // Initially empty, populated by AI processing
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("repository_work_repo_idx").on(t.repositoryId),
    index("repository_work_contributor_idx").on(t.contributorId),
    index("repository_work_composite_idx").on(t.repositoryId, t.contributorId),
  ],
);

/**
 * Commit - A code commit by the contributor
 * Summary: "What technical change did this commit make?" (Level 1)
 */
export const commits = createTable(
  "commit",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    repositoryWorkId: d
      .integer()
      .notNull()
      .references(() => repositoryWorks.id, {
        onDelete: "cascade",
      }),
    url: d.varchar({ length: 500 }).notNull(),
    rawData: jsonb().$type<StoredCommitData>().notNull(), // Typed commit data with diffs
    summary: d.text(), // Initially empty, populated by AI processing
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("commit_repository_work_idx").on(t.repositoryWorkId),
    index("commit_url_idx").on(t.url),
  ],
);

// ============================================================================
// RELATIONS - For type-safe queries and joins
// ============================================================================

export const repositoriesRelations = relations(repositories, ({ many }) => ({
  repositoryWorks: many(repositoryWorks),
}));

export const contributorsRelations = relations(contributors, ({ many }) => ({
  repositoryWorks: many(repositoryWorks),
}));

export const repositoryWorksRelations = relations(
  repositoryWorks,
  ({ one, many }) => ({
    repository: one(repositories, {
      fields: [repositoryWorks.repositoryId],
      references: [repositories.id],
    }),
    contributor: one(contributors, {
      fields: [repositoryWorks.contributorId],
      references: [contributors.id],
    }),
    commits: many(commits),
  }),
);

export const commitsRelations = relations(commits, ({ one }) => ({
  repositoryWork: one(repositoryWorks, {
    fields: [commits.repositoryWorkId],
    references: [repositoryWorks.id],
  }),
}));

// ============================================================================
// TYPESCRIPT TYPES - Inferred from schema for type safety
// ============================================================================

export type InsertRepository = typeof repositories.$inferInsert;
export type SelectRepository = typeof repositories.$inferSelect;

export type InsertContributor = typeof contributors.$inferInsert;
export type SelectContributor = typeof contributors.$inferSelect;

export type InsertRepositoryWork = typeof repositoryWorks.$inferInsert;
export type SelectRepositoryWork = typeof repositoryWorks.$inferSelect;

export type InsertCommit = typeof commits.$inferInsert;
export type SelectCommit = typeof commits.$inferSelect;
