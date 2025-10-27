import { summarizationModel } from "@/ai/models";
import { SUMMARIZE_COMMIT_PROMPT, SUMMARIZE_ISSUE_PROMPT } from "@/ai/prompts";
import { db } from "@/server/db";
import { commits, issues } from "@/server/db/schema";
import { generateText } from "ai";
import { config } from "dotenv";
import { eq, isNull } from "drizzle-orm";

config();

const summarizeCommits = async () => {
  const commitsToSummarize = await db
    .select()
    .from(commits)
    .where(isNull(commits.summary));
  console.log(`Found ${commitsToSummarize.length} commits without summaries.`);

  let idx = 0;
  for (const commit of commitsToSummarize) {
    idx++;
    console.log(
      `(${idx}/${commitsToSummarize.length}) Summarizing commit ID ${commit.id}...`,
    );
    try {
      const commitSummary = await generateText({
        model: summarizationModel,
        system: SUMMARIZE_COMMIT_PROMPT,
        prompt: `
<repository_info>
This codebase uses Remeda, a "data-first" and "data-last" utility library designed for TypeScript.

Key features:
- First-class TypeScript support with specific types
- Supports both data-first (\`R.filter(array, fn)\`) and data-last (\`R.filter(fn)(array)\`) approaches
- Lazy evaluation with \`pipe\` and \`piped\`
- Tree-shakable, supports CJS and ESM
- Common pattern: \`R.pipe(data, R.operation1(), R.operation2())\`

When analyzing commits that reference Remeda functions or patterns, recognize these as utility operations for data transformation, array manipulation, and functional programming patterns.
</repository_info>
<commit_data>${JSON.stringify(commit.rawData)}</commit_data>
`,
      });

      await db
        .update(commits)
        .set({ summary: commitSummary.text })
        .where(eq(commits.id, commit.id));
      console.log(
        `✅ Commit ID ${commit.id} summarized and updated successfully.`,
      );
    } catch (err) {
      console.error(
        `❌ Error summarizing commit ID ${commit.id}:`,
        (err as Error).message,
      );
    }
  }
  console.log(`Done summarizing all ${commitsToSummarize.length} commits.`);
};

const summarizeIssues = async () => {
  const issuesToSummarize = await db
    .select()
    .from(issues)
    .where(isNull(issues.summary));
  console.log(`Found ${issuesToSummarize.length} issues without summaries.`);

  let idx = 0;
  for (const issue of issuesToSummarize) {
    idx++;
    console.log(
      `(${idx}/${issuesToSummarize.length}) Summarizing issue ID ${issue.id}...`,
    );
    try {
      const issueSummary = await generateText({
        model: summarizationModel,
        system: SUMMARIZE_ISSUE_PROMPT,
        prompt: `
<repository_info>
This codebase uses Remeda, a "data-first" and "data-last" utility library designed for TypeScript.

Key features:
- First-class TypeScript support with specific types
- Supports both data-first (\`R.filter(array, fn)\`) and data-last (\`R.filter(fn)(array)\`) approaches
- Lazy evaluation with \`pipe\` and \`piped\`
- Tree-shakable, supports CJS and ESM
- Common pattern: \`R.pipe(data, R.operation1(), R.operation2())\`

When analyzing commits that reference Remeda functions or patterns, recognize these as utility operations for data transformation, array manipulation, and functional programming patterns.
</repository_info>
<issue_data>${JSON.stringify(issue.rawData)}</issue_data>
`,
      });

      await db
        .update(issues)
        .set({ summary: issueSummary.text })
        .where(eq(issues.id, issue.id));
      console.log(
        `✅ Issue ID ${issue.id} summarized and updated successfully.`,
      );
    } catch (err) {
      console.error(
        `❌ Error summarizing issue ID ${issue.id}:`,
        (err as Error).message,
      );
    }
  }
  console.log(`Done summarizing all ${issuesToSummarize.length} issues.`);
};

const main = async () => {
  await summarizeCommits();

  // await summarizeIssues();

  process.exit(1);
};

void main();
