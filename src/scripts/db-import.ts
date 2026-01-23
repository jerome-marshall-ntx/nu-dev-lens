/**
 * Database Import Script
 *
 * Restores a database from a pg_dump file.
 * This will replace all existing data in the database.
 *
 * Usage: pnpm db:import
 * Input: ./db-dumps/db-dump.sql (in project root)
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
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

async function importDatabase() {
  console.log("📥 Starting database import...\n");

  // Check if dump file exists
  if (!existsSync(DUMP_FILE)) {
    console.error(`❌ Dump file not found: ${DUMP_FILE}`);
    console.error(`\n📝 To import a database:`);
    console.error(`   1. Get the db-dump.sql file from another developer`);
    console.error(`   2. Place it in: ${DUMP_DIR}/`);
    console.error(`   3. Run this command again: pnpm db:import`);
    process.exit(1);
  }

  // Build the psql command
  // Using the Docker container to run psql ensures version compatibility
  const command = `docker exec -i nu-dev-lens-db psql -U ${DB_CONFIG.user} -d ${DB_CONFIG.database}`;

  try {
    console.log("🔄 Restoring database via Docker container...");
    console.log(`📄 Using dump file: ${DUMP_FILE}\n`);

    // Execute psql to restore from file
    execSync(`${command} < "${DUMP_FILE}"`, {
      stdio: ["pipe", "pipe", "inherit"],
      env: {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password,
      },
    });

    console.log(`\n✅ Database imported successfully!`);
    console.log(`\n📝 Your database now contains all the shared data.`);
    console.log(`   You can view it with: pnpm db:studio`);
  } catch (error) {
    console.error("\n❌ Import failed!");
    console.error(
      "   Make sure the Docker container is running: docker compose up -d",
    );
    throw error;
  }
}

importDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
