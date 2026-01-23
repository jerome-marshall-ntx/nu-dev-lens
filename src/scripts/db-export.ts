/**
 * Database Export Script
 *
 * Creates a pg_dump of the entire database for sharing with other developers.
 * The dump file includes all data, embeddings, and summaries.
 *
 * Usage: pnpm db:export
 * Output: ./db-dump.sql (in project root)
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// Database connection details (matching docker-compose.yml)
const DB_CONFIG = {
  host: "localhost",
  port: "5433",
  user: "postgres",
  password: "password",
  database: "nu_dev_lens",
};

const DUMP_DIR = path.join(process.cwd(), "db-dumps");
const DUMP_FILE = path.join(DUMP_DIR, "db-dump.sql");

async function exportDatabase() {
  console.log("📦 Starting database export...\n");

  // Create dumps directory if it doesn't exist
  if (!existsSync(DUMP_DIR)) {
    mkdirSync(DUMP_DIR, { recursive: true });
    console.log(`📁 Created directory: ${DUMP_DIR}`);
  }

  // Build the pg_dump command
  // Using the Docker container to run pg_dump ensures version compatibility
  const command = `docker exec nu-dev-lens-db pg_dump -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --clean --if-exists`;

  try {
    console.log("🔄 Running pg_dump via Docker container...");

    // Execute pg_dump and save to file
    execSync(`${command} > "${DUMP_FILE}"`, {
      stdio: ["pipe", "pipe", "inherit"],
      env: {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password,
      },
    });

    console.log(`\n✅ Database exported successfully!`);
    console.log(`📄 Dump file: ${DUMP_FILE}`);
    console.log(`\n📝 To share with another developer:`);
    console.log(`   1. Send them the db-dumps/db-dump.sql file`);
    console.log(`   2. They run: pnpm db:import`);
  } catch (error) {
    console.error("\n❌ Export failed!");
    console.error(
      "   Make sure the Docker container is running: docker compose up -d",
    );
    throw error;
  }
}

exportDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
