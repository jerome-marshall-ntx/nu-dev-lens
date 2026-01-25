import { searchContributorsByQuery } from "@/use-cases/contributor";
import { tool } from "ai";
import z from "zod";

export const searchContributorsTool = tool({
  description:
    "Search for contributors by their area of expertise or technical domain. ",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Rewrite the user's question to be more specific and clear.",
      ),
  }),
  execute: async ({ query }) => {
    const results = await searchContributorsByQuery(query, 10, 0.3);
    return results;
  },
});
