import { searchContributorsByQuery } from "@/use-cases/contributor";
import { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import { tool } from "ai";
import z from "zod";

export const searchContributorsTool = tool({
  description: `Search for contributors using semantic similarity matching against their profile summaries. For best results, rewrite the user's query to be detailed and descriptive.
`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        `A rewritten, detailed search query optimized for semantic matching.`,
      ),
  }),
  execute: async ({ query }) => {
    console.log("🚀 ~ searchContributorsTool ~ query:", query)
    const results = await searchContributorsByQuery(query, 10, 0.4);
    console.log("🚀 ~ found results:", results.length)
    return results;
  },
});

export const searchRepositoryWorksTool = tool({
  description: `Search for repository works using semantic similarity matching against their summaries. Repository works represent what a contributor did in a specific repository. For best results, rewrite the user's query to be detailed and descriptive.
`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        `A rewritten, detailed search query optimized for semantic matching.`,
      ),
  }),
  execute: async ({ query }) => {
    console.log("🚀 ~ searchRepositoryWorksTool ~ query:", query)
    const results = await searchRepositoryWorksByQuery(query, 10, 0.4);
    console.log("🚀 ~ found results:", results.length)
    return results;
  },
});
