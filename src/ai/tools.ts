import { searchContributorsByQuery } from "@/use-cases/contributor";
import { tool } from "ai";
import z from "zod";

export const searchContributorsTool = tool({
  description: "Search for contributors by expertise",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    const results = await searchContributorsByQuery(query, 10, 0.3);
    return results;
  },
})